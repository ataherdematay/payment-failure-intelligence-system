import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Payment Failure Intelligence System API')
    .setDescription('PFIS — transaction analytics, ML predictions, actionable insights')
    .setVersion('1.0')
    .addTag('transactions')
    .addTag('analytics')
    .addTag('insights')
    .addTag('ml')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.BACKEND_PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 PFIS Backend → http://localhost:${port}`);
  logger.log(`�� Swagger      → http://localhost:${port}/api/docs`);
}
bootstrap();
