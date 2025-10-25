import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Оптимизированный кэш для фотографий
const photosCache = new Map<string, { photos: string[], timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 минут

// Кэш для моделей с фотографиями
const modelsCache = new Map<string, { model: string, photos: string[], timestamp: number }>();
const MODELS_CACHE_TTL = 30 * 60 * 1000; // 30 минут

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const model = searchParams.get('model');
    const style = searchParams.get('style');

    if (!model) {
      return NextResponse.json(
        { error: "Не указана модель" },
        { status: 400 }
      );
    }

    // Проверяем кэш фотографий
    const cacheKey = `${model}_${style || 'all'}`;
    const cached = photosCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ok: true,
        model,
        style,
        photos: cached.photos,
        count: cached.photos.length,
        cached: true
      });
    }

    console.log('🔍 API photos-optimized - поиск фотографий для модели:', model);

    // Сначала проверяем кэш моделей
    let photos: string[] = [];
    
    // Ищем в кэше моделей
    for (const [cachedModel, cachedData] of modelsCache.entries()) {
      if (Date.now() - cachedData.timestamp < MODELS_CACHE_TTL) {
        if (cachedModel === model || cachedModel.includes(model)) {
          photos = cachedData.photos;
          console.log(`✅ Найдено в кэше моделей: ${cachedModel} с ${photos.length} фотографиями`);
          break;
        }
      }
    }

    // Если не найдено в кэше, ищем в БД
    if (photos.length === 0) {
      console.log('📦 API photos-optimized - поиск в БД');
      
      // Оптимизированный запрос: ищем только товары с фотографиями
      const products = await prisma.product.findMany({
        where: {
          catalog_category: {
            name: "Межкомнатные двери"
          },
          properties_data: {
            not: null,
            contains: '"photos":'
          }
        },
        select: {
          id: true,
          sku: true,
          name: true,
          properties_data: true
        },
        take: 100, // Уменьшаем количество
        orderBy: {
          created_at: 'desc'
        }
      });

      console.log(`📦 Найдено ${products.length} товаров с фотографиями`);

      // Обрабатываем товары
      const seenArticles = new Set<string>();
      
      for (const product of products) {
        try {
          const properties = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;

          const productModel = properties['Domeo_Название модели для Web'];
          const productArticle = properties['Артикул поставщика'];
          const productPhotos = properties.photos || [];

          // Точное совпадение модели
          if (productModel === model && productPhotos.length > 0) {
            console.log(`✅ Найдена модель ${model} с артикулом ${productArticle} и ${productPhotos.length} фотографиями`);

            if (productArticle && !seenArticles.has(productArticle)) {
              seenArticles.add(productArticle);
              photos.push(productPhotos[0]);
            }
            break;
          }
        } catch (error) {
          console.warn(`Ошибка обработки товара ${product.sku}:`, error);
        }
      }

      // Если не найдено точное совпадение, ищем частичное
      if (photos.length === 0) {
        for (const product of products) {
          try {
            const properties = typeof product.properties_data === 'string' 
              ? JSON.parse(product.properties_data) 
              : product.properties_data;

            const productModel = properties['Domeo_Название модели для Web'];
            const productArticle = properties['Артикул поставщика'];
            const productPhotos = properties.photos || [];

            // Частичное совпадение
            if (productModel && productModel.includes(model) && productPhotos.length > 0) {
              console.log(`✅ Найдена модель ${model} (частичное совпадение) с артикулом ${productArticle}`);

              if (productArticle && !seenArticles.has(productArticle)) {
                seenArticles.add(productArticle);
                photos.push(productPhotos[0]);
              }
              break;
            }
          } catch (error) {
            console.warn(`Ошибка обработки товара ${product.sku}:`, error);
          }
        }
      }

      // Сохраняем в кэш моделей
      if (photos.length > 0) {
        modelsCache.set(model, {
          model,
          photos,
          timestamp: Date.now()
        });
      }
    }

    // Сохраняем в кэш фотографий
    photosCache.set(cacheKey, {
      photos,
      timestamp: Date.now()
    });

    return NextResponse.json({
      ok: true,
      model,
      style,
      photos,
      count: photos.length,
      cached: false
    });

  } catch (error) {
    console.error('❌ API photos-optimized - ОШИБКА:', error);
    return NextResponse.json(
      { error: "Ошибка получения фотографий", details: (error as Error).message },
      { status: 500 }
    );
  }
}
