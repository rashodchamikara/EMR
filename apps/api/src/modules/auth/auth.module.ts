import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { TrustedOriginGuard } from './guards/trusted-origin.guard';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { OrganizationContextGuard } from './guards/organization-context.guard';
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    PasswordService,
    TokenService,
    TrustedOriginGuard,
    OrganizationContextGuard,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthRepository, PasswordService, OrganizationContextGuard],
})
export class AuthModule {}
