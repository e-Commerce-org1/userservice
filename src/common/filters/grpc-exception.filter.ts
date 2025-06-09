import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class GrpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GrpcExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    this.logger.error(`GRPC Exception: ${exception.message}`, exception.stack);

    if (exception instanceof RpcException) {
      throw exception;
    }

    throw new RpcException({
      code: 13,
      message: exception.message || 'Internal server error',
    });
  }
}
