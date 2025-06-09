import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from '../modules/user/user.service';
import { logger } from '../common/logger';
import { IncomingHttpHeaders } from 'http';

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
  logger.debug(`Extracted token: ${token}`); 
  if (!token) {
    throw new UnauthorizedException('Missing access token');
  }
  try {
    const validation = await this.userService.validateAccessToken(token);
   console.log(validation);
    logger.debug(`Token validation result: ${JSON.stringify(validation)}`);
    if (!validation.isValid) {
      throw new UnauthorizedException(validation.message || 'Invalid token');
    }
    request.user = {
      userId: validation.entityId,
      email: validation.email,
      deviceId: validation.deviceId,
      role: validation.role,
    };
    return true;
  } catch (error) {
    throw new UnauthorizedException('Invalid token');
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
