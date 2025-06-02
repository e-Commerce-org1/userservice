import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { logger } from './user/common/logger';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: logger, // Attach Winston Logger
  });

  // Enable CORS
  app.enableCors();

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unvalidated properties
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('User service APIs with address & auth')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT', // Optional: specifies the token format
      },
      'JWT-auth', // Name of the security scheme (used in @ApiBearerAuth decorator)
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // http://localhost:3000/api-docs

  const PORT = process.env.PORT || 8080;
  await app.listen(PORT);
  Logger.log(`🚀 Server is running on http://localhost:${PORT}`, 'Bootstrap');
}
bootstrap();
