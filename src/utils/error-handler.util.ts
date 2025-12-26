import { CustomException } from '../common/exceptions/user.exceptions';
import { RESPONSE_MESSAGES } from '../common/constants/user-messages';
import { logMessage } from './logger.utils';

type CustomExceptionMethod =
  | 'badRequest'
  | 'notFound'
  | 'conflict'
  | 'unauthorized'
  | 'internalServererror';

/**
 * Handles and throws standardized service errors.
 *
 * @param error - The original caught error
 * @param logMessageTemplate - Logger template like 'SIGNUP_ERROR: {error}'
 * @param errorType - Type of error to throw (default: internalServererror)
 * @param responseMessage - Message to include in the thrown exception
 * @param logReplacements - Additional replacements for logging
 */
export function handleServiceError(
  error: any,
  logMessageTemplate: string,
  errorType: CustomExceptionMethod = 'internalServererror',
  responseMessage: string = RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
  logReplacements: Record<string, string> = {},
): never {
  // If the error is already a CustomException, re-throw it
  if (error?.name === 'CustomException') {
    throw error;
  }

  // Log the error with replacements
  logMessage('error', logMessageTemplate, {
    error: error?.message || 'Unknown error',
    ...logReplacements,
  });

  // Throw the appropriate exception
  const exceptionThrower = CustomException[errorType] as (msg: string) => never;
  throw exceptionThrower(responseMessage);
}

/**
 * Wrapper for async operations with consistent error handling
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  logMessageTemplate: string,
  errorType: CustomExceptionMethod = 'internalServererror',
  responseMessage: string = RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
  logReplacements: Record<string, string> = {},
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleServiceError(error, logMessageTemplate, errorType, responseMessage, logReplacements);
  }
}
