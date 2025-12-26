import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from '../modules/user/user.service';
import { logger } from '../common/logger';
import { IncomingHttpHeaders } from 'http';
import { LOGGER_MESSAGES } from 'src/common/constants/logger.constants';
import { CustomException } from 'src/common/exceptions/user.exceptions';
import { RESPONSE_MESSAGES } from 'src/common/constants/user-messages';

interface AuthenticatedRequest extends Request {
  headers: IncomingHttpHeaders & {
    authorization?: string;
  };
  user?: {
    userId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);
    logger.debug(LOGGER_MESSAGES.AUTH_GUARD_ATTEMPT, { token });
    if (!token) {
      throw CustomException.unauthorized(RESPONSE_MESSAGES.AUTHORIZATION_HEADER_MISSING);
    }
    try {
      const validation = await this.userService.validateAccessToken(token);
      logger.debug(LOGGER_MESSAGES.AUTH_GUARD_SUCCESS, { userId: validation.entityId });
      if (!validation.isValid) {
        throw CustomException.unauthorized(validation.message || 'Invalid token');
      }
      request.user = {
        userId: validation.entityId,
        email: validation.email,
        deviceId: validation.deviceId,
        role: validation.role,
      };
      return true;
    } catch (error) {
      throw CustomException.internalServererror(RESPONSE_MESSAGES.AUTHORIZATION_HEADER_MISSING);
    }
  }

  public extractTokenFromHeader(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return undefined;
    }
    return authorization.substring(7);
  }
}
