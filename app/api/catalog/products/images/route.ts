import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const categoryIds = url.searchParams.getAll('categoryIds');
    const propertyName = url.searchParams.get('propertyName');
    const propertyValue = url.searchParams.get('propertyValue');

    if (!categoryIds || categoryIds.length === 0) {
      return NextResponse.json(
        { error: 'Category IDs are required' },
        { status: 400 }
      );
    }

    if (!propertyName || !propertyValue) {
      return NextResponse.json(
        { error: 'Property name and value are required' },
        { status: 400 }
      );
    }

    console.log(`Loading product images for property "${propertyName}" = "${propertyValue}" from categories: ${categoryIds.join(', ')}`);

    // Загружаем товары с изображениями
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

    console.log(`Found ${products.length} products`);

    // Фильтруем товары по значению свойства
    const filteredProducts = products.filter(product => {
      if (!product.properties_data) return false;
      
      try {
        const props = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
        
        return props[propertyName] === propertyValue;
      } catch (error) {
        console.warn(`Error parsing properties for product ${product.id}:`, error);
        return false;
      }
    });

    console.log(`Found ${filteredProducts.length} products matching property value`);

    // Собираем изображения
    const images = filteredProducts
      .filter(product => product.images.length > 0)
      .map(product => ({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        url: product.images[0].url,
        alt: product.images[0].alt_text || product.name
      }));

    return NextResponse.json({
      success: true,
      images: images,
      count: images.length,
      productCount: filteredProducts.length  // Количество отфильтрованных товаров
    });

  } catch (error) {
    console.error('Error loading product images:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при загрузке изображений товаров' },
      { status: 500 }
    );
  }
}
