import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const categoryIds = url.searchParams.getAll('categoryIds');
    const propertyName = url.searchParams.get('propertyName');

    if (!categoryIds || categoryIds.length === 0) {
      return NextResponse.json(
        { error: 'Category IDs are required' },
        { status: 400 }
      );
    }

    if (!propertyName) {
      return NextResponse.json(
        { error: 'Property name is required' },
        { status: 400 }
      );
    }

    console.log(`Loading property values with counts and images for "${propertyName}" from categories: ${categoryIds.join(', ')}`);

    // Загружаем все товары из указанных категорий
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: {
          in: categoryIds
        },
        is_active: true
      },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true,
        images: {
          where: {
            is_primary: true
          },
          select: {
            url: true,
            alt_text: true
          }
        }
      }
    });

    console.log(`Found ${products.length} products to analyze`);

    // Группируем товары по значениям свойства
    const valueGroups: { [key: string]: { count: number, image: string | null } } = {};
    
    products.forEach((product: any) => {
      if (product.properties_data) {
        try {
          const props = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;
          
          const value = props[propertyName];
          if (value && typeof value === 'string' && value.trim()) {
            const trimmedValue = value.trim();
            
            if (!valueGroups[trimmedValue]) {
              valueGroups[trimmedValue] = { count: 0, image: null };
            }
            
            valueGroups[trimmedValue].count++;
            
            // Берем первое изображение для этого значения
            if (!valueGroups[trimmedValue].image && product.images.length > 0) {
              valueGroups[trimmedValue].image = product.images[0].url;
            }
          }
        } catch (error) {
          console.warn(`Error parsing properties for product ${product.id}:`, error);
        }
      }
    });

    console.log(`Found ${Object.keys(valueGroups).length} unique values`);

    return NextResponse.json({
      success: true,
      values: valueGroups,
      totalProducts: products.length
    });

  } catch (error) {
    console.error('Error loading property values with counts and images:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при загрузке значений свойства с количеством и изображениями' },
      { status: 500 }
    );
  }
}
