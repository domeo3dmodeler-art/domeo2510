import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { getPropertyPhotos, structurePropertyPhotos } from '@/lib/property-photos';

const prisma = new PrismaClient();

// Кэш для фото
const photoCache = new Map<string, { data: any; timestamp: number }>();
const PHOTO_CACHE_TTL = 30 * 60 * 1000; // 30 минут для фото

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

      // Создаем мапу модель -> артикул поставщика
      const modelToSupplierSku = new Map<string, string>();
      products.forEach(product => {
        const properties = product.properties_data ?
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
        
        const modelName = properties['Domeo_Название модели для Web'];
        const supplierSku = properties['Артикул поставщика'];
        
        if (modelName && supplierSku && uncachedModels.includes(modelName)) {
          modelToSupplierSku.set(modelName, supplierSku);
        }
      });

      // Получаем фотографии из PropertyPhoto для каждой модели
      const photosByModel = new Map<string, any>();
      
      for (const [modelName, supplierSku] of modelToSupplierSku.entries()) {
        // Получаем фотографии для этой модели из PropertyPhoto
        const propertyPhotos = await getPropertyPhotos(
          'cmg50xcgs001cv7mn0tdyk1wo', // ID категории "Межкомнатные двери"
          'Артикул поставщика',
          supplierSku
        );

        // Структурируем фотографии в обложку и галерею
        const photoStructure = structurePropertyPhotos(propertyPhotos);
        
        photosByModel.set(modelName, {
          modelKey: supplierSku,
          photo: photoStructure.cover,
          photos: photoStructure,
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

    return NextResponse.json({
      ok: true,
      photos: results
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1800' // 30 минут кэш в браузере
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
