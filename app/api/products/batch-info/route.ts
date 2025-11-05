import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

// GET /api/products/batch-info?ids=id1,id2,id3 - Получить информацию о товарах по ID
export async function GET(req: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json({ error: 'Не указаны ID товаров' }, { status: 400 });
    }
    
    const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean);
    
    if (ids.length === 0) {
      return NextResponse.json({ products: [] });
    }
    
    logger.debug('Загрузка информации о товарах', 'products/batch-info/GET', { count: ids.length }, loggingContext);
    
    // Получаем товары с информацией о категории
    const products = await prisma.product.findMany({
      where: {
        id: { in: ids }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        catalog_category: {
          select: {
            id: true,
            name: true
          }
        },
        properties_data: true
      }
    });
    
    // Форматируем данные
    const formattedProducts = products.map(product => {
      let props: any = {};
      try {
        props = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data || {};
      } catch (e) {
        logger.warn('Ошибка парсинга свойств товара', 'products/batch-info/GET', { productId: product.id }, loggingContext);
      }
      
      // Определяем является ли товар ручкой по категории
      const isHandle = product.catalog_category?.name === 'Ручки';
      
      // Для ручек используем специальное название из properties_data
      let displayName = product.name;
      if (isHandle) {
        displayName = props['Domeo_наименование для Web'] 
          || props['Domeo_наименование ручки_1С'] 
          || product.name;
      }
      
      return {
        id: product.id,
        name: displayName,
        sku: product.sku,
        isHandle,
        categoryName: product.catalog_category?.name || ''
      };
    });
    
    return NextResponse.json({ products: formattedProducts });
    
  } catch (error: any) {
    logger.error('Ошибка загрузки информации о товарах', 'products/batch-info/GET', { 
      error: error.message,
      stack: error.stack
    }, loggingContext);
    
    return NextResponse.json(
      { error: 'Ошибка при загрузке информации о товарах', details: error.message },
      { status: 500 }
    );
  }
}

