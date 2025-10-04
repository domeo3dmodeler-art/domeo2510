import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Простое хранилище в памяти для демонстрации
// В реальном приложении это будет база данных
let importedProducts: any[] = [];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('=== PRODUCTS API CALL ===');
    console.log('Category:', category);
    console.log('Limit:', limit);
    console.log('Offset:', offset);

    // Получаем товары из базы данных
    let whereClause = {};
    if (category && category !== 'all') {
      whereClause = { catalog_category_id: category };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.product.count({
        where: whereClause
      })
    ]);

    console.log('Products from database:', products.length);
    console.log('Total products in database:', total);

    // Преобразуем товары в формат для фронтенда
    const formattedProducts = products.map(product => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      brand: product.brand,
      model: product.model,
      base_price: product.base_price,
      stock_quantity: product.stock_quantity,
      specifications: JSON.parse(product.specifications || '{}'),
      is_active: product.is_active,
      created_at: product.created_at,
      category: product.catalog_category_id
    }));

    return NextResponse.json({
      products: formattedProducts,
      total: total,
      category: category || 'all',
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: "Ошибка получения товаров" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { products, category } = await req.json();
    
    console.log('=== SAVING PRODUCTS TO DATABASE ===');
    console.log('Products count:', products.length);
    console.log('Category:', category);
    console.log('First product sample:', products[0]);
    console.log('All products structure:', products.slice(0, 3));
    
    if (!products || products.length === 0) {
      return NextResponse.json({ 
        success: true, 
        imported: 0,
        message: 'Нет товаров для сохранения'
      });
    }
    
    // Сохраняем товары в базу данных
    const savedProducts = [];
    
    for (const product of products) {
      try {
        // Создаем товар в базе данных
        const savedProduct = await prisma.product.create({
          data: {
            catalog_category_id: category,
            sku: product.sku || `SKU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: product.name || 'Без названия',
            base_price: parseFloat(product.price || product.base_price || 0),
            stock_quantity: parseInt(product.stock || product.stock_quantity || 0),
            brand: product.brand || '',
            model: product.model || '',
            description: product.description || '',
            specifications: JSON.stringify(product.specifications || {}),
            is_active: true
          }
        });
        
        savedProducts.push(savedProduct);
        console.log('Product saved:', savedProduct.id, savedProduct.name);
        
      } catch (productError) {
        console.error('Error saving product:', {
          product: product,
          error: productError,
          errorMessage: productError instanceof Error ? productError.message : 'Unknown error',
          errorCode: (productError as any)?.code
        });
        // Продолжаем с остальными товарами
      }
    }
    
    // Также добавляем в память для совместимости
    const productsWithIds = products.map((product: any, index: number) => ({
      ...product,
      id: `product_${Date.now()}_${index}`,
      category: category || 'unknown',
      imported_at: new Date().toISOString()
    }));
    
    importedProducts.push(...productsWithIds);
    
    console.log('=== PRODUCTS SAVED SUCCESSFULLY ===');
    console.log('Saved to database:', savedProducts.length);
    console.log('Total in memory:', importedProducts.length);
    
    return NextResponse.json({ 
      success: true, 
      imported: savedProducts.length,
      total: importedProducts.length,
      database_saved: savedProducts.length,
      message: `Успешно сохранено ${savedProducts.length} товаров в базу данных`
    });
    
  } catch (error) {
    console.error('Error importing products:', error);
    return NextResponse.json(
      { error: "Ошибка импорта товаров: " + (error instanceof Error ? error.message : 'Неизвестная ошибка') },
      { status: 500 }
    );
  }
}
