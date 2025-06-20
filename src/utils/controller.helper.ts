import { Request } from 'express';
import { CustomException } from '../common/exceptions/user.exceptions';
import { RESPONSE_MESSAGES } from '../common/constants/user-messages';
import { logMessage } from './logger.utils';

// Extend Express Request interface to include user with userId
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
      [key: string]: any;
    };
  }
}

/**
 * Extracts user ID from authenticated request
 */
export function getUserIdFromRequest(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
  }
  return userId;
}

/**
 * Extracts access token from authorization header
 */
export function getAccessTokenFromRequest(req: Request): string {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.replace('Bearer ', '');
  if (!accessToken) {
    throw CustomException.unauthorized(RESPONSE_MESSAGES.ACCESS_TOKEN_REQUIRED);
  }
  return accessToken;
}

/**
 * Generic controller method wrapper for consistent error handling and logging
 */
export async function executeControllerMethod<T>(
  operation: () => Promise<T>,
  logInfo: {
    attemptMessage: string;
    successMessage: string;
    errorMessage: string;
    context?: Record<string, string>;
  },
): Promise<T> {
  try {
    logMessage('info', logInfo.attemptMessage, logInfo.context || {});
    const result = await operation();
    logMessage('info', logInfo.successMessage, logInfo.context || {});
    return result;
  } catch (error) {
    logMessage('error', logInfo.errorMessage, {
      error: error?.message || 'Unknown error',
      ...logInfo.context,
    });
    throw error;
  }
}
