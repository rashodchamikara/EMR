import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { AccessTokenPayload, AuthenticatedUser } from './auth.types';

export interface RefreshTokenMaterial {
  id: string;
  rawToken: string;
  tokenHash: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async createAccessToken(user: AuthenticatedUser): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.userId,
      sid: user.sessionId,
      type: 'access',

      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,

      organizationId: user.organizationId,

      roles: user.roles,
      permissions: user.permissions,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('auth.jwtAccessSecret'),

      issuer: this.config.getOrThrow<string>('auth.jwtIssuer'),

      audience: this.config.getOrThrow<string>('auth.jwtAudience'),

      expiresIn: this.config.getOrThrow<number>('auth.accessTokenTtlSeconds'),

      algorithm: 'HS256',
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.getOrThrow<string>('auth.jwtAccessSecret'),

      issuer: this.config.getOrThrow<string>('auth.jwtIssuer'),

      audience: this.config.getOrThrow<string>('auth.jwtAudience'),

      algorithms: ['HS256'],
    });
  }

  createRefreshToken(): RefreshTokenMaterial {
    const id = randomUUID();

    const secret = randomBytes(48).toString('base64url');

    return {
      id,
      rawToken: `${id}.${secret}`,
      tokenHash: this.hashRefreshSecret(secret),
    };
  }

  verifyRefreshSecret(secret: string, storedHash: string): boolean {
    const calculatedHash = this.hashRefreshSecret(secret);

    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (calculatedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return timingSafeEqual(calculatedBuffer, storedBuffer);
  }

  parseRefreshToken(rawToken: string): {
    id: string;
    secret: string;
  } | null {
    const separatorIndex = rawToken.indexOf('.');

    if (separatorIndex < 1) {
      return null;
    }

    const id = rawToken.slice(0, separatorIndex);

    const secret = rawToken.slice(separatorIndex + 1);

    if (!id || !secret) {
      return null;
    }

    return {
      id,
      secret,
    };
  }

  private hashRefreshSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }
}
