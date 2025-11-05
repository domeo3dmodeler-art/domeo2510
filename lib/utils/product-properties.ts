/**
 * Утилиты для работы со свойствами товаров
 * Централизованная логика парсинга и получения свойств
 */

import { PRODUCT_PROPERTIES, PROPERTY_MAPPING, DOOR_CALCULATOR_PROPERTIES } from '../constants/product-properties';
import type { ProductPropertyKey, DoorCalculatorPropertyKey } from '../constants/product-properties';

/**
 * Парсинг properties_data из строки или объекта
 */
export function parseProductProperties(propertiesData: string | object | null | undefined): Record<string, any> {
  if (!propertiesData) return {};
  
  if (typeof propertiesData === 'string') {
    try {
      return JSON.parse(propertiesData);
    } catch (error) {
      console.warn('Failed to parse properties_data:', error);
      return {};
    }
  }
  
  return propertiesData;
}

/**
 * Получение свойства товара с fallback на старое название
 */
export function getProductProperty(
  properties: Record<string, any>, 
  key: ProductPropertyKey
): any {
  const propertyKey = PRODUCT_PROPERTIES[key];
  
  // Сначала пробуем новое название
  let value = properties[propertyKey];
  
  // Если не найдено, пробуем старое название через маппинг
  if (value === undefined || value === null || value === '') {
    const oldKey = PROPERTY_MAPPING[propertyKey as keyof typeof PROPERTY_MAPPING];
    if (oldKey) {
      value = properties[oldKey];
    }
  }
  
  return value;
}

/**
 * Получение свойства товара только по новому названию
 */
export function getProductPropertyNew(
  properties: Record<string, any>, 
  key: ProductPropertyKey
): any {
  const propertyKey = PRODUCT_PROPERTIES[key];
  return properties[propertyKey];
}

/**
 * Получение свойства товара только по старому названию
 */
export function getProductPropertyOld(
  properties: Record<string, any>, 
  key: ProductPropertyKey
): any {
  const propertyKey = PRODUCT_PROPERTIES[key];
  const oldKey = PROPERTY_MAPPING[propertyKey as keyof typeof PROPERTY_MAPPING];
  return oldKey ? properties[oldKey] : undefined;
}

// Специализированные функции для дверей

export function getDoorStyle(properties: Record<string, any>): string | undefined {
  return getProductProperty(properties, 'STYLE');
}

export function getDoorModel(properties: Record<string, any>): string | undefined {
  return getProductProperty(properties, 'MODEL');
}

export function getDoorFinish(properties: Record<string, any>): string | undefined {
  return getProductProperty(properties, 'COATING_TYPE');
}

export function getDoorColor(properties: Record<string, any>): string | undefined {
  return getProductProperty(properties, 'COLOR');
}

export function getDoorWidth(properties: Record<string, any>): number | undefined {
  const width = getProductProperty(properties, 'WIDTH');
  return width ? Number(width) : undefined;
}

export function getDoorHeight(properties: Record<string, any>): number | undefined {
  const height = getProductProperty(properties, 'HEIGHT');
  return height ? Number(height) : undefined;
}

export function getDoorRetailPrice(properties: Record<string, any>): number | undefined {
  const price = getProductProperty(properties, 'RETAIL_PRICE');
  return price ? parseFloat(price) : undefined;
}

export function getDoorSku(properties: Record<string, any>): string | undefined {
  return getProductProperty(properties, 'ARTICLE_DOMEO');
}

// Функции для калькулятора дверей

export function getDoorCalculatorProperty(
  properties: Record<string, any>, 
  key: DoorCalculatorPropertyKey
): any {
  const propertyKey = DOOR_CALCULATOR_PROPERTIES[key];
  return properties[propertyKey];
}

// Утилиты для валидации

export function hasDoorProperty(properties: Record<string, any>, key: ProductPropertyKey): boolean {
  const value = getProductProperty(properties, key);
  return value !== undefined && value !== null && value !== '';
}

export function hasDoorCalculatorProperty(properties: Record<string, any>, key: DoorCalculatorPropertyKey): boolean {
  const value = getDoorCalculatorProperty(properties, key);
  return value !== undefined && value !== null && value !== '';
}

// Функции для отладки

export function logProductProperties(properties: Record<string, any>, productName?: string): void {
  console.log(`🔍 Product Properties${productName ? ` for ${productName}` : ''}:`, {
    style: getDoorStyle(properties),
    model: getDoorModel(properties),
    finish: getDoorFinish(properties),
    color: getDoorColor(properties),
    width: getDoorWidth(properties),
    height: getDoorHeight(properties),
    price: getDoorRetailPrice(properties),
    sku: getDoorSku(properties),
    allKeys: Object.keys(properties)
  });
}

export function getPropertyKeys(properties: Record<string, any>): string[] {
  return Object.keys(properties);
}

export function getPropertyValues(properties: Record<string, any>): any[] {
  return Object.values(properties);
}

// Функции для фильтрации

export function filterPropertiesByKeys(properties: Record<string, any>, keys: string[]): Record<string, any> {
  const filtered: Record<string, any> = {};
  keys.forEach(key => {
    if (properties[key] !== undefined) {
      filtered[key] = properties[key];
    }
  });
  return filtered;
}

export function excludeTechnicalProperties(properties: Record<string, any>): Record<string, any> {
  const technicalKeys = ['_id', 'url', 'path', 'image', 'photos'];
  return filterPropertiesByKeys(properties, Object.keys(properties).filter(key => 
    !technicalKeys.some(techKey => key.toLowerCase().includes(techKey))
  ));
}
