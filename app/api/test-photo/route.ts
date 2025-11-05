import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/test-photo - Тестирование загрузки фото
export async function POST(request: NextRequest) {
  try {
    const { categoryId, mappingProperty, fileName } = await request.json();

    console.log('=== ТЕСТ ЗАГРУЗКИ ФОТО ===');
    console.log('Category ID:', categoryId);
    console.log('Mapping Property:', mappingProperty);
    console.log('File Name:', fileName);

    // Получаем товары из категории
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: categoryId
      },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      },
      take: 10
    });

    console.log(`Найдено ${products.length} товаров в категории`);

    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const results = [];

    for (const product of products) {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const allKeys = Object.keys(properties);
        
        console.log(`\n--- Анализ товара ${product.sku} ---`);
        console.log('Доступные ключи:', allKeys);
        console.log('Доступные значения:', Object.values(properties));

        // Ищем совпадения по всем ключам
        const matches = [];
        allKeys.forEach(key => {
          const value = properties[key];
          if (value) {
            const valueStr = value.toString().trim();
            const fileNameStr = fileNameWithoutExt.trim();
            
            if (valueStr === fileNameStr || 
                valueStr.includes(fileNameStr) || 
                fileNameStr.includes(valueStr)) {
              matches.push({
                key,
                value: valueStr,
                matchType: valueStr === fileNameStr ? 'exact' : 'partial'
              });
            }
          }
        });

        results.push({
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name
          },
          matches,
          properties: properties
        });

        if (matches.length > 0) {
          console.log(`✅ НАЙДЕНЫ СОВПАДЕНИЯ для ${product.sku}:`, matches);
        } else {
          console.log(`❌ Совпадений не найдено для ${product.sku}`);
        }

      } catch (error) {
        console.error(`Ошибка обработки товара ${product.sku}:`, error);
        results.push({
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name
          },
          error: error.message,
          matches: []
        });
      }
    }

    return NextResponse.json({
      success: true,
      testResults: {
        categoryId,
        mappingProperty,
        fileName,
        fileNameWithoutExt,
        totalProducts: products.length,
        results
      }
    });

  } catch (error) {
    console.error('Ошибка тестирования фото:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}



