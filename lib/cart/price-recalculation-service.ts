// Унифицированный сервис для пересчета цены товаров в корзине

import { CartItem } from '@/types/cart';

export interface PriceCalculationResult {
  success: boolean;
  price?: number;
  error?: string;
  sku_1c?: string;
  breakdown?: Array<{ label: string; amount: number }>;
}

export interface PriceRecalculationOptions {
  validateCombination?: boolean;
  useCache?: boolean;
  timeout?: number;
}

type CachedPriceResult = PriceCalculationResult & { timestamp: number };

class PriceRecalculationService {
  private cache = new Map<string, CachedPriceResult>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут
  private readonly DEFAULT_TIMEOUT = 10000; // 10 секунд

  /**
   * Унифицированная функция для пересчета цены товара
   */
  async recalculateItemPrice(
    item: CartItem, 
    options: PriceRecalculationOptions = {}
  ): Promise<PriceCalculationResult> {
    const {
      validateCombination = true,
      useCache = true,
      timeout = this.DEFAULT_TIMEOUT
    } = options;

    // Создаем ключ для кэширования
    const cacheKey = this.createCacheKey(item);
    
    // Проверяем кэш
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('💾 Используем кэшированный результат:', cacheKey);
        return cached;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    try {
      // Валидация комбинации параметров (если включена)
      if (validateCombination) {
        const validationResult = await this.validateCombination(item);
        if (!validationResult.success) {
          return {
            success: false,
            error: validationResult.error
          };
        }
      }

      // Расчет цены через API
      const priceResult = await this.calculatePriceViaAPI(item, timeout);
      
      // Сохраняем в кэш
      if (useCache && priceResult.success) {
        this.cache.set(cacheKey, {
          ...priceResult,
          timestamp: Date.now()
        });
      }

      return priceResult;

    } catch (error) {
      console.error('❌ Ошибка пересчета цены:', error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Валидация доступности комбинации параметров
   */
  private async validateCombination(item: CartItem): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/available-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: item.style,
          model: item.model,
          color: item.color
        })
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'Не удалось проверить доступность параметров'
        };
      }

      const data = await response.json();
      const availableParams = data.params;

      // Проверяем каждый параметр
      if (item.finish && !availableParams.finishes?.includes(item.finish)) {
        return {
          success: false,
          error: `Покрытие "${item.finish}" недоступно для данной модели`
        };
      }

      if (item.color && !availableParams.colors?.includes(item.color)) {
        return {
          success: false,
          error: `Цвет "${item.color}" недоступен для данной модели`
        };
      }

      if (item.width && !availableParams.widths?.includes(item.width)) {
        return {
          success: false,
          error: `Ширина ${item.width} мм недоступна для данной модели`
        };
      }

      if (item.height && !availableParams.heights?.includes(item.height)) {
        return {
          success: false,
          error: `Высота ${item.height} мм недоступна для данной модели`
        };
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Ошибка валидации комбинации:', error);
      return {
        success: false,
        error: 'Ошибка проверки доступности параметров'
      };
    }
  }

  /**
   * Расчет цены через API
   */
  private async calculatePriceViaAPI(
    item: CartItem, 
    timeout: number
  ): Promise<PriceCalculationResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch('/api/price/doors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          selection: {
            style: item.style,
            model: item.model,
            finish: item.finish,
            color: item.color,
            width: item.width,
            height: item.height,
            hardware_kit: item.hardwareKitId ? { id: item.hardwareKitId } : undefined,
            handle: item.handleId ? { id: item.handleId } : undefined
          }
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Товар с указанными параметрами не найден'
          };
        }
        
        return {
          success: false,
          error: `Ошибка сервера: ${response.status}`
        };
      }

      const priceData = await response.json();
      
      if (!priceData.total) {
        return {
          success: false,
          error: 'Не удалось рассчитать цену'
        };
      }

      return {
        success: true,
        price: priceData.total,
        sku_1c: priceData.sku_1c,
        breakdown: priceData.breakdown
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Превышено время ожидания расчета цены'
        };
      }

      throw error;
    }
  }

  /**
   * Создание ключа для кэширования
   */
  private createCacheKey(item: CartItem): string {
    return JSON.stringify({
      style: item.style,
      model: item.model,
      finish: item.finish,
      color: item.color,
      width: item.width,
      height: item.height,
      hardwareKitId: item.hardwareKitId,
      handleId: item.handleId
    });
  }

  /**
   * Получение понятного сообщения об ошибке
   */
  private getErrorMessage(error: any): string {
    if (error.message) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }

    return 'Произошла неизвестная ошибка при расчете цены';
  }

  /**
   * Очистка кэша
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Кэш цен очищен');
  }

  /**
   * Получение статистики кэша
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Экспортируем singleton instance
export const priceRecalculationService = new PriceRecalculationService();
