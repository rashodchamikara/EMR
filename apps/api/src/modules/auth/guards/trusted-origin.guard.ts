import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class TrustedOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request =
      context
        .switchToHttp()
        .getRequest<Request>();

    const origin =
      request.header('origin');

    // Non-browser clients may not provide Origin.
    if (!origin) {
      return true;
    }

    const allowedOrigins =
      this.config.getOrThrow<string[]>(
        'app.corsOrigins',
      );

    if (!allowedOrigins.includes(origin)) {
      throw new ForbiddenException(
        'The request origin is not trusted.',
      );
    }

    return true;
  }
}