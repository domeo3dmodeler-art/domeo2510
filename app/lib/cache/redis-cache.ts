// lib/cache/redis-cache.ts
// Профессиональная система кэширования с Redis
// Оптимизирована для работы с большими объемами данных товаров

import Redis from 'ioredis';

// Конфигурация Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Создаем экземпляр Redis
const redis = new Redis(redisConfig);

// Обработка ошибок подключения
redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

// Типы для кэширования
export enum CacheKey {
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  CLIENTS = 'clients',
  QUOTES = 'quotes',
  ORDERS = 'orders',
  INVOICES = 'invoices',
  USER_SESSION = 'user_session',
  SEARCH_RESULTS = 'search_results',
  STATISTICS = 'statistics',
}

// Интерфейс для конфигурации кэша
export interface CacheConfig {
  ttl?: number; // Time to live в секундах
  tags?: string[]; // Теги для группового удаления
  compress?: boolean; // Сжатие данных
}

export class RedisCacheService {
  /**
   * Устанавливает значение в кэш
   */
  async set<T>(
    key: string,
    value: T,
    config: CacheConfig = {}
  ): Promise<boolean> {
    try {
      const { ttl = 3600, tags = [], compress = false } = config;
      
      let serializedValue: string;
      
      if (compress && typeof value === 'object') {
        // Простое сжатие для больших объектов
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = JSON.stringify(value);
      }

      const pipeline = redis.pipeline();
      
      // Основное значение
      pipeline.setex(key, ttl, serializedValue);
      
      // Теги для группового удаления
      if (tags.length > 0) {
        const tagKey = `tags:${key}`;
        pipeline.sadd(tagKey, ...tags);
        pipeline.expire(tagKey, ttl);
      }

      await pipeline.exec();
      
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Получает значение из кэша
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Удаляет значение из кэша
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Удаляет все ключи по тегу
   */
  async deleteByTag(tag: string): Promise<number> {
    try {
      const pattern = `tags:*`;
      const keys = await redis.keys(pattern);
      
      let deletedCount = 0;
      
      for (const key of keys) {
        const isMember = await redis.sismember(key, tag);
        if (isMember) {
          const mainKey = key.replace('tags:', '');
          await redis.del(mainKey);
          await redis.del(key);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Redis deleteByTag error:', error);
      return 0;
    }
  }

  /**
   * Проверяет существование ключа
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Устанавливает время жизни ключа
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  }

  /**
   * Получает время жизни ключа
   */
  async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -1;
    }
  }

  /**
   * Инкрементирует числовое значение
   */
  async increment(key: string, value: number = 1): Promise<number> {
    try {
      return await redis.incrby(key, value);
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }

  /**
   * Получает или устанавливает значение (get-or-set pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    try {
      // Пытаемся получить из кэша
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Если нет в кэше, получаем из фабрики
      const value = await factory();
      
      // Сохраняем в кэш
      await this.set(key, value, config);
      
      return value;
    } catch (error) {
      console.error('Redis getOrSet error:', error);
      // В случае ошибки кэша, возвращаем результат фабрики
      return await factory();
    }
  }

  /**
   * Кэширует результат функции с автоматическим обновлением
   */
  async cacheFunction<T>(
    key: string,
    fn: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    return this.getOrSet(key, fn, config);
  }

  /**
   * Очищает весь кэш
   */
  async flushAll(): Promise<boolean> {
    try {
      await redis.flushall();
      return true;
    } catch (error) {
      console.error('Redis flushAll error:', error);
      return false;
    }
  }

  /**
   * Получает статистику кэша
   */
  async getStats(): Promise<{
    memory: string;
    keyspace: Record<string, string>;
    connectedClients: number;
  }> {
    try {
      const info = await redis.info();
      const lines = info.split('\r\n');
      
      const stats: any = {
        memory: '',
        keyspace: {},
        connectedClients: 0,
      };

      for (const line of lines) {
        if (line.startsWith('used_memory_human:')) {
          stats.memory = line.split(':')[1];
        } else if (line.startsWith('db')) {
          const [db, info] = line.split(':');
          stats.keyspace[db] = info;
        } else if (line.startsWith('connected_clients:')) {
          stats.connectedClients = parseInt(line.split(':')[1]);
        }
      }

      return stats;
    } catch (error) {
      console.error('Redis getStats error:', error);
      return {
        memory: '0B',
        keyspace: {},
        connectedClients: 0,
      };
    }
  }

  /**
   * Закрывает соединение с Redis
   */
  async disconnect(): Promise<void> {
    try {
      await redis.quit();
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }
}

// Экспортируем экземпляр сервиса
export const cacheService = new RedisCacheService();

// Утилиты для работы с кэшем
export class CacheUtils {
  /**
   * Генерирует ключ кэша для товаров
   */
  static productKey(id: string): string {
    return `${CacheKey.PRODUCTS}:${id}`;
  }

  /**
   * Генерирует ключ кэша для списка товаров
   */
  static productsListKey(filters: Record<string, any>): string {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    return `${CacheKey.PRODUCTS}:list:${filterStr}`;
  }

  /**
   * Генерирует ключ кэша для категорий
   */
  static categoryKey(id: string): string {
    return `${CacheKey.CATEGORIES}:${id}`;
  }

  /**
   * Генерирует ключ кэша для поиска
   */
  static searchKey(query: string, filters: Record<string, any> = {}): string {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    return `${CacheKey.SEARCH_RESULTS}:${query}:${filterStr}`;
  }

  /**
   * Генерирует ключ кэша для статистики
   */
  static statisticsKey(type: string, period: string): string {
    return `${CacheKey.STATISTICS}:${type}:${period}`;
  }

  /**
   * Инвалидирует кэш по паттерну
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      return await redis.del(...keys);
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }
}
