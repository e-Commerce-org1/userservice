import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { logger } from './common/logger';
import * as dotenv from 'dotenv';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { packageName } from './common/constants/admin.constant';
import { AllExceptionsFilter } from './common/filters/user.filter';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });
  // const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('User service APIs with address & auth')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  const grpcMicroservice = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: packageName,
      protoPath: join(__dirname, 'proto/user.proto'),
      url: process.env.GRPC_URL,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  const HTTP_PORT = process.env.PORT || 3001;
  await Promise.all([app.listen(HTTP_PORT), grpcMicroservice.listen()]);

  Logger.log(`🚀 HTTP Server running on http://localhost:${HTTP_PORT}`, 'Bootstrap');
  Logger.log(`🔄 gRPC Server running on ${process.env.GRPC_URL || '0.0.0.0:50051'}`, 'Bootstrap');
  Logger.log(`📄 Swagger docs available at http://localhost:${HTTP_PORT}/api-docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error('Failed to start application', err.stack, 'Bootstrap');
  process.exit(1);
});
