import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
// Импортируем функции напрямую для совместимости
function parsePhotoFileName(fileName: string) {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  
  // Проверяем, есть ли номер в конце (_1, _2, etc.)
  const match = nameWithoutExt.match(/^(.+)_(\d+)$/);
  
  if (match) {
    return {
      fileName,
      isCover: false,
      number: parseInt(match[2]),
      baseName: match[1]
    };
  } else {
    return {
      fileName,
      isCover: true,
      number: null,
      baseName: nameWithoutExt
    };
  }
}

function getNextPhotoNumber(existingPhotos: string[], baseName: string): number {
  const galleryNumbers = existingPhotos
    .map(photo => parsePhotoFileName(photo))
    .filter(info => !info.isCover && info.baseName === baseName)
    .map(info => info.number!)
    .sort((a, b) => a - b);
  
  // Находим первый пропущенный номер или следующий после максимального
  let nextNumber = 1;
  for (const num of galleryNumbers) {
    if (num === nextNumber) {
      nextNumber++;
    } else {
      break;
    }
  }
  
  return nextNumber;
}

const prisma = new PrismaClient();

// GET /api/admin/photos/next-number - Получить следующий доступный номер для фото
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const mappingProperty = searchParams.get('mapping_property');
    const propertyValue = searchParams.get('property_value');

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Не указана категория' },
        { status: 400 }
      );
    }

    if (!mappingProperty) {
      return NextResponse.json(
        { success: false, message: 'Не указано свойство для привязки' },
        { status: 400 }
      );
    }

    if (!propertyValue) {
      return NextResponse.json(
        { success: false, message: 'Не указано значение свойства' },
        { status: 400 }
      );
    }

    console.log('=== ПОЛУЧЕНИЕ СЛЕДУЮЩЕГО НОМЕРА ФОТО ===');
    console.log('Категория:', category);
    console.log('Свойство:', mappingProperty);
    console.log('Значение:', propertyValue);

    // Получаем товары с указанным значением свойства
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: category
      },
      select: {
        id: true,
        sku: true,
        properties_data: true
      }
    });

    // Находим товары с совпадающим значением свойства
    const matchingProducts = products.filter(product => {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        
        // Ищем по всем возможным ключам свойств
        const possibleKeys = [
          mappingProperty,
          'Артикул поставщика',
          'Артикул',
          'SKU',
          'sku',
          'Артикул_поставщика',
          'Артикул поставщика',
          'Supplier SKU',
          'Supplier_sku'
        ];
        
        // Также ищем по всем ключам, которые содержат "артикул" или "sku"
        const allKeys = Object.keys(properties);
        allKeys.forEach(key => {
          if (key.toLowerCase().includes('артикул') || 
              key.toLowerCase().includes('sku') ||
              key.toLowerCase().includes('supplier')) {
            possibleKeys.push(key);
          }
        });
        
        // Убираем дубликаты
        const uniqueKeys = [...new Set(possibleKeys)];
        
        for (const key of uniqueKeys) {
          const propertyValueFromDB = properties[key];
          if (propertyValueFromDB && propertyValueFromDB.toString().trim() === propertyValue.trim()) {
            return true;
          }
        }
        
        return false;
      } catch (error) {
        console.error('Ошибка парсинга свойств товара:', error);
        return false;
      }
    });

    console.log(`Найдено ${matchingProducts.length} товаров с значением "${propertyValue}"`);

    if (matchingProducts.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Товары с значением "${propertyValue}" не найдены`,
        nextNumber: 1
      });
    }

    // Собираем все существующие фото для этих товаров
    const allExistingPhotos: string[] = [];
    
    matchingProducts.forEach(product => {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        if (properties.photos && Array.isArray(properties.photos)) {
          allExistingPhotos.push(...properties.photos);
        }
      } catch (error) {
        console.error(`Ошибка парсинга фото товара ${product.sku}:`, error);
      }
    });

    // Получаем следующий номер для базового имени
    const nextNumber = getNextPhotoNumber(allExistingPhotos, propertyValue);

    console.log(`Следующий номер для "${propertyValue}": ${nextNumber}`);

    return NextResponse.json({
      success: true,
      nextNumber: nextNumber,
      baseName: propertyValue,
      existingPhotos: allExistingPhotos.length,
      matchingProducts: matchingProducts.length
    });

  } catch (error) {
    console.error('Ошибка при получении следующего номера фото:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
