import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT') ?? 3001;
  const prefix = config.get<string>('API_PREFIX') ?? 'api';
  const corsOrigin = config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000';

  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: corsOrigin });

  await app.listen(port);
  console.log(`🚀 API rodando em http://localhost:${port}/${prefix}`);
}

bootstrap();
