// lib/logging/client-logger.ts
// Клиентский wrapper для логирования в браузере

/**
 * Клиентский логгер для использования в 'use client' компонентах
 * Работает только в development режиме для отладки
 */
export class ClientLogger {
  private static isDevelopment = 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1');

  private static shouldLog(): boolean {
    return this.isDevelopment && typeof window !== 'undefined';
  }

  static debug(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog()) return;
    console.debug(`[DEBUG] ${message}`, metadata || '');
  }

  static info(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog()) return;
    console.info(`[INFO] ${message}`, metadata || '');
  }

  static warn(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog()) return;
    console.warn(`[WARN] ${message}`, metadata || '');
  }

  static error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    // Ошибки логируем всегда, даже в production
    if (typeof window === 'undefined') return;
    
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    
    // Используем console.error только для критических ошибок
    // В production это будет отправлено в систему мониторинга
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[ERROR] ${message}`, errorData || '', metadata || '');
    }
  }

  // Специальные методы для компонентов
  static componentRender(componentName: string, props?: Record<string, unknown>): void {
    if (!this.shouldLog()) return;
    console.debug(`[RENDER] ${componentName}`, props || '');
  }

  static componentProps(componentName: string, props: Record<string, unknown>): void {
    if (!this.shouldLog()) return;
    console.debug(`[PROPS] ${componentName}`, props);
  }

  static apiCall(method: string, url: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog()) return;
    console.debug(`[API] ${method} ${url}`, data || '');
  }

  static apiResponse(method: string, url: string, status: number, data?: Record<string, unknown>): void {
    if (!this.shouldLog()) return;
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    if (typeof console !== 'undefined' && console[level]) {
      console[level](`[API] ${method} ${url} - ${status}`, data || '');
    }
  }
}

// Экспортируем синглтон для удобства
export const clientLogger = ClientLogger;

