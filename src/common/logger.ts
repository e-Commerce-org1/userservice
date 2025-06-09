import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';

const logDir = 'logs';

const nestLevels = {
  error: 0,
  warn: 1,
  info: 2, 
  log: 3,
  verbose: 4,
  debug: 5,
};
export const logger = winston.createLogger({
  levels: nestLevels,
  level: 'log', 
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      (info) =>
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
