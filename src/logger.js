import { createLogger, transports } from 'winston';

const levels = {
  debug: 0,
  http: 1,
  info: 2,
  warning: 3,
  error: 4,
  fatal: 5
};

// Logger para desarrollo
const devLogger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    transports: [
      new winston.transports.Console()
    ]
  });

// Logger para producción
const prodLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
    ]
  });

module.exports = { devLogger, prodLogger, levels };