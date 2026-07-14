import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port);

  console.log(`EMR API running at http://localhost:${port}/api/v1`);
}

void bootstrap();
