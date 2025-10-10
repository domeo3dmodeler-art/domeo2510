import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { DOOR_PROPERTIES } from '../../../../lib/constants/door-properties';
import { safeLog, logDebug } from '../../../../lib/utils/logger';

const prisma = new PrismaClient();

function getPropertyValue(properties: any, propertyName: string): string | undefined {
  return properties[propertyName];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyNames = searchParams.get('propertyNames');
    
    if (!propertyNames) {
      return NextResponse.json(
        { error: 'Не указаны названия свойств' },
        { status: 400 }
      );
    }

    const properties = propertyNames.split(',');
    logDebug('API unique-values - загрузка уникальных значений для свойств:', properties);

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

    const result: Record<string, string[]> = {};

    properties.forEach(propertyName => {
      const values = new Set<string>();
      
      products.forEach(product => {
        const productProperties = JSON.parse(product.properties_data || '{}');
        const value = getPropertyValue(productProperties, propertyName);
        
        if (value && typeof value === 'string' && value.trim()) {
          values.add(value.trim());
        }
      });

      result[propertyName] = Array.from(values).sort();
    });

    return NextResponse.json(result);
  } catch (error) {
    safeLog('❌ API unique-values - ошибка:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки уникальных значений' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyNames } = body;
    
    if (!propertyNames || !Array.isArray(propertyNames)) {
      return NextResponse.json(
        { error: 'Не указаны названия свойств' },
        { status: 400 }
      );
    }

    logDebug('API unique-values POST - загрузка уникальных значений для свойств:', propertyNames);

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

    const result: Record<string, string[]> = {};

    propertyNames.forEach((propertyName: string) => {
      const values = new Set<string>();
      
      products.forEach(product => {
        const productProperties = JSON.parse(product.properties_data || '{}');
        const value = getPropertyValue(productProperties, propertyName);
        
        if (value && typeof value === 'string' && value.trim()) {
          values.add(value.trim());
        }
      });

      result[propertyName] = Array.from(values).sort();
    });

    return NextResponse.json(result);
  } catch (error) {
    safeLog('❌ API unique-values POST - ошибка:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки уникальных значений' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
