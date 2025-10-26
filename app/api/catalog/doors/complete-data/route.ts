import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { getPropertyPhotos, structurePropertyPhotos } from '../../../../../lib/property-photos';
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

    // Сначала собираем все товары по моделям
    const modelMap = new Map<string, any>();

    products.forEach(product => {
      try {
        const properties = product.properties_data ?
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

            // Используем "Артикул поставщика" как ключ для группировки, но "Domeo_Название модели для Web" как название модели
            const supplierSku = properties['Артикул поставщика'];
            const modelName = properties['Domeo_Название модели для Web'];
            const productStyle = properties['Domeo_Стиль Web'] || 'Классика'; // По умолчанию "Классика"

            // Проверяем, что supplierSku является строкой
            const modelKey = typeof supplierSku === 'string' ? supplierSku : String(supplierSku || '');
            const displayName = typeof modelName === 'string' ? modelName : modelKey; // Используем название модели или fallback к ключу
            const styleString = typeof productStyle === 'string' ? productStyle : String(productStyle || 'Классика');

            if (modelKey && modelKey.trim() !== '') {
          // Фильтруем по стилю если указан
              if (style && styleString !== style) {
            return;
          }

              styles.add(styleString);

          // Проверяем, есть ли уже такая модель
              if (!modelMap.has(modelKey)) {
                modelMap.set(modelKey, {
                  model: displayName, // Используем название модели для отображения
                  modelKey: modelKey, // Сохраняем ключ для поиска фото
                  style: styleString,
                  products: []
                });
              }

              // Добавляем товар к модели
              const modelData = modelMap.get(modelKey);
              modelData.products.push({
                sku: product.sku,
                properties: properties
              });
            }
          } catch (error) {
            console.warn(`Ошибка обработки товара ${product.sku}:`, error);
          }
        });

        // Теперь структурируем фото для каждой модели используя новую логику property_photos
        const modelPromises = Array.from(modelMap.entries()).map(async ([modelKey, modelData]) => {
          console.log(`🔍 Получаем фото для модели: ${modelData.model} (ключ: ${modelKey})`);
          
          // Получаем полное значение "Domeo_Название модели для Web" из первого товара модели
          const firstProduct = modelData.products[0];
          const fullModelName = firstProduct?.properties?.['Domeo_Название модели для Web'] || modelKey;
          
          console.log(`🔍 Ищем фото для полного названия: ${fullModelName}`);
          
          // Получаем фото для этой модели из property_photos
          // Используем "Domeo_Название модели для Web" как свойство, а полное значение как значение
          const modelPhotos = await getPropertyPhotos(
            'cmg50xcgs001cv7mn0tdyk1wo', // ID категории "Межкомнатные двери"
            'Domeo_Название модели для Web',        // Свойство для поиска
            fullModelName                     // Значение свойства (полное название модели)
          );

          console.log(`📸 Найдено ${modelPhotos.length} фото для ${modelData.model}`);
          console.log(`📸 Детали фото для ${modelData.model}:`, modelPhotos.map(p => ({ 
            photoType: p.photoType, 
            photoPath: p.photoPath,
            propertyValue: p.propertyValue 
          })));

          const photoStructure = structurePropertyPhotos(modelPhotos);
          const hasGallery = photoStructure.gallery.length > 0;

          console.log(`📋 Структура фото для ${modelData.model}: обложка=${photoStructure.cover ? 'есть' : 'нет'}, галерея=${photoStructure.gallery.length}`);
          console.log(`📋 Детали структуры фото для ${modelData.model}:`, photoStructure);

          const result = {
            model: modelData.model,
            modelKey: modelData.modelKey, // Добавляем ключ для поиска фото
            style: modelData.style,
            photo: photoStructure.cover, // Только обложка для каталога
            photos: photoStructure,      // Полная структура для центрального отображения
            hasGallery: hasGallery,      // Флаг наличия галереи
            products: modelData.products, // Добавляем массив товаров
              options: {
                finishes: [],
                colors: [],
                types: [],
                widths: [],
                heights: []
              }
          };
          
          console.log(`📤 Возвращаем данные для ${modelData.model}:`, {
            model: result.model,
            modelKey: result.modelKey,
            photo: result.photo,
            photos: result.photos,
            hasGallery: result.hasGallery
          });
          
          return result;
        });

        const modelResults = await Promise.all(modelPromises);
        models.push(...modelResults);

    const result = {
      models: models.sort((a, b) => {
        const modelA = a.model || '';
        const modelB = b.model || '';
        return modelA.localeCompare(modelB);
      }),
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
