import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // ─── Security ──────────────────────────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ─── Global Prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,            // Auto-transform to DTO class
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── WebSockets ────────────────────────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // ─── Swagger (dev only) ────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('CivilIQ API')
      .setDescription('Real-time AI-native CRM for civil construction')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger UI: http://localhost:4000/api/docs');
  }

  // ─── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`CivilIQ API running on http://localhost:${port}/api/v1`);
}

bootstrap();
