import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
// Импортируем функции напрямую для совместимости
function structurePhotos(photos: string[]) {
  if (photos.length === 0) {
    return { cover: null, gallery: [] };
  }
  
  // Проверяем, есть ли фото с суффиксами _N (галерея)
  const hasGalleryPhotos = photos.some(photo => {
    const fileName = photo.split('/').pop() || photo;
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    const parts = nameWithoutExt.split('_');
    const lastPart = parts[parts.length - 1];
    return /^\d+$/.test(lastPart); // Последняя часть - это число
  });
  
  // Если есть фото с суффиксами _N, это галерея - НЕ убираем дубликаты
  if (hasGalleryPhotos) {
    // Находим базовое имя для фото с суффиксами _N
    const galleryBaseNames = new Set();
    photos.forEach(photo => {
      const fileName = photo.split('/').pop() || photo;
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split('_');
      const lastPart = parts[parts.length - 1];
      
      if (/^\d+$/.test(lastPart)) {
        // Это фото с суффиксом _N, извлекаем базовое имя (последняя часть перед _N)
        const baseName = parts[parts.length - 2];
        galleryBaseNames.add(baseName);
      }
    });
    
    // Разделяем на обложку и галерею
    const coverPhotos = photos.filter(photo => {
      const fileName = photo.split('/').pop() || photo;
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split('_');
      const lastPart = parts[parts.length - 1];
      
      // Если это фото с суффиксом _N, не включаем в обложку
      if (/^\d+$/.test(lastPart)) {
        return false;
      }
      
      // Если это фото без суффикса, проверяем, есть ли для него галерея
      const baseName = parts[parts.length - 1]; // Последняя часть
      return !galleryBaseNames.has(baseName);
    });
    
    const galleryPhotos = photos.filter(photo => {
      const fileName = photo.split('/').pop() || photo;
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split('_');
      const lastPart = parts[parts.length - 1];
      
      // Если это фото с суффиксом _N, включаем в галерею
      if (/^\d+$/.test(lastPart)) {
        return true;
      }
      
      // Если это фото без суффикса, но есть галерея с таким же базовым именем, включаем в галерею
      const baseName = parts[parts.length - 1]; // Последняя часть
      return galleryBaseNames.has(baseName);
    });
    
    return {
      cover: galleryPhotos[0] || null, // Первое фото из галереи становится обложкой
      gallery: galleryPhotos.slice(1) // Убираем первое фото из галереи, так как оно уже обложка
    };
  }
  
  // Если нет фото с суффиксами _N, убираем дубликаты и проверяем уникальность
  const uniquePhotos = [...new Set(photos)];
  const baseNames = new Set();
  uniquePhotos.forEach(photo => {
    const fileName = photo.split('/').pop() || photo;
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    const parts = nameWithoutExt.split('_');
    const baseName = parts[parts.length - 1]; // Последняя часть
    baseNames.add(baseName);
  });
  
  // Если только одно уникальное фото (по базовому имени)
  if (baseNames.size === 1) {
    return { cover: uniquePhotos[0], gallery: [] };
  }
  
  // Если несколько уникальных фото - показываем галерею
  return {
    cover: uniquePhotos[0],
    gallery: uniquePhotos.slice(1)
  };
}

function parsePhotoFileName(fileName: string) {
  // Извлекаем имя файла из полного пути
  const fileNameOnly = fileName.split('/').pop() || fileName;
  const nameWithoutExt = fileNameOnly.replace(/\.[^/.]+$/, "");
  
  // Проверяем, есть ли номер в конце (_1, _2, etc.)
  const match = nameWithoutExt.match(/^(.+)_(\d+)$/);
  
  if (match) {
    return {
      fileName,
      isCover: false,
      number: parseInt(match[2]),
      baseName: match[1]
    };
  } else {
    return {
      fileName,
      isCover: true,
      number: null,
      baseName: nameWithoutExt
    };
  }
}

function getCoverPhoto(photoStructure: { cover: string | null; gallery: string[] }) {
  return photoStructure.cover;
}

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
          if (!modelMap.has(model)) {
            modelMap.set(model, {
              model,
              style: productStyle,
              photos: productPhotos, // Берем фото только из первого товара модели
              products: []
            });
          }
          
          // Добавляем товар к модели (фото уже установлены из первого товара)
          const modelData = modelMap.get(model);
          modelData.products.push({
            sku: product.sku,
            properties: properties
          });
        }
      } catch (error) {
        console.warn(`Ошибка обработки товара ${product.sku}:`, error);
      }
    });

    // Теперь структурируем фото для каждой модели
    modelMap.forEach((modelData) => {
      // Структурируем фото для получения обложки и галереи
      const photoStructure = structurePhotos(modelData.photos);
      const coverPhoto = getCoverPhoto(photoStructure);

      models.push({
        model: modelData.model,
        style: modelData.style,
        photo: coverPhoto, // Только обложка для каталога
        photos: photoStructure, // Полная структура для центрального отображения
        hasGallery: photoStructure.gallery.length > 0, // Флаг наличия галереи
        products: modelData.products, // Добавляем массив товаров
        options: {
          finishes: [],
          colors: [],
          types: [],
          widths: [],
          heights: []
        }
      });
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
