import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Кэш для фотографий
const photosCache = new Map<string, { photos: string[], timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

// Кэш для всех товаров (чтобы не делать запрос к БД каждый раз)
let allProductsCache: any[] | null = null;
let allProductsCacheTimestamp = 0;
const ALL_PRODUCTS_CACHE_TTL = 10 * 60 * 1000; // 10 минут

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

    // Проверяем кэш
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

    console.log('🔍 API photos - поиск фотографий для модели:', model);

    // Получаем товары из кэша или из БД
    let products;
    if (allProductsCache && Date.now() - allProductsCacheTimestamp < ALL_PRODUCTS_CACHE_TTL) {
      console.log('📦 API photos - используем кэш товаров');
      products = allProductsCache;
    } else {
      console.log('📦 API photos - загружаем товары из БД');
      products = await prisma.product.findMany({
        where: {
          catalog_category: {
            name: "Межкомнатные двери"
          }
        },
        select: {
          id: true,
          sku: true,
          name: true,
          properties_data: true
        }
      });

      // Сохраняем в кэш
      allProductsCache = products;
      allProductsCacheTimestamp = Date.now();
      console.log('📦 API photos - товары сохранены в кэш');
    }

    // Ищем фотографии для модели
    const photos: string[] = [];
    const seenArticles = new Set<string>();

    for (const product of products) {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

      const productModel = properties['Domeo_Название модели для Web'];
      const productArticle = properties['Артикул поставщика'];
      const productPhotos = properties.photos || [];

      // Точное совпадение модели
      if (productModel === model && productPhotos.length > 0) {
        console.log(`✅ Найдена модель ${model} с артикулом ${productArticle} и ${productPhotos.length} фотографиями`);

        // Добавляем фотографии только если артикул еще не обработан
        if (productArticle && !seenArticles.has(productArticle)) {
          seenArticles.add(productArticle);

          // Берем первую фотографию
          if (productPhotos.length > 0) {
            console.log(`📸 Добавляем фотографию для артикула ${productArticle}: ${productPhotos[0]}`);
            photos.push(productPhotos[0]);
          }
        }

        break; // Берем первое найденное фото
      }
    }

    // Если не найдено точное совпадение, ищем по частичному совпадению
    if (photos.length === 0) {
      for (const product of products) {
        const properties = product.properties_data ?
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

        const productModel = properties['Domeo_Название модели для Web'];
        const productArticle = properties['Артикул поставщика'];
        const productPhotos = properties.photos || [];

        // Частичное совпадение (модель содержит искомое название)
        if (productModel && productModel.includes(model) && productPhotos.length > 0) {
          console.log(`✅ Найдена модель ${model} (частичное совпадение) с артикулом ${productArticle} и ${productPhotos.length} фотографиями`);

          // Добавляем фотографии только если артикул еще не обработан
          if (productArticle && !seenArticles.has(productArticle)) {
            seenArticles.add(productArticle);

            // Берем первую фотографию
            if (productPhotos.length > 0) {
              console.log(`📸 Добавляем фотографию для артикула ${productArticle}: ${productPhotos[0]}`);
              photos.push(productPhotos[0]);
            }
          }

          break;
        }
      }
    }

    // Сохраняем в кэш
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
    console.error('❌ API photos - ОШИБКА:', error);
    return NextResponse.json(
      { error: "Ошибка получения фотографий", details: (error as Error).message },
      { status: 500 }
    );
  }
}
