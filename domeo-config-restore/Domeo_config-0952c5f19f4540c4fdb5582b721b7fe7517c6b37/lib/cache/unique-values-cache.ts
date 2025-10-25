/**
 * Кэш для уникальных значений свойств товаров
 */
class UniqueValuesCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 минут

  /**
   * Генерирует ключ кэша для комбинации категорий и свойств
   */
  private getCacheKey(categoryIds: string[], propertyNames: string[]): string {
    const sortedCategories = [...categoryIds].sort().join(',');
    const sortedProperties = [...propertyNames].sort().join(',');
    return `unique_values_${sortedCategories}_${sortedProperties}`;
  }

  /**
   * Проверяет, действителен ли кэш
   */
  private isValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.TTL;
  }

  /**
   * Получает данные из кэша
   */
  get(categoryIds: string[], propertyNames: string[]): any | null {
    const key = this.getCacheKey(categoryIds, propertyNames);
    const cached = this.cache.get(key);
    
    if (cached && this.isValid(cached.timestamp)) {
      console.log(`Cache hit for key: ${key}`);
      return cached.data;
    }
    
    if (cached) {
      console.log(`Cache expired for key: ${key}`);
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Сохраняет данные в кэш
   */
  set(categoryIds: string[], propertyNames: string[], data: any): void {
    const key = this.getCacheKey(categoryIds, propertyNames);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`Cached data for key: ${key}`);
  }

  /**
   * Очищает кэш
   */
  clear(): void {
    this.cache.clear();
    console.log('Unique values cache cleared');
  }

  /**
   * Очищает устаревшие записи
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Получает статистику кэша
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Экспортируем единственный экземпляр
export const uniqueValuesCache = new UniqueValuesCache();

// Очищаем кэш каждые 10 минут
if (typeof window === 'undefined') { // Только на сервере
  setInterval(() => {
    uniqueValuesCache.cleanup();
  }, 10 * 60 * 1000);
}
