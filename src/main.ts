import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { logger } from './user/common/logger';
import * as dotenv from 'dotenv';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

dotenv.config();

async function bootstrap() {
  // Create HTTP server
  const app = await NestFactory.create(AppModule, {
    logger: logger, // Attach Winston Logger
  });

  // Enable CORS (for HTTP)
  app.enableCors();

  // Global validation (for HTTP)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup (for HTTP)
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

  // Create gRPC microservice
  const grpcMicroservice = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'useradmin', // Must match your proto package
        protoPath: join(__dirname, 'proto/admin.proto'), // Path to proto file
        url: process.env.GRPC_URL || '0.0.0.0:5051', // gRPC server address
        loader: {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    },
  );

  // Start both servers
  const HTTP_PORT = process.env.PORT || 3001;
  await Promise.all([
    app.listen(HTTP_PORT),
    grpcMicroservice.listen(),
  ]);

  Logger.log(`🚀 HTTP Server running on http://localhost:${HTTP_PORT}`, 'Bootstrap');
  Logger.log(`🔄 gRPC Server running on ${process.env.GRPC_URL || '0.0.0.0:50051'}`, 'Bootstrap');
  Logger.log(`📄 Swagger docs available at http://localhost:${HTTP_PORT}/api-docs`, 'Bootstrap');
}

bootstrap().catch(err => {
  Logger.error('Failed to start application', err.stack, 'Bootstrap');
  process.exit(1);
});