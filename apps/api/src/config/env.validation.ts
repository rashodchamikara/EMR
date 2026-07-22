import Joi from 'joi';
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_NAME: Joi.string().min(2).default('EMR API'),
  APP_VERSION: Joi.string().default('0.1.0'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'log', 'debug', 'verbose')
    .default('debug'),
  DATABASE_URL: Joi.string().required(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_CONNECTION_LIMIT: Joi.number().integer().min(1).max(100).default(10),
  JWT_ACCESS_SECRET: Joi.string().min(64).required(),
  JWT_ISSUER: Joi.string().min(2).required(),
  JWT_AUDIENCE: Joi.string().min(2).required(),
  ACCESS_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(3600)
    .default(300),
  SESSION_TTL_DAYS: Joi.number().integer().min(1).max(90).default(30),
  REFRESH_COOKIE_NAME: Joi.string().default('emr_refresh'),
  COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  LOGIN_MAX_ATTEMPTS: Joi.number().integer().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: Joi.number().integer().min(1).max(1440).default(15),
  SEED_ADMIN_EMAIL: Joi.string().email().optional(),
  SEED_ADMIN_PASSWORD: Joi.string().min(12).max(128).optional(),
  SEED_ADMIN_FIRST_NAME: Joi.string().optional(),
  SEED_ADMIN_LAST_NAME: Joi.string().optional(),
});
