import { logger } from '../common/logger';

/**
 * Log levels supported by the logging utility.
 */
type LogLevel = 'info' | 'warn' | 'error';

/**
 * Logs a message at the specified level with dynamic replacements.
 *
 * @param level - The log level ('info', 'warn', or 'error').
 * @param messageTemplate - The message template with placeholders (e.g., '{email} failed').
 * @param replacements - Key-value pairs for placeholder replacements (e.g., { email: 'user@example.com' }).
 *
 * @example
 * logMessage('info', 'User {email} logged in', { email: 'user@example.com' });
 * // Logs: "User user@example.com logged in" at info level
 */
export function logMessage(
  level: LogLevel,
  messageTemplate: string,
  replacements: Record<string, string> = {},
): void {
  let formattedMessage = messageTemplate;
  for (const [key, value] of Object.entries(replacements)) {
    formattedMessage = formattedMessage.replace(`{${key}}`, value || 'unknown');
  }
  logger[level](formattedMessage);
}
