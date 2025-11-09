import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';
import { apiSuccess, apiError, withErrorHandling } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/middleware';
import { getAuthenticatedUser } from '@/lib/auth/request-helpers';

// Кэш для моделей
const modelsCache = new Map<string, { models: any[], timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 минут

// Кэш для всех товаров (чтобы не делать запрос к БД каждый раз)
let allProductsCache: Array<{
  properties_data: unknown;
}> | null = null;
let allProductsCacheTimestamp = 0;
const ALL_PRODUCTS_CACHE_TTL = 10 * 60 * 1000; // 10 минут

async function getHandler(
  req: NextRequest,
  user: ReturnType<typeof getAuthenticatedUser>
): Promise<NextResponse> {
  const loggingContext = getLoggingContextFromRequest(req);
  const { searchParams } = new URL(req.url);
  const style = searchParams.get('style');

  // Проверяем кэш
  const cacheKey = style || 'all';
  const cached = modelsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return apiSuccess({
      models: cached.models,
      cached: true
    });
  }

  logger.debug('API models - загрузка моделей для стиля', 'catalog/doors/models/GET', {
    style: style || 'все'
  }, loggingContext);

  // Получаем товары из кэша или из БД
  let products;
  if (allProductsCache && Date.now() - allProductsCacheTimestamp < ALL_PRODUCTS_CACHE_TTL) {
    logger.debug('API models - используем кэш товаров', 'catalog/doors/models/GET', {}, loggingContext);
    products = allProductsCache;
  } else {
    logger.debug('API models - загружаем товары из БД', 'catalog/doors/models/GET', {}, loggingContext);
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
    logger.debug('API models - товары сохранены в кэш', 'catalog/doors/models/GET', {
      productsCount: products.length
    }, loggingContext);
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

  logger.info('API models - найдено моделей', 'catalog/doors/models/GET', {
    modelsCount: models.length,
    style: style || 'все'
  }, loggingContext);

  return apiSuccess({
    models: models,
    cached: false
  });
}

export const GET = withErrorHandling(
  requireAuth(getHandler),
  'catalog/doors/models/GET'
);