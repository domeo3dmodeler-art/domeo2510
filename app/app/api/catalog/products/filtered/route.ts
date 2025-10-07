import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryIds = searchParams.getAll('categoryIds');
    const propertyName = searchParams.get('propertyName');
    const filtersParam = searchParams.get('filters');

    if (!categoryIds.length) {
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

    console.log(`Loading filtered products for property "${propertyName}" from categories: ${categoryIds.join(', ')}`);
    
    let filters = {};
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
        console.log('Applied filters:', filters);
      } catch (error) {
        console.warn('Error parsing filters:', error);
      }
    }

    // Загружаем товары с учетом фильтров
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
        properties_data: true
      }
    });

    console.log(`Found ${products.length} products`);

    // Фильтруем товары по значениям свойств
    const filteredProducts = products.filter(product => {
      if (!product.properties_data) return false;
      
      try {
        const props = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
        
        // Проверяем все фильтры
        for (const [filterPropertyName, filterValue] of Object.entries(filters)) {
          if (props[filterPropertyName] !== filterValue) {
            return false;
          }
        }
        
        // Проверяем, что у товара есть нужное свойство
        return props.hasOwnProperty(propertyName);
      } catch (error) {
        console.warn(`Error parsing properties for product ${product.id}:`, error);
        return false;
      }
    });

    console.log(`Found ${filteredProducts.length} products matching filters`);

    // Извлекаем уникальные значения нужного свойства
    const uniqueValues = new Set<string>();
    
    for (const product of filteredProducts) {
      if (product.properties_data) {
        try {
          const props = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;
          
          const value = props[propertyName];
          if (value && typeof value === 'string' && value.trim()) {
            uniqueValues.add(value.trim());
          }
        } catch (error) {
          console.warn(`Error parsing properties for product ${product.id}:`, error);
        }
      }
    }

    const result = Array.from(uniqueValues).sort();

    console.log(`Found ${result.length} unique values for property "${propertyName}"`);

    return NextResponse.json({
      success: true,
      uniqueValues: {
        [propertyName]: result
      },
      totalProducts: filteredProducts.length,
      filters
    });

  } catch (error) {
    console.error('Error loading filtered products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
