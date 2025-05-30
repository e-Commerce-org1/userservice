import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';

const logDir = 'logs';

// Define NestJS-compatible log levels
const nestLevels = {
  error: 0,
  warn: 1,
  info: 2, // ✅ add this line
  log: 3,
  verbose: 4,
  debug: 5,
};
export const logger = winston.createLogger({
  levels: nestLevels,
  level: 'log', // default log level
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      (info) =>
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`,
    ),
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'success.log'),
      level: 'log',
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.Console({
      format: nestWinstonModuleUtilities.format.nestLike('UserService', {
        prettyPrint: true,
      }),
    }),
  ],
});
