/**
 * Утилиты для правильной обработки UTF-8 кодировки
 */

/**
 * Правильно кодирует строку в UTF-8
 */
export function encodeUTF8(str: string): string {
  try {
    // Проверяем, что строка уже правильно закодирована
    if (typeof str !== 'string') {
      return String(str);
    }
    
    // Убеждаемся, что строка правильно обработана
    return Buffer.from(str, 'utf8').toString('utf8');
  } catch (error) {
    console.warn('Ошибка кодировки UTF-8:', error);
    return str;
  }
}

/**
 * Правильно декодирует строку из UTF-8
 */
export function decodeUTF8(str: string): string {
  try {
    if (typeof str !== 'string') {
      return String(str);
    }
    
    // Проверяем, есть ли проблемы с кодировкой
    if (str.includes('�') || str.includes('?')) {
      // Пытаемся исправить кодировку
      return Buffer.from(str, 'latin1').toString('utf8');
    }
    
    return str;
  } catch (error) {
    console.warn('Ошибка декодирования UTF-8:', error);
    return str;
  }
}

/**
 * Обрабатывает массив строк с правильной кодировкой
 */
export function processUTF8Array(arr: string[]): string[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  
  return arr.map(item => {
    if (typeof item === 'string') {
      return encodeUTF8(item);
    }
    return String(item);
  });
}

/**
 * Обрабатывает объект с правильной кодировкой
 */
export function processUTF8Object(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return encodeUTF8(obj);
  }
  
  if (Array.isArray(obj)) {
    return processUTF8Array(obj);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[encodeUTF8(key)] = processUTF8Object(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * Создает правильный JSON ответ с UTF-8 кодировкой
 */
export function createUTF8Response(data: any, status: number = 200) {
  const processedData = processUTF8Object(data);
  
  return new Response(JSON.stringify(processedData), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
