import { createWriteStream } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private logLevel: LogLevel;
  private logStream?: NodeJS.WritableStream;

  constructor(level: string = 'info', logFile?: string) {
    this.logLevel = this.parseLogLevel(level);
    
    if (logFile) {
      this.logStream = createWriteStream(logFile, { flags: 'a' });
    }
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const dataStr = data ? ' ' + JSON.stringify(data, null, 2) : '';
    return `[${timestamp}] ${level.padEnd(5)} ${message}${dataStr}`;
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any) {
    if (level <= this.logLevel) {
      const formattedMessage = this.formatMessage(levelName, message, data);
      
      console.log(formattedMessage);
      
      if (this.logStream) {
        this.logStream.write(formattedMessage + '\n');
      }
    }
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  close() {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

export const logger = new Logger(
  process.env.LOG_LEVEL || 'info',
  process.env.LOG_FILE
);