import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Кэширование
const completeDataCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

// DELETE - очистка кэша
export async function DELETE() {
  try {
    completeDataCache.clear();
    console.log('🧹 Кэш complete-data очищен');
    return NextResponse.json({ success: true, message: 'Кэш очищен' });
  } catch (error) {
    console.error('❌ Ошибка очистки кэша:', error);
    return NextResponse.json(
      { error: 'Ошибка очистки кэша' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const style = searchParams.get('style');

    const cacheKey = style || 'all';
    
    // Проверяем кэш
    const cached = completeDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ API complete-data - используем кэш');
      return NextResponse.json({
        ok: true,
        ...cached.data,
        cached: true
      });
    }

    console.log('🔍 API complete-data - загрузка данных для стиля:', style || 'все');

        // Получаем ВСЕ товары для полного списка моделей
        const products = await prisma.product.findMany({
          where: {
            catalog_category: {
              name: "Межкомнатные двери"
            },
            is_active: true
          },
          select: {
            id: true,
            sku: true,
            properties_data: true
          }
          // Убираем лимит для получения всех моделей
        });

    console.log(`📦 Загружено ${products.length} товаров из БД`);

    // Обработка данных
    const models: any[] = [];
    const styles = new Set<string>();

    products.forEach(product => {
      try {
        const properties = product.properties_data ?
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

        const model = properties['Domeo_Название модели для Web'];
        const productStyle = properties['Domeo_Стиль Web'];
        const productPhotos = properties.photos || [];

        if (model && productStyle) {
          // Фильтруем по стилю если указан
          if (style && productStyle !== style) {
            return;
          }

          styles.add(productStyle);

          // Проверяем, есть ли уже такая модель
          const existingModel = models.find(m => m.model === model);
          if (!existingModel) {
            models.push({
              model,
              style: productStyle,
              photo: productPhotos.length > 0 ? productPhotos[0] : null,
              products: [], // Добавляем массив товаров
              options: {
                finishes: [],
                colors: [],
                types: [],
                widths: [],
                heights: []
              }
            });
          }
          
          // Добавляем товар к модели
          const modelIndex = models.findIndex(m => m.model === model);
          if (modelIndex !== -1) {
            models[modelIndex].products.push({
              sku: product.sku,
              properties: properties
            });
          }
        }
      } catch (error) {
        console.warn(`Ошибка обработки товара ${product.sku}:`, error);
      }
    });

    const result = {
      models: models.sort((a, b) => a.model.localeCompare(b.model)),
      totalModels: models.length,
      styles: Array.from(styles),
      timestamp: Date.now()
    };

    // Сохраняем в кэш
    completeDataCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    console.log(`✅ API complete-data - найдено ${models.length} моделей`);

    return NextResponse.json({
      ok: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Ошибка API complete-data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complete data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
