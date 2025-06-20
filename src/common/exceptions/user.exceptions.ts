import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HTTP_STATUS } from '../constants/http-status';
export class CustomException {
  static badRequest(message: string) {
    throw new BadRequestException({
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message,
      timestamp: new Date().toISOString(),
    });
  }
  static notFound(message: string) {
    throw new NotFoundException({
      statusCode: HTTP_STATUS.NOT_FOUND,
      message,
      timestamp: new Date().toISOString(),
    });
  }
  static conflict(message: string) {
    throw new ConflictException({
      statusCode: HTTP_STATUS.CONFLICT,
      message,
      timestamp: new Date().toISOString(),
    });
  }
  static unauthorized(message: string) {
    throw new UnauthorizedException({
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message,
      timestamp: new Date().toISOString(),
    });
  }
  static internalServererror(message: string) {
    throw new InternalServerErrorException({
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message,
      timestamp: new Date().toISOString(),
    });
  }
  static tooManyRequests(message: string) {
    throw new BadRequestException({
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
