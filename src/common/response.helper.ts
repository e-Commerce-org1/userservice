import { HTTP_STATUS, HttpStatusCode } from './constants/http-status';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: HttpStatusCode;
  message: string;
  data?: T;
  error?: any;
}

export class ResponseHelper {
  static success<T = any>(
    message: string,
    data?: T,
    statusCode: HttpStatusCode = HTTP_STATUS.OK,
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
    };
  }

  static error(
    message: string,
    error?: any,
    statusCode: HttpStatusCode = HTTP_STATUS.BAD_REQUEST,
  ): ApiResponse {
    return {
      success: false,
      statusCode,
      message,
      error,
    };
  }

  static created<T = any>(message: string, data?: T): ApiResponse<T> {
    return this.success(message, data, HTTP_STATUS.CREATED);
  }

  static notFound(message: string): ApiResponse {
    return this.error(message, null, HTTP_STATUS.NOT_FOUND);
  }

  static unauthorized(message: string): ApiResponse {
    return this.error(message, null, HTTP_STATUS.UNAUTHORIZED);
  }

  static conflict(message: string): ApiResponse {
    return this.error(message, null, HTTP_STATUS.CONFLICT);
  }

  static internalServerError(message: string, error?: any): ApiResponse {
    return this.error(message, error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
