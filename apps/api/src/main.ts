import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? config.get<number>('API_PORT') ?? 3001;
  const prefix = config.get<string>('API_PREFIX') ?? 'api';
  const corsOrigin = config.get<string>('CORS_ORIGIN');

  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: corsOrigin ? corsOrigin.split(',') : true });

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API rodando em http://localhost:${port}/${prefix}`);
}

bootstrap();
