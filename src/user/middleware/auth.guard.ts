// auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from '../services/user.service';
import { logger } from '../common/logger';
import { IncomingHttpHeaders } from 'http';

interface AuthenticatedRequest extends Request {
  headers: IncomingHttpHeaders & {
    authorization?: string; // Explicitly define authorization as optional
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
  const token = this.extractTokenFromHeader(request); // or this.extractTokenFromHeader
  logger.debug(`Extracted token: ${token}`); // Add logging
  if (!token) {
    throw new UnauthorizedException('Missing access token');
  }
  try {
    // console.log(token);
    const validation = await this.userService.validateAccessToken(token);
   console.log(validation);
    logger.debug(`Token validation result: ${JSON.stringify(validation)}`);
    if (!validation.isValid) {
      throw new UnauthorizedException(validation.message || 'Invalid token');
    }
    request.user = {
      userId: validation.userId,
      email: validation.email,
      deviceId: validation.deviceId,
      role: validation.role,
    };
    return true;
  } catch (error) {
    // logger.error(`Auth guard error: ${error.message}`);
    throw new UnauthorizedException('Invalid token');
  }
}

  // Changed from private to public
  public extractTokenFromHeader(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return undefined;
    }
    return authorization.substring(7); // Remove "Bearer " prefix
  }
}
