import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { uniqueValuesCache } from '../../../../../lib/cache/unique-values-cache';

export async function POST(request: NextRequest) {
  try {
    const { categoryIds, propertyNames } = await request.json();

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json(
        { error: 'Category IDs are required' },
        { status: 400 }
      );
    }

    if (!propertyNames || !Array.isArray(propertyNames) || propertyNames.length === 0) {
      return NextResponse.json(
        { error: 'Property names are required' },
        { status: 400 }
      );
    }

    console.log(`Loading unique values for properties: ${propertyNames.join(', ')} from categories: ${categoryIds.join(', ')}`);

    // Проверяем кэш
    const cachedData = uniqueValuesCache.get(categoryIds, propertyNames);
    if (cachedData) {
      console.log('Returning cached unique values');
      return NextResponse.json({
        success: true,
        uniqueValues: cachedData,
        cached: true
      });
    }

    // Загружаем все товары из указанных категорий
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: { in: categoryIds },
        is_active: true
      },
      select: {
        id: true,
        properties_data: true
      }
    });

    console.log(`Found ${products.length} products to analyze`);

    // Извлекаем уникальные значения для каждого свойства
    const results: Record<string, string[]> = {};
    
    for (const propertyName of propertyNames) {
      const uniqueValues = new Set<string>();
      
      products.forEach((product: any) => {
        if (product.properties_data) {
          try {
            const propsData = typeof product.properties_data === 'string' 
              ? JSON.parse(product.properties_data) 
              : product.properties_data;
            
            // Ищем свойство по точному имени или fuzzy match
            let propertyValue = propsData[propertyName];
            
            if (propertyValue === undefined) {
              // Пробуем найти по fuzzy match
              for (const key in propsData) {
                if (key.toLowerCase().includes(propertyName.toLowerCase()) || 
                    propertyName.toLowerCase().includes(key.toLowerCase())) {
                  propertyValue = propsData[key];
                  break;
                }
              }
            }
            
            if (propertyValue !== undefined && propertyValue !== null && propertyValue !== '') {
              const valueStr = String(propertyValue).trim();
              if (valueStr) {
                uniqueValues.add(valueStr);
              }
            }
          } catch (error) {
            console.error('Error parsing properties_data:', error);
          }
        }
      });
      
      results[propertyName] = Array.from(uniqueValues).sort();
    }

    console.log('Unique values extracted:', Object.keys(results).map(key => `${key}: ${results[key].length} values`));

    // Сохраняем в кэш
    uniqueValuesCache.set(categoryIds, propertyNames, results);

    return NextResponse.json({
      success: true,
      uniqueValues: results,
      cached: false
    });

  } catch (error) {
    console.error('Error extracting unique property values:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при извлечении уникальных значений свойств' },
      { status: 500 }
    );
  }
}
