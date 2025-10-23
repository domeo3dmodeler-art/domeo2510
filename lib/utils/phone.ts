// lib/utils/phone.ts
// Утилиты для валидации и форматирования телефонных номеров

/**
 * Очищает номер телефона от всех символов кроме цифр
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Проверяет, является ли номер телефона валидным международным форматом
 */
export function isValidInternationalPhone(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  
  // Проверяем длину (от 10 до 15 цифр)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }
  
  // Проверяем, что номер начинается с кода страны
  // Российские номера: +7 (10-11 цифр)
  if (cleaned.startsWith('7') && (cleaned.length === 11)) {
    return true;
  }
  
  // Другие международные номера (начинаются с 1-9, длина 10-15)
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    const firstDigit = parseInt(cleaned[0]);
    return firstDigit >= 1 && firstDigit <= 9;
  }
  
  return false;
}

/**
 * Форматирует номер телефона в международный формат
 */
export function formatInternationalPhone(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  if (!cleaned) return '';
  
  // Российские номера
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
  }
  
  // Номера, начинающиеся с 8 (российские без +7)
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
  }
  
  // Номера без кода страны (предполагаем российские)
  if (cleaned.length === 10) {
    return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`;
  }
  
  // Другие международные номера
  if (cleaned.length >= 10) {
    return `+${cleaned}`;
  }
  
  return phone;
}

/**
 * Нормализует номер телефона для хранения в базе данных
 */
export function normalizePhoneForStorage(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  if (!cleaned) return '';
  
  // Российские номера
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    return `+7${cleaned.slice(1)}`;
  }
  
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  
  if (cleaned.length === 10) {
    return `+7${cleaned}`;
  }
  
  // Другие номера
  if (cleaned.length >= 10) {
    return `+${cleaned}`;
  }
  
  return phone;
}

/**
 * Создает маску для ввода телефона
 */
export function getPhoneMask(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
    return '+7 (___) ___-__-__';
  }
  
  if (cleaned.length <= 3) {
    return '+___';
  }
  
  return `+${'_'.repeat(Math.min(cleaned.length, 15))}`;
}

/**
 * Применяет маску к номеру телефона при вводе
 */
export function applyPhoneMask(value: string): string {
  const cleaned = cleanPhoneNumber(value);
  
  if (!cleaned) return '';
  
  // Российские номера
  if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
    if (cleaned.length <= 1) return '+7';
    if (cleaned.length <= 4) return `+7 (${cleaned.slice(1)}`;
    if (cleaned.length <= 7) return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
    if (cleaned.length <= 9) return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
  }
  
  // Другие номера
  if (cleaned.length <= 1) return '+';
  return `+${cleaned}`;
}

/**
 * Получает код страны из номера телефона
 */
export function getCountryCode(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  if (cleaned.startsWith('7')) return 'RU';
  if (cleaned.startsWith('1')) return 'US';
  if (cleaned.startsWith('44')) return 'GB';
  if (cleaned.startsWith('49')) return 'DE';
  if (cleaned.startsWith('33')) return 'FR';
  
  return 'UNKNOWN';
}

/**
 * Проверяет, является ли номер российским
 */
export function isRussianPhone(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.startsWith('7') || cleaned.startsWith('8') || cleaned.length === 10;
}
