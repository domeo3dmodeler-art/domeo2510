import { NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export class ApiErrorHandler {
  static handle(error: unknown, context?: string): NextResponse {
    console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

    // Prisma ошибки
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      
      switch (prismaError.code) {
        case 'P2002':
          return NextResponse.json(
            { 
              success: false, 
              error: 'Нарушение уникальности', 
              message: 'Запись с такими данными уже существует',
              code: 'UNIQUE_CONSTRAINT_VIOLATION'
            },
            { status: 409 }
          );
          
        case 'P2025':
          return NextResponse.json(
            { 
              success: false, 
              error: 'Запись не найдена', 
              message: 'Запрашиваемая запись не существует',
              code: 'RECORD_NOT_FOUND'
            },
            { status: 404 }
          );
          
        case 'P2003':
          return NextResponse.json(
            { 
              success: false, 
              error: 'Ошибка внешнего ключа', 
              message: 'Связанная запись не найдена',
              code: 'FOREIGN_KEY_CONSTRAINT'
            },
            { status: 400 }
          );
      }
    }

    // Ошибки валидации
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ошибка валидации', 
          message: 'Некорректные данные',
          details: error,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // Стандартные ошибки
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Внутренняя ошибка сервера', 
          message: error.message,
          code: 'INTERNAL_SERVER_ERROR'
        },
        { status: 500 }
      );
    }

    // Неизвестные ошибки
    return NextResponse.json(
      { 
        success: false, 
        error: 'Неизвестная ошибка', 
        message: 'Произошла непредвиденная ошибка',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }

  static validateRequired(params: Record<string, any>, required: string[]): void {
    const missing = required.filter(param => !params[param]);
    
    if (missing.length > 0) {
      throw new Error(`Отсутствуют обязательные параметры: ${missing.join(', ')}`);
    }
  }

  static validateType(value: any, expectedType: string, paramName: string): void {
    if (typeof value !== expectedType) {
      throw new Error(`Параметр '${paramName}' должен быть типа ${expectedType}, получен ${typeof value}`);
    }
  }

  static validateRange(value: number, min: number, max: number, paramName: string): void {
    if (value < min || value > max) {
      throw new Error(`Параметр '${paramName}' должен быть в диапазоне от ${min} до ${max}`);
    }
  }
}

export const apiErrorHandler = ApiErrorHandler;
