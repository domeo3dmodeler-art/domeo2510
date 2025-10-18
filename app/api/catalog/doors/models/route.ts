import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Кэш для моделей
const modelsCache = new Map<string, { models: any[], timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 минут

// Кэш для всех товаров (чтобы не делать запрос к БД каждый раз)
let allProductsCache: any[] | null = null;
let allProductsCacheTimestamp = 0;
const ALL_PRODUCTS_CACHE_TTL = 10 * 60 * 1000; // 10 минут

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const style = searchParams.get('style');

    // Проверяем кэш
    const cacheKey = style || 'all';
    const cached = modelsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ok: true,
        models: cached.models,
        cached: true
      });
    }

    console.log('🔍 API models - загрузка моделей для стиля:', style || 'все');

    // Получаем товары из кэша или из БД
    let products;
    if (allProductsCache && Date.now() - allProductsCacheTimestamp < ALL_PRODUCTS_CACHE_TTL) {
      console.log('📦 API models - используем кэш товаров');
      products = allProductsCache;
    } else {
      console.log('📦 API models - загружаем товары из БД');
      products = await prisma.product.findMany({
        where: {
          catalog_category: {
            name: "Межкомнатные двери"
          }
        },
        select: {
          properties_data: true
        }
      });

      // Сохраняем в кэш
      allProductsCache = products;
      allProductsCacheTimestamp = Date.now();
      console.log('📦 API models - товары сохранены в кэш');
    }

    // Извлекаем уникальные модели и стили из properties_data
    const modelStyleMap = new Map<string, string>();

    products.forEach(product => {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

      const model = properties['Domeo_Название модели для Web'];
      const productStyle = properties['Domeo_Стиль Web'];

      if (model && productStyle) {
        // Если указан стиль, фильтруем только по этому стилю
        if (!style || productStyle === style) {
          modelStyleMap.set(model, productStyle);
        }
      }
    });

    const models = Array.from(modelStyleMap.entries()).map(([model, style]) => ({
      model,
      style
    })).sort((a, b) => a.model.localeCompare(b.model));

    // Сохраняем в кэш
    modelsCache.set(cacheKey, {
      models,
      timestamp: Date.now()
    });

    console.log(`✅ API models - найдено ${models.length} моделей для стиля ${style || 'все'}`);

    return NextResponse.json({
      ok: true,
      models: models,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching door models:', error);
    return NextResponse.json(
      { error: "Ошибка получения моделей" },
      { status: 500 }
    );
  }
}