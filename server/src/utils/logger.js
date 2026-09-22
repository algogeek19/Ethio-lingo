import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists inside server folder
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${metaString}`;
  })
);

const consoleLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] ${level}: ${message} ${metaString}`;
  })
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transports: [
    // Print logs to console
    new winston.transports.Console({
      format: consoleLogFormat,
    }),
    // Write all errors to server/logs/error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileLogFormat,
    }),
    // Write all logs to server/logs/combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileLogFormat,
    }),
  ],
});

export default logger;
