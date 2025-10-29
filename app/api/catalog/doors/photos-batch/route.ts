import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { getPropertyPhotos, structurePropertyPhotos } from '@/lib/property-photos';

const prisma = new PrismaClient();

// Кэш для фото
const photoCache = new Map<string, { data: any; timestamp: number }>();
const PHOTO_CACHE_TTL = 30 * 60 * 1000; // 30 минут для фото

// DELETE - очистка кэша
export async function DELETE() {
  try {
    photoCache.clear();
    console.log('🧹 Кэш photos-batch очищен');
    return NextResponse.json({ success: true, message: 'Кэш photos-batch очищен' });
  } catch (error) {
    console.error('❌ Ошибка очистки кэша photos-batch:', error);
    return NextResponse.json(
      { error: 'Ошибка очистки кэша' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { models } = await req.json();
    
    if (!models || !Array.isArray(models)) {
      return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
    }

    console.log('📸 Batch загрузка фото для моделей:', models.length);

    const results: Record<string, any> = {};
    const uncachedModels: string[] = [];

    // Проверяем кэш для каждой модели
    for (const model of models) {
      const cacheKey = `photo_${model}`;
      const cached = photoCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < PHOTO_CACHE_TTL) {
        results[model] = cached.data;
      } else {
        uncachedModels.push(model);
      }
    }

    console.log(`⚡ Из кэша: ${models.length - uncachedModels.length}, загружаем: ${uncachedModels.length}`);

    // Загружаем только не кэшированные модели
    if (uncachedModels.length > 0) {
      // Получаем все товары для определения артикулов поставщика для каждой модели
      const products = await prisma.product.findMany({
        where: {
          catalog_category: {
            name: "Межкомнатные двери"
          }
        },
        select: {
          properties_data: true
        }
      });

      console.log(`📦 Получено товаров из БД: ${products.length}`);

      // Создаем мапу модель -> артикул (для поиска фото по артикулу)
      const modelToValue = new Map<string, string>();
      
      for (const product of products) {
        try {
          let properties: any = {};
          
          if (product.properties_data) {
            if (typeof product.properties_data === 'string') {
              try {
                // Проверяем, что строка не пустая
                if (product.properties_data.trim().length === 0) {
                  continue;
                }
                properties = JSON.parse(product.properties_data);
              } catch (parseError) {
                console.error('❌ ОШИБКА ПАРСИНГА JSON:', parseError);
                console.error('🔍 Тип данных:', typeof product.properties_data);
                console.error('🔍 Длина строки:', product.properties_data?.length);
                console.error('🔍 Первые 200 символов:', product.properties_data?.substring(0, 200));
                continue; // Пропускаем этот товар
              }
            } else if (typeof product.properties_data === 'object') {
              properties = product.properties_data;
            } else {
              continue; // Пропускаем невалидные данные
            }
          }
          
          const modelName = properties['Domeo_Название модели для Web'];
          const article = properties['Артикул поставщика'];
          
          if (modelName && uncachedModels.includes(modelName)) {
            // Сохраняем артикул, а не название модели
            modelToValue.set(modelName, article || modelName);
          }
        } catch (error) {
          console.error('Ошибка обработки товара:', error);
          // Пропускаем этот товар
        }
      }

      // Получаем фотографии из PropertyPhoto для каждой модели
      const photosByModel = new Map<string, any>();
      
      for (const [modelName, propertyValue] of modelToValue.entries()) {
        // Приводим propertyValue к нижнему регистру для поиска
        const normalizedPropertyValue = propertyValue.toLowerCase();
        
        console.log(`🔍 Ищем фото для модели "${modelName}" по артикулу "${propertyValue}" (normalized: "${normalizedPropertyValue}")`);
        
        // Получаем фотографии для этой модели из PropertyPhoto
        // Сначала ищем по "Артикул поставщика" (т.к. фото привязаны по артикулу)
        let propertyPhotos = await getPropertyPhotos(
          'cmg50xcgs001cv7mn0tdyk1wo', // ID категории "Межкомнатные двери"
          'Артикул поставщика',
          normalizedPropertyValue
        );
        
        console.log(`📸 Найдено ${propertyPhotos.length} фото для базового артикула "${propertyValue}"`);
        
        // Всегда ищем фото для вариантов артикула (d2 → d2_1, d2_2, ...)
        console.log(`🔍 Ищем фото для вариантов артикула "${propertyValue}"`);
        
        // Ищем фото для вариантов: d2 → d2_1, d2_2, d2_3 и т.д.
        for (let i = 1; i <= 10; i++) {
          const variantArticle = `${propertyValue}_${i}`;
          const variantPhotos = await getPropertyPhotos(
            'cmg50xcgs001cv7mn0tdyk1wo',
            'Артикул поставщика',
            variantArticle.toLowerCase()
          );
          
          if (variantPhotos.length > 0) {
            console.log(`  ✅ Найдено ${variantPhotos.length} фото для варианта "${variantArticle}"`);
            propertyPhotos.push(...variantPhotos);
          }
        }
        
        // Если не найдено ни по артикулу, ни по вариантам, ищем по "Domeo_Название модели для Web"
        if (propertyPhotos.length === 0) {
          console.log(`🔍 Фото не найдено, пробуем поиск по названию модели`);
          propertyPhotos = await getPropertyPhotos(
            'cmg50xcgs001cv7mn0tdyk1wo', // ID категории "Межкомнатные двери"
            'Domeo_Название модели для Web',
            normalizedPropertyValue
          );
        }
        
        console.log(`📸 Всего найдено ${propertyPhotos.length} фото для "${modelName}"`);

        // Структурируем фотографии в обложку и галерею
        const photoStructure = structurePropertyPhotos(propertyPhotos);
        
        console.log(`📸 Фото для ${modelName}:`, {
          cover: photoStructure.cover,
          galleryCount: photoStructure.gallery.length
        });
        
        // Путь из БД может быть с префиксом /uploads/ или без него
        // Нужно привести к единому формату: /uploads/...
        let finalPhotoPath = null;
        if (photoStructure.cover) {
          if (photoStructure.cover.startsWith('/uploads/')) {
            finalPhotoPath = photoStructure.cover;
          } else {
            finalPhotoPath = `/uploads/${photoStructure.cover}`;
          }
        }
        
        // То же для галереи
        const finalGalleryPaths = photoStructure.gallery.map(p => {
          if (p.startsWith('/uploads/')) return p;
          return `/uploads/${p}`;
        });
        
        console.log(`📸 Формируем результат для ${modelName}:`, {
          'cover из БД': photoStructure.cover,
          'final photo path': finalPhotoPath,
          'starts with /uploads': finalPhotoPath?.startsWith('/uploads')
        });
        
        photosByModel.set(modelName, {
          modelKey: modelName, // Используем полное имя модели для поиска фото
          photo: finalPhotoPath,
          photos: {
            cover: finalPhotoPath,
            gallery: finalGalleryPaths
          },
          hasGallery: photoStructure.gallery.length > 0
        });
      }

      // Формируем результаты и сохраняем в кэш
      for (const model of uncachedModels) {
        const modelData = photosByModel.get(model);
        const result = {
          model,
          modelKey: modelData?.modelKey || '',
          photo: modelData?.photo || null,
          photos: modelData?.photos || { cover: null, gallery: [] },
          hasGallery: modelData?.hasGallery || false
        };
        
        results[model] = result;
        
        // Сохраняем в кэш
        const cacheKey = `photo_${model}`;
        photoCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
    }

    console.log('✅ Batch загрузка завершена');
    console.log('📊 Пример результата:', {
      'Первая модель': Object.keys(results)[0],
      'Данные фото': results[Object.keys(results)[0]]
    });
    
    console.log('🔍 Все результаты для моделей:', {
      'models requested': models,
      'models with results': Object.keys(results),
      'first result sample': results[Object.keys(results)[0]]
    });

    return NextResponse.json({
      ok: true,
      photos: results
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Error in batch photo loading:', error);
    return NextResponse.json(
      { error: "Ошибка загрузки фото" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
