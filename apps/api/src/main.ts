import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestContextMiddleware } from './common/middleware/request-context.middleware';
async function bootstrap(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: isProduction,
      colors: !isProduction,
      timestamp: true,
    }),
  });
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('app.port');
  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix');
  const corsOrigins = configService.getOrThrow<string[]>('app.corsOrigins');
  const appName = configService.getOrThrow<string>('app.name');
  const appVersion = configService.getOrThrow<string>('app.version');
  app.use(helmet());
  app.use(requestContextMiddleware);
  app.setGlobalPrefix(apiPrefix);
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  const swaggerConfiguration = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('API documentation for the EMR platform.')
    .setVersion(appVersion)
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerConfiguration,
  );
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });
  app.enableShutdownHooks();
  await app.listen(port);
  console.log(`${appName} running at http://localhost:${port}/${apiPrefix}`);
  console.log(`API documentation available at http://localhost:${port}/docs`);
}
void bootstrap();
