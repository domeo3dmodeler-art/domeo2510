import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { DOOR_PROPERTIES } from '../../../lib/constants/door-properties';
import { safeLog, logDebug } from '../../../lib/utils/logger';

const prisma = new PrismaClient();

function getPropertyValue(properties: any, propertyKey: string): string | undefined {
  return properties[propertyKey];
}

export async function GET(req: NextRequest) {
  try {
    logDebug('API options - загрузка данных (не из кэша)');
    
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        },
        is_active: true
      },
      select: {
        properties_data: true
      }
    });

    safeLog(`📦 Загружено ${products.length} товаров из БД`);

    const styles = new Set<string>();
    const models = new Set<string>();
    const colors = new Set<string>();
    const coatingTypes = new Set<string>();
    const constructionTypes = new Set<string>();
    const factoryCollections = new Set<string>();
    const widths = new Set<number>();
    const heights = new Set<number>();
    const thicknesses = new Set<number>();

    products.forEach(product => {
      const properties = JSON.parse(product.properties_data || '{}');
      
      const style = getPropertyValue(properties, DOOR_PROPERTIES.STYLE);
      if (style) styles.add(style);

      const model = getPropertyValue(properties, DOOR_PROPERTIES.MODEL);
      if (model) models.add(model);

      const color = getPropertyValue(properties, DOOR_PROPERTIES.COLOR);
      if (color) colors.add(color);

      const coatingType = getPropertyValue(properties, DOOR_PROPERTIES.COATING_TYPE);
      if (coatingType) coatingTypes.add(coatingType);

      const constructionType = getPropertyValue(properties, DOOR_PROPERTIES.CONSTRUCTION_TYPE);
      if (constructionType) constructionTypes.add(constructionType);

      const factoryCollection = getPropertyValue(properties, DOOR_PROPERTIES.FACTORY_COLLECTION);
      if (factoryCollection) factoryCollections.add(factoryCollection);

      const width = getPropertyValue(properties, DOOR_PROPERTIES.WIDTH_MM);
      if (width) widths.add(Number(width));

      const height = getPropertyValue(properties, DOOR_PROPERTIES.HEIGHT_MM);
      if (height) heights.add(Number(height));

      const thickness = getPropertyValue(properties, DOOR_PROPERTIES.THICKNESS_MM);
      if (thickness) thicknesses.add(Number(thickness));
    });

    const result = {
      styles: Array.from(styles).sort(),
      models: Array.from(models).sort(),
      colors: Array.from(colors).sort(),
      coatingTypes: Array.from(coatingTypes).sort(),
      constructionTypes: Array.from(constructionTypes).sort(),
      factoryCollections: Array.from(factoryCollections).sort(),
      widths: Array.from(widths).sort((a, b) => a - b),
      heights: Array.from(heights).sort((a, b) => a - b),
      thicknesses: Array.from(thicknesses).sort((a, b) => a - b)
    };

    safeLog('✅ API options - данные загружены и сохранены в кэш');
    
    return NextResponse.json(result);
  } catch (error) {
    safeLog('❌ API options - ошибка:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки опций дверей' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
