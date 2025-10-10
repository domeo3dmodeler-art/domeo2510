import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { DOOR_PROPERTIES } from '../../../../lib/constants/door-properties';
import { safeLog, logDebug } from '../../../../lib/utils/logger';

const prisma = new PrismaClient();

function getPropertyValue(properties: any, propertyKey: string): string | undefined {
  return properties[propertyKey];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const style = searchParams.get('style');
    const model = searchParams.get('model');
    const color = searchParams.get('color');
    const coatingType = searchParams.get('coatingType');
    const constructionType = searchParams.get('constructionType');
    const factoryCollection = searchParams.get('factoryCollection');
    const width = searchParams.get('width');
    const height = searchParams.get('height');
    const thickness = searchParams.get('thickness');

    logDebug('API products - загрузка товаров с фильтрами:', {
      style, model, color, coatingType, constructionType, factoryCollection, width, height, thickness
    });

    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        },
        is_active: true
      },
      select: {
        id: true,
        sku: true,
        name: true,
        base_price: true,
        properties_data: true,
        images: {
          select: {
            url: true,
            alt_text: true
          }
        }
      }
    });

    safeLog(`📦 Загружено ${products.length} товаров из БД`);

    // Фильтрация товаров по свойствам
    const filteredProducts = products.filter(product => {
      const properties = JSON.parse(product.properties_data || '{}');
      
      if (style && getPropertyValue(properties, DOOR_PROPERTIES.STYLE) !== style) return false;
      if (model && !getPropertyValue(properties, DOOR_PROPERTIES.MODEL)?.includes(model)) return false;
      if (color && getPropertyValue(properties, DOOR_PROPERTIES.COLOR) !== color) return false;
      if (coatingType && getPropertyValue(properties, DOOR_PROPERTIES.COATING_TYPE) !== coatingType) return false;
      if (constructionType && getPropertyValue(properties, DOOR_PROPERTIES.CONSTRUCTION_TYPE) !== constructionType) return false;
      if (factoryCollection && getPropertyValue(properties, DOOR_PROPERTIES.FACTORY_COLLECTION) !== factoryCollection) return false;
      if (width && getPropertyValue(properties, DOOR_PROPERTIES.WIDTH_MM) !== width) return false;
      if (height && getPropertyValue(properties, DOOR_PROPERTIES.HEIGHT_MM) !== height) return false;
      if (thickness && getPropertyValue(properties, DOOR_PROPERTIES.THICKNESS_MM) !== thickness) return false;

      return true;
    });

    safeLog(`🔍 После фильтрации: ${filteredProducts.length} товаров`);

    // Преобразование в формат для конфигуратора
    const formattedProducts = filteredProducts.map(product => {
      const properties = JSON.parse(product.properties_data || '{}');
      
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        model: getPropertyValue(properties, DOOR_PROPERTIES.MODEL) || '',
        style: getPropertyValue(properties, DOOR_PROPERTIES.STYLE) || '',
        color: getPropertyValue(properties, DOOR_PROPERTIES.COLOR) || '',
        coatingType: getPropertyValue(properties, DOOR_PROPERTIES.COATING_TYPE) || '',
        constructionType: getPropertyValue(properties, DOOR_PROPERTIES.CONSTRUCTION_TYPE) || '',
        factoryCollection: getPropertyValue(properties, DOOR_PROPERTIES.FACTORY_COLLECTION) || '',
        width: Number(getPropertyValue(properties, DOOR_PROPERTIES.WIDTH_MM)) || 0,
        height: Number(getPropertyValue(properties, DOOR_PROPERTIES.HEIGHT_MM)) || 0,
        thickness: Number(getPropertyValue(properties, DOOR_PROPERTIES.THICKNESS_MM)) || 0,
        rrc_price: product.base_price,
        images: product.images.map(img => img.url)
      };
    });

    return NextResponse.json({
      products: formattedProducts,
      total: formattedProducts.length
    });
  } catch (error) {
    safeLog('❌ API products - ошибка:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки товаров' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
