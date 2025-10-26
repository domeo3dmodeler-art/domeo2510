import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Кэш для фотографий
const photosCache = new Map<string, { photos: string[], timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 минут (уменьшено с 30)

// Кэш для всех товаров (чтобы не делать запрос к БД каждый раз)
let allProductsCache: any[] | null = null;
let allProductsCacheTimestamp = 0;
const ALL_PRODUCTS_CACHE_TTL = 5 * 60 * 1000; // 5 минут (уменьшено с 10)

// Максимальный размер кэша фотографий
const MAX_PHOTOS_CACHE_SIZE = 50;

// DELETE - очистка кэша
export async function DELETE() {
  try {
    photosCache.clear();
    allProductsCache = null;
    allProductsCacheTimestamp = 0;
    console.log('🧹 Кэш photos очищен');
    return NextResponse.json({ success: true, message: 'Кэш photos очищен' });
  } catch (error) {
    console.error('❌ Ошибка очистки кэша photos:', error);
    return NextResponse.json(
      { error: 'Ошибка очистки кэша photos' },
      { status: 500 }
    );
  }
}

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
        },
        // Оптимизация: уменьшаем количество товаров и добавляем сортировку
        take: 200,
        orderBy: {
          created_at: 'desc'
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

    // Оптимизация: предварительно парсим все properties_data
    const parsedProducts = products.map(product => {
      try {
        const properties = product.properties_data ?
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
        
        return {
          ...product,
          parsedProperties: properties,
          productModel: properties['Domeo_Название модели для Web'],
          productArticle: properties['Артикул поставщика'],
          productPhotos: properties.photos || []
        };
      } catch (error) {
        console.warn(`Ошибка парсинга properties_data для товара ${product.sku}:`, error);
        return {
          ...product,
          parsedProperties: {},
          productModel: null,
          productArticle: null,
          productPhotos: []
        };
      }
    });

    // Точное совпадение модели
    for (const product of parsedProducts) {
      if (product.productModel === model && product.productPhotos.length > 0) {
        console.log(`✅ Найдена модель ${model} с артикулом ${product.productArticle} и ${product.productPhotos.length} фотографиями`);

        // Добавляем фотографии только если артикул еще не обработан
        if (product.productArticle && !seenArticles.has(product.productArticle)) {
          seenArticles.add(product.productArticle);

          // Берем первую фотографию
          if (product.productPhotos.length > 0) {
            console.log(`📸 Добавляем фотографию для артикула ${product.productArticle}: ${product.productPhotos[0]}`);
            photos.push(product.productPhotos[0]);
          }
        }

        break; // Берем первое найденное фото
      }
    }

    // Если не найдено точное совпадение, ищем по частичному совпадению
    if (photos.length === 0) {
      for (const product of parsedProducts) {
        // Частичное совпадение (модель содержит искомое название)
        if (product.productModel && product.productModel.includes(model) && product.productPhotos.length > 0) {
          console.log(`✅ Найдена модель ${model} (частичное совпадение) с артикулом ${product.productArticle} и ${product.productPhotos.length} фотографиями`);

          // Добавляем фотографии только если артикул еще не обработан
          if (product.productArticle && !seenArticles.has(product.productArticle)) {
            seenArticles.add(product.productArticle);

            // Берем первую фотографию
            if (product.productPhotos.length > 0) {
              console.log(`📸 Добавляем фотографию для артикула ${product.productArticle}: ${product.productPhotos[0]}`);
              photos.push(product.productPhotos[0]);
            }
          }

          break;
        }
      }
    }

    // Не добавляем заглушки - используем только фото из базы данных

    // Сохраняем в кэш с ограничением размера
    if (photosCache.size >= MAX_PHOTOS_CACHE_SIZE) {
      // Удаляем самый старый элемент
      const oldestKey = photosCache.keys().next().value;
      photosCache.delete(oldestKey);
    }
    
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
