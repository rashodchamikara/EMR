import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithContext } from '../../../common/middleware/request-context.middleware';
import { AuthRepository } from '../auth.repository';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../token.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,

    private readonly tokenService:
      TokenService,

    private readonly repository:
      AuthRepository,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic =
      this.reflector
        .getAllAndOverride<boolean>(
          IS_PUBLIC_KEY,
          [
            context.getHandler(),
            context.getClass(),
          ],
        );

    if (isPublic) {
      return true;
    }

    const request =
      context
        .switchToHttp()
        .getRequest<RequestWithContext>();

    const token =
      this.extractBearerToken(
        request.headers.authorization,
      );

    if (!token) {
      throw new UnauthorizedException(
        'Authentication is required.',
      );
    }

    try {
      const payload =
        await this.tokenService
          .verifyAccessToken(token);

      if (
        payload.type !== 'access' ||
        !payload.sub ||
        !payload.sid
      ) {
        throw new Error(
          'Invalid token payload.',
        );
      }

      const sessionIsActive =
        await this.repository
          .isActiveSession(
            payload.sid,
            payload.sub,
          );

      if (!sessionIsActive) {
        throw new Error(
          'Session is inactive.',
        );
      }

      request.user = {
        userId: payload.sub,
        sessionId: payload.sid,

        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,

        organizationId:
          payload.organizationId,

        roles: payload.roles ?? [],

        permissions:
          payload.permissions ?? [],
      };

      return true;
    } catch {
      throw new UnauthorizedException(
        'Authentication is invalid or has expired.',
      );
    }
  }

  private extractBearerToken(
    authorization:
      | string
      | undefined,
  ): string | null {
    if (!authorization) {
      return null;
    }

    const [scheme, token] =
      authorization.split(' ');

    if (
      scheme?.toLowerCase() !==
        'bearer' ||
      !token
    ) {
      return null;
    }

    return token;
  }
}