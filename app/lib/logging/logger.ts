// lib/logging/logger.ts
// Система логирования

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 10000; // Максимальное количество логов в памяти
  private currentLevel: LogLevel = LogLevel.INFO;

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Установка уровня логирования
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  // Проверка, должен ли лог быть записан
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentIndex = levels.indexOf(this.currentLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= currentIndex;
  }

  // Запись лога
  private log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      // TODO: добавить userId и sessionId из контекста
    };

    this.logs.push(logEntry);

    // Очищаем старые логи если превышен лимит
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Выводим в консоль для разработки
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === LogLevel.ERROR ? console.error :
                           level === LogLevel.WARN ? console.warn :
                           level === LogLevel.INFO ? console.info :
                           console.debug;

      const prefix = `[${level.toUpperCase()}]`;
      const contextStr = context ? `[${context}]` : '';
      const metaStr = metadata ? JSON.stringify(metadata, null, 2) : '';
      
      consoleMethod(`${prefix} ${contextStr} ${message}`, metaStr);
    }

    // TODO: В продакшене отправлять логи на внешний сервис (например, Sentry, LogRocket)
  }

  // Методы для разных уровней логирования
  error(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  // Логирование API запросов
  apiRequest(method: string, url: string, metadata?: Record<string, any>): void {
    this.info(`API Request: ${method} ${url}`, 'API', metadata);
  }

  apiResponse(method: string, url: string, status: number, duration: number, metadata?: Record<string, any>): void {
    const level = status >= 400 ? LogLevel.ERROR : status >= 300 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `API Response: ${method} ${url} - ${status} (${duration}ms)`, 'API', metadata);
  }

  // Логирование ошибок базы данных
  dbError(operation: string, error: any, metadata?: Record<string, any>): void {
    this.error(`Database error in ${operation}: ${error.message}`, 'DATABASE', {
      ...metadata,
      error: error.stack
    });
  }

  // Логирование действий пользователя
  userAction(action: string, userId: string, metadata?: Record<string, any>): void {
    this.info(`User action: ${action}`, 'USER_ACTION', {
      ...metadata,
      userId
    });
  }

  // Логирование производительности
  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;
    this.log(level, `Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', metadata);
  }

  // Получение логов
  getLogs(filter?: {
    level?: LogLevel;
    context?: string;
    since?: Date;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      
      if (filter.context) {
        filteredLogs = filteredLogs.filter(log => log.context === filter.context);
      }
      
      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= filter.since!);
      }
      
      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs;
  }

  // Экспорт логов
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Очистка логов
  clear(): void {
    this.logs = [];
  }

  // Получение статистики логов
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byContext: Record<string, number>;
  } {
    const byLevel = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.DEBUG]: 0
    };

    const byContext: Record<string, number> = {};

    this.logs.forEach(log => {
      byLevel[log.level]++;
      if (log.context) {
        byContext[log.context] = (byContext[log.context] || 0) + 1;
      }
    });

    return {
      total: this.logs.length,
      byLevel,
      byContext
    };
  }
}

// Создаем глобальный экземпляр логгера
export const logger = Logger.getInstance();

// Утилиты для быстрого логирования
export const logError = (message: string, context?: string, metadata?: Record<string, any>) => 
  logger.error(message, context, metadata);

export const logWarn = (message: string, context?: string, metadata?: Record<string, any>) => 
  logger.warn(message, context, metadata);

export const logInfo = (message: string, context?: string, metadata?: Record<string, any>) => 
  logger.info(message, context, metadata);

export const logDebug = (message: string, context?: string, metadata?: Record<string, any>) => 
  logger.debug(message, context, metadata);



