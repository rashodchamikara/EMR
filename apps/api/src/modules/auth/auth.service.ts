import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SecurityEventType,
  UserStatus,
  OrganizationStatus,
} from '../../generated/prisma/client';
import { buildAuthenticatedUser } from './auth-profile.helper';
import { AuthRepository } from './auth.repository';
import { AuthenticatedUser, RequestMetadata } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

export interface AuthenticationResult {
  accessToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.repository.findByEmail(normalizedEmail);

    const passwordIsValid = await this.passwordService.verify(
      user?.passwordHash ?? null,
      dto.password,
    );

    if (!user || !passwordIsValid) {
      if (user) {
        await this.repository.recordFailedLogin(
          user.id,
          this.config.getOrThrow<number>('auth.loginMaxAttempts'),
          this.config.getOrThrow<number>('auth.loginLockMinutes'),
          metadata,
        );
      } else {
        await this.repository.recordUnknownUserFailure(metadata);
      }

      throw this.invalidCredentials();
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw this.invalidCredentials();
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw this.invalidCredentials();
    }

    await this.repository.recordSuccessfulLogin(user.id, metadata);

    /*
     * Select the user's primary organization.
     * If there is no primary membership, use the first active membership.
     * System administrators may have no organization membership.
     */
    const primaryMembership =
      user.memberships.find((membership) => membership.isPrimary) ??
      user.memberships[0] ??
      null;

    const selectedOrganization = primaryMembership
      ? {
          id: primaryMembership.organization.id,
          name: primaryMembership.organization.name,
          status: primaryMembership.organization.status,
        }
      : null;

    const sessionExpiresAt = this.getSessionExpiry();

    const refreshToken = this.tokenService.createRefreshToken();

    /*
     * Correct argument order:
     * 1. userId
     * 2. activeOrganizationId
     * 3. sessionExpiresAt
     * 4. refreshToken
     * 5. metadata
     */
    const sessionId = await this.repository.createSession(
      user.id,
      selectedOrganization?.id ?? null,
      sessionExpiresAt,
      {
        id: refreshToken.id,
        tokenHash: refreshToken.tokenHash,
        expiresAt: sessionExpiresAt,
      },
      metadata,
    );

    const authenticatedUser = buildAuthenticatedUser(
      user,
      sessionId,
      selectedOrganization,
    );

    const accessToken =
      await this.tokenService.createAccessToken(authenticatedUser);

    return {
      accessToken,

      expiresIn: this.config.getOrThrow<number>('auth.accessTokenTtlSeconds'),

      user: authenticatedUser,
      refreshToken: refreshToken.rawToken,
    };
  }

  async refresh(
    rawRefreshToken: string | undefined,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    if (!rawRefreshToken) {
      throw this.invalidSession();
    }

    const parsed = this.tokenService.parseRefreshToken(rawRefreshToken);

    if (!parsed) {
      throw this.invalidSession();
    }

    const storedToken = await this.repository.findRefreshToken(parsed.id);

    if (!storedToken) {
      throw this.invalidSession();
    }

    const session = storedToken.session;

    const tokenMatches = this.tokenService.verifyRefreshSecret(
      parsed.secret,
      storedToken.tokenHash,
    );

    if (!tokenMatches) {
      await this.repository.revokeSession(
        session.id,
        SecurityEventType.TOKEN_REUSE_DETECTED,
        metadata,
      );

      throw this.invalidSession();
    }

    const now = new Date();

    if (
      storedToken.usedAt ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= now ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      await this.repository.revokeSession(
        session.id,
        SecurityEventType.TOKEN_REUSE_DETECTED,
        metadata,
      );

      throw this.invalidSession();
    }

    const user = await this.repository.findById(session.userId);

    if (!user) {
      throw this.invalidSession();
    }

    /*
     * Read the active organization from the database session.
     * This preserves the selected organization during token refresh.
     */
    const currentSession = await this.repository.findSession(session.id);

    if (!currentSession) {
      throw this.invalidSession();
    }

    const selectedOrganization = currentSession.activeOrganization
      ? {
          id: currentSession.activeOrganization.id,
          name: currentSession.activeOrganization.name,
          status: currentSession.activeOrganization.status,
        }
      : null;

    const nextRefreshToken = this.tokenService.createRefreshToken();

    const rotationSucceeded = await this.repository.rotateRefreshToken(
      storedToken.id,
      session.id,
      {
        id: nextRefreshToken.id,
        tokenHash: nextRefreshToken.tokenHash,
        expiresAt: session.expiresAt,
      },
    );

    if (!rotationSucceeded) {
      await this.repository.revokeSession(
        session.id,
        SecurityEventType.TOKEN_REUSE_DETECTED,
        metadata,
      );

      throw this.invalidSession();
    }

    const authenticatedUser = buildAuthenticatedUser(
      user,
      session.id,
      selectedOrganization,
    );

    const accessToken =
      await this.tokenService.createAccessToken(authenticatedUser);

    return {
      accessToken,

      expiresIn: this.config.getOrThrow<number>('auth.accessTokenTtlSeconds'),

      user: authenticatedUser,
      refreshToken: nextRefreshToken.rawToken,
    };
  }

  async logout(
    rawRefreshToken: string | undefined,
    metadata: RequestMetadata,
  ): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const parsed = this.tokenService.parseRefreshToken(rawRefreshToken);

    if (!parsed) {
      return;
    }

    const storedToken = await this.repository.findRefreshToken(parsed.id);

    if (!storedToken) {
      return;
    }

    await this.repository.revokeSession(
      storedToken.sessionId,
      SecurityEventType.LOGOUT,
      metadata,
    );
  }

  private getSessionExpiry(): Date {
    const numberOfDays = this.config.getOrThrow<number>('auth.sessionTtlDays');

    return new Date(Date.now() + numberOfDays * 24 * 60 * 60 * 1000);
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException('Invalid email or password.');
  }

  private invalidSession(): UnauthorizedException {
    return new UnauthorizedException(
      'The login session is invalid or has expired.',
    );
  }

  async findAvailableOrganizations(authenticatedUser: AuthenticatedUser) {
    return this.repository.findAvailableOrganizations(
      authenticatedUser.userId,
      authenticatedUser.roles.includes('SYSTEM_ADMIN'),
    );
  }
  async switchOrganization(
    authenticatedUser: AuthenticatedUser,
    organizationId: string,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    user: AuthenticatedUser;
  }> {
    const user = await this.repository.findById(authenticatedUser.userId);
    if (!user) {
      throw this.invalidSession();
    }
    const organization = await this.repository.findOrganization(organizationId);
    if (!organization || organization.status !== OrganizationStatus.ACTIVE) {
      throw new NotFoundException('Organization not found or inactive.');
    }
    const isSystemAdministrator = user.systemRoles.some(
      (assignment) => assignment.role.code === 'SYSTEM_ADMIN',
    );
    const hasMembership = user.memberships.some(
      (membership) => membership.organizationId === organizationId,
    );
    if (!isSystemAdministrator && !hasMembership) {
      throw new ForbiddenException(
        'You do not have access to this organization.',
      );
    }
    await this.repository.updateActiveOrganization(
      authenticatedUser.sessionId,
      organizationId,
    );
    const updatedUser = buildAuthenticatedUser(
      user,
      authenticatedUser.sessionId,
      organization,
    );
    const accessToken = await this.tokenService.createAccessToken(updatedUser);
    return {
      accessToken,
      expiresIn: this.config.getOrThrow<number>('auth.accessTokenTtlSeconds'),
      user: updatedUser,
    };
  }
}
