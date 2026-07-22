import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityEventType, UserStatus } from '../../generated/prisma/client';
import { AuthRepository } from './auth.repository';
import { AuthenticatedUser, RequestMetadata } from './auth.types';
import { buildAuthenticatedUser } from './auth-profile.helper';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

export interface AuthenticationResult {
  accessToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository:
      AuthRepository,

    private readonly passwordService:
      PasswordService,

    private readonly tokenService:
      TokenService,

    private readonly config:
      ConfigService,
  ) {}

  async login(
    dto: LoginDto,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const normalizedEmail =
      dto.email.trim().toLowerCase();

    const user =
      await this.repository.findByEmail(
        normalizedEmail,
      );

    const passwordIsValid =
      await this.passwordService.verify(
        user?.passwordHash ?? null,
        dto.password,
      );

    if (!user || !passwordIsValid) {
      if (user) {
        await this.repository.recordFailedLogin(
          user.id,

          this.config.getOrThrow<number>(
            'auth.loginMaxAttempts',
          ),

          this.config.getOrThrow<number>(
            'auth.loginLockMinutes',
          ),

          metadata,
        );
      } else {
        await this.repository
          .recordUnknownUserFailure(
            metadata,
          );
      }

      throw this.invalidCredentials();
    }

    if (
      user.status !== UserStatus.ACTIVE
    ) {
      throw this.invalidCredentials();
    }

    if (
      user.lockedUntil &&
      user.lockedUntil > new Date()
    ) {
      throw this.invalidCredentials();
    }

    await this.repository
      .recordSuccessfulLogin(
        user.id,
        metadata,
      );

    const sessionExpiresAt =
      this.getSessionExpiry();

    const refreshToken =
      this.tokenService
        .createRefreshToken();

    const sessionId =
      await this.repository.createSession(
        user.id,
        sessionExpiresAt,

        {
          id: refreshToken.id,

          tokenHash:
            refreshToken.tokenHash,

          expiresAt:
            sessionExpiresAt,
        },

        metadata,
      );

    const authenticatedUser =
      buildAuthenticatedUser(
        user,
        sessionId,
      );

    const accessToken =
      await this.tokenService
        .createAccessToken(
          authenticatedUser,
        );

    return {
      accessToken,

      expiresIn:
        this.config.getOrThrow<number>(
          'auth.accessTokenTtlSeconds',
        ),

      user: authenticatedUser,

      refreshToken:
        refreshToken.rawToken,
    };
  }

  async refresh(
    rawRefreshToken: string | undefined,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    if (!rawRefreshToken) {
      throw this.invalidSession();
    }

    const parsed =
      this.tokenService.parseRefreshToken(
        rawRefreshToken,
      );

    if (!parsed) {
      throw this.invalidSession();
    }

    const storedToken =
      await this.repository
        .findRefreshToken(parsed.id);

    if (!storedToken) {
      throw this.invalidSession();
    }

    const session =
      storedToken.session;

    const tokenMatches =
      this.tokenService
        .verifyRefreshSecret(
          parsed.secret,
          storedToken.tokenHash,
        );

    if (!tokenMatches) {
      await this.repository.revokeSession(
        session.id,

        SecurityEventType
          .TOKEN_REUSE_DETECTED,

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
      session.user.status !==
        UserStatus.ACTIVE
    ) {
      await this.repository.revokeSession(
        session.id,

        SecurityEventType
          .TOKEN_REUSE_DETECTED,

        metadata,
      );

      throw this.invalidSession();
    }

    const user =
      await this.repository.findById(
        session.userId,
      );

    if (!user) {
      throw this.invalidSession();
    }

    const nextRefreshToken =
      this.tokenService
        .createRefreshToken();

    const rotationSucceeded =
      await this.repository
        .rotateRefreshToken(
          storedToken.id,
          session.id,

          {
            id: nextRefreshToken.id,

            tokenHash:
              nextRefreshToken.tokenHash,

            expiresAt:
              session.expiresAt,
          },
        );

    if (!rotationSucceeded) {
      await this.repository.revokeSession(
        session.id,

        SecurityEventType
          .TOKEN_REUSE_DETECTED,

        metadata,
      );

      throw this.invalidSession();
    }

    const authenticatedUser =
      buildAuthenticatedUser(
        user,
        session.id,
      );

    const accessToken =
      await this.tokenService
        .createAccessToken(
          authenticatedUser,
        );

    return {
      accessToken,

      expiresIn:
        this.config.getOrThrow<number>(
          'auth.accessTokenTtlSeconds',
        ),

      user: authenticatedUser,

      refreshToken:
        nextRefreshToken.rawToken,
    };
  }

  async logout(
    rawRefreshToken: string | undefined,
    metadata: RequestMetadata,
  ): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const parsed =
      this.tokenService.parseRefreshToken(
        rawRefreshToken,
      );

    if (!parsed) {
      return;
    }

    const storedToken =
      await this.repository
        .findRefreshToken(parsed.id);

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
    const numberOfDays =
      this.config.getOrThrow<number>(
        'auth.sessionTtlDays',
      );

    return new Date(
      Date.now() +
        numberOfDays *
          24 *
          60 *
          60 *
          1000,
    );
  }

  private invalidCredentials():
    UnauthorizedException {
    return new UnauthorizedException(
      'Invalid email or password.',
    );
  }

  private invalidSession():
    UnauthorizedException {
    return new UnauthorizedException(
      'The login session is invalid or has expired.',
    );
  }
}