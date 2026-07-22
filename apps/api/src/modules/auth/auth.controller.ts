import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, RequestMetadata } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { TrustedOriginGuard } from './guards/trusted-origin.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,

    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description:
      'Login completed successfully.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Invalid login credentials.',
  })
  async login(
    @Body() dto: LoginDto,

    @Req() request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const result =
      await this.authService.login(
        dto,
        this.getMetadata(request),
      );

    this.setRefreshCookie(
      response,
      result.refreshToken,
    );

    return {
      accessToken:
        result.accessToken,

      expiresIn:
        result.expiresIn,

      user: result.user,
    };
  }

  @Public()
  @UseGuards(TrustedOriginGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const cookieName =
      this.config.getOrThrow<string>(
        'auth.refreshCookieName',
      );

    const result =
      await this.authService.refresh(
        request.cookies?.[cookieName],

        this.getMetadata(request),
      );

    this.setRefreshCookie(
      response,
      result.refreshToken,
    );

    return {
      accessToken:
        result.accessToken,

      expiresIn:
        result.expiresIn,

      user: result.user,
    };
  }

  @Public()
  @UseGuards(TrustedOriginGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ): Promise<void> {
    const cookieName =
      this.config.getOrThrow<string>(
        'auth.refreshCookieName',
      );

    await this.authService.logout(
      request.cookies?.[cookieName],

      this.getMetadata(request),
    );

    response.clearCookie(
      cookieName,
      this.cookieOptions(),
    );
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({
    description:
      'Current authenticated user.',
  })
  me(
    @CurrentUser()
    user: AuthenticatedUser,
  ): AuthenticatedUser {
    return user;
  }

  private setRefreshCookie(
    response: Response,
    refreshToken: string,
  ): void {
    const cookieName =
      this.config.getOrThrow<string>(
        'auth.refreshCookieName',
      );

    const numberOfDays =
      this.config.getOrThrow<number>(
        'auth.sessionTtlDays',
      );

    response.cookie(
      cookieName,
      refreshToken,
      {
        ...this.cookieOptions(),

        maxAge:
          numberOfDays *
          24 *
          60 *
          60 *
          1000,
      },
    );
  }

  private cookieOptions() {
    return {
      httpOnly: true,

      secure:
        this.config.getOrThrow<boolean>(
          'auth.cookieSecure',
        ),

      sameSite:
        'strict' as const,

      path: '/api/v1/auth',
    };
  }

  private getMetadata(
    request: Request,
  ): RequestMetadata {
    return {
      ipAddress:
        request.ip ?? null,

      userAgent:
        request.header(
          'user-agent',
        ) ?? null,
    };
  }
}