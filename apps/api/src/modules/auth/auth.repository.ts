import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  SecurityEventType,
  UserStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RequestMetadata } from './auth.types';
const authenticationUserInclude = {
  systemRoles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
  memberships: {
    where: { status: MembershipStatus.ACTIVE },
    include: {
      organization: true,
      roles: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;
export type AuthenticationUser = Prisma.UserGetPayload<{
  include: typeof authenticationUserInclude;
}>;
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}
  findByEmail(normalizedEmail: string): Promise<AuthenticationUser | null> {
    return this.prisma.user.findUnique({
      where: { emailNormalized: normalizedEmail },
      include: authenticationUserInclude,
    });
  }
  findById(userId: string): Promise<AuthenticationUser | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: authenticationUserInclude,
    });
  }
  async recordFailedLogin(
    userId: string,
    maximumAttempts: number,
    lockMinutes: number,
    metadata: RequestMetadata,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const updatedUser = await transaction.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      const shouldLock = updatedUser.failedLoginAttempts >= maximumAttempts;
      if (shouldLock) {
        await transaction.user.update({
          where: { id: userId },
          data: {
            lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000),
            failedLoginAttempts: 0,
          },
        });
      }
      await transaction.securityEvent.create({
        data: {
          userId,
          eventType: shouldLock
            ? SecurityEventType.ACCOUNT_TEMPORARILY_LOCKED
            : SecurityEventType.LOGIN_FAILURE,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
    });
  }
  async recordUnknownUserFailure(metadata: RequestMetadata): Promise<void> {
    await this.prisma.securityEvent.create({
      data: {
        eventType: SecurityEventType.LOGIN_FAILURE,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
  }
  async recordSuccessfulLogin(
    userId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      }),
      this.prisma.securityEvent.create({
        data: {
          userId,
          eventType: SecurityEventType.LOGIN_SUCCESS,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      }),
    ]);
  }
  async createSession(
    userId: string,
    sessionExpiresAt: Date,
    refreshToken: { id: string; tokenHash: string; expiresAt: Date },
    metadata: RequestMetadata,
  ): Promise<string> {
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        expiresAt: sessionExpiresAt,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        refreshTokens: {
          create: {
            id: refreshToken.id,
            tokenHash: refreshToken.tokenHash,
            expiresAt: refreshToken.expiresAt,
          },
        },
      },
      select: { id: true },
    });
    return session.id;
  }
  findRefreshToken(tokenId: string) {
    return this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { session: { include: { user: true } } },
    });
  }
  async rotateRefreshToken(
    currentTokenId: string,
    sessionId: string,
    newToken: { id: string; tokenHash: string; expiresAt: Date },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const claimedToken = await transaction.refreshToken.updateMany({
        where: {
          id: currentTokenId,
          sessionId,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now, revokedAt: now },
      });
      if (claimedToken.count !== 1) {
        return false;
      }
      await transaction.refreshToken.create({
        data: {
          id: newToken.id,
          sessionId,
          tokenHash: newToken.tokenHash,
          expiresAt: newToken.expiresAt,
        },
      });
      await transaction.userSession.update({
        where: { id: sessionId },
        data: { lastSeenAt: now },
      });
      return true;
    });
  }
  async isActiveSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: UserStatus.ACTIVE },
      },
      select: { id: true },
    });
    return Boolean(session);
  }
  async revokeSession(
    sessionId: string,
    eventType:
      | typeof SecurityEventType.LOGOUT
      | typeof SecurityEventType.SESSION_REVOKED
      | typeof SecurityEventType.TOKEN_REUSE_DETECTED,
    metadata: RequestMetadata,
  ): Promise<void> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    if (!session) {
      return;
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.userSession.update({
        where: { id: sessionId },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.securityEvent.create({
        data: {
          userId: session.userId,
          eventType,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      }),
    ]);
  }
}
