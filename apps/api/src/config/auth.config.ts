import { registerAs } from '@nestjs/config';
export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  jwtIssuer: process.env.JWT_ISSUER ?? 'emr-api',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'emr-web',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 300),
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
  refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'emr_refresh',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5),
  loginLockMinutes: Number(process.env.LOGIN_LOCK_MINUTES ?? 15),
}));
