import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Кэш для моделей с фото
const modelsWithPhotosCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 минут - увеличиваем время кэширования

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const style = searchParams.get('style');

    // Проверяем кэш
    const cacheKey = style || 'all';
    const cached = modelsWithPhotosCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ API models-with-photos - используем кэш');
      return NextResponse.json({
        ok: true,
        models: cached.data,
        cached: true
      });
    }

    console.log('🔍 API models-with-photos - загрузка моделей с фото для стиля:', style || 'все');

    // Оптимизированный запрос к БД с фильтрацией на уровне БД
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: "Межкомнатные двери"
        },
        is_active: true // Добавляем фильтр активных товаров
      },
      select: {
        properties_data: true
      },
      orderBy: {
        created_at: 'desc' // Сортируем по дате создания для консистентности
      }
    });

    // Обрабатываем данные и создаем карту моделей с фото
    const modelPhotoMap = new Map<string, { model: string, style: string, photo: string | null }>();

    products.forEach(product => {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

      const model = properties['Domeo_Название модели для Web'];
      const productStyle = properties['Domeo_Стиль Web'];
      const productArticle = properties['Артикул поставщика'];
      const productPhotos = properties.photos || [];

      if (model && productStyle) {
        // Если указан стиль, фильтруем только по этому стилю
        if (!style || productStyle === style) {
          // Берем первую фотографию для модели
          const photo = productPhotos.length > 0 ? productPhotos[0] : null;
          
          // Сохраняем только если модель еще не обработана или у нас есть фото
          if (!modelPhotoMap.has(model) || photo) {
            modelPhotoMap.set(model, {
              model,
              style: productStyle,
              photo
            });
          }
        }
      }
    });

    const models = Array.from(modelPhotoMap.values())
      .sort((a, b) => a.model.localeCompare(b.model));

    // Сохраняем в кэш
    modelsWithPhotosCache.set(cacheKey, {
      data: models,
      timestamp: Date.now()
    });

    console.log(`✅ API models-with-photos - найдено ${models.length} моделей с фото для стиля ${style || 'все'}`);

    return NextResponse.json({
      ok: true,
      models: models,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching door models with photos:', error);
    return NextResponse.json(
      { error: "Ошибка получения моделей с фото" },
      { status: 500 }
    );
  }
}
