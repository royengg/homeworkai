import winston from "winston";
import { config } from "./app.config";
import path from "path";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];



  transports.push(
    new winston.transports.File({
      filename: path.join(config.logFilePath, "error.log"),
      level: "error",
      format: logFormat,
    }),
    new winston.transports.File({
      filename: path.join(config.logFilePath, "combined.log"),
      format: logFormat,
    })
  );


export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports,
  
  exitOnError: false,
});


export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== "object") return data;
  
  const sanitized = { ...data };
  const sensitiveFields = ["password", "token", "authorization", "jwt", "secret"];
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
}
