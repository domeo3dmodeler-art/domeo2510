import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryIds = searchParams.get('categoryIds');
    const propertyName = searchParams.get('propertyName');

    if (!categoryIds || !propertyName) {
      return NextResponse.json(
        { success: false, message: 'Не указаны categoryIds или propertyName' },
        { status: 400 }
      );
    }

    const categoryIdsArray = categoryIds.split(',');

    console.log(`🚀 Batch loading property values with images for "${propertyName}" from categories:`, categoryIdsArray);

    // Получаем все продукты из категории
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: {
          in: categoryIdsArray
        },
        is_active: true
      },
      select: {
        id: true,
        properties_data: true
      }
    });

    console.log(`🚀 Found ${products.length} products`);

    // Извлекаем уникальные значения для указанного свойства
    const uniqueValues = new Set<string>();
    products.forEach(product => {
      try {
        let propertiesData = product.properties_data;
        
        // Если properties_data - это строка, парсим её как JSON
        if (typeof propertiesData === 'string') {
          propertiesData = JSON.parse(propertiesData);
        }
        
        if (propertiesData && typeof propertiesData === 'object') {
          const propertyValue = (propertiesData as any)[propertyName];
          if (propertyValue && typeof propertyValue === 'string') {
            uniqueValues.add(propertyValue);
          }
        }
      } catch (error) {
        console.warn(`🚀 Error parsing properties_data for product ${product.id}:`, error);
      }
    });

    const propertyValues = Array.from(uniqueValues);
    console.log(`🚀 Found ${propertyValues.length} unique values for property "${propertyName}"`);

    // Получаем изображения для всех продуктов сразу
    const productImages = await prisma.productImage.findMany({
      where: {
        product_id: {
          in: products.map(p => p.id)
        },
        is_primary: true
      },
      select: {
        id: true,
        url: true,
        alt_text: true,
        product_id: true
      }
    });

    console.log(`🚀 Found ${productImages.length} product images`);

    // Группируем изображения по product_id
    const imagesByProductId = new Map<string, any>();
    productImages.forEach(image => {
      imagesByProductId.set(image.product_id, image);
    });

    // Создаем результат с подсчетом товаров и изображениями для каждого значения свойства
    const result = propertyValues.map(propertyValue => {
      // Подсчитываем товары с этим значением свойства
      const productsWithValue = products.filter(product => {
        try {
          let propertiesData = product.properties_data;
          
          // Если properties_data - это строка, парсим её как JSON
          if (typeof propertiesData === 'string') {
            propertiesData = JSON.parse(propertiesData);
          }
          
          if (propertiesData && typeof propertiesData === 'object') {
            const value = (propertiesData as any)[propertyName];
            return value === propertyValue;
          }
          return false;
        } catch (error) {
          console.warn(`🚀 Error parsing properties_data for product ${product.id}:`, error);
          return false;
        }
      });

      // Получаем первое изображение из товаров с этим значением
      const firstProduct = productsWithValue.find(product => 
        imagesByProductId.has(product.id)
      );
      
      const image = firstProduct ? imagesByProductId.get(firstProduct.id) : null;

      return {
        value: propertyValue,
        count: productsWithValue.length,
        image: image ? {
          url: image.url,
          alt_text: image.alt_text
        } : null
      };
    });

    console.log(`🚀 Batch API returning ${result.length} property values with images`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in batch property values with images API:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при загрузке данных' },
      { status: 500 }
    );
  }
}
