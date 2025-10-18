import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/catalog/products - Получить все товары
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    
    if (categoryId) {
      where.catalog_category_id = categoryId;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          base_price: true,
          stock_quantity: true,
          brand: true,
          model: true,
          properties_data: true,
          catalog_category_id: true,
          created_at: true,
          updated_at: true,
          catalog_category: {
            select: {
              id: true,
              name: true,
              level: true,
              path: true
            }
          },
          images: {
            select: {
              id: true,
              url: true,
              alt_text: true,
              is_primary: true,
              sort_order: true
            },
            orderBy: {
              sort_order: 'asc'
            }
          }
        },
        orderBy: {
          name: 'asc'
        },
        take: limit,
        skip: offset
      }),
      prisma.product.count({ where })
    ]);

    // Парсим JSON поля для каждого товара
    const processedProducts = products.map(product => ({
      ...product,
      specifications: product.properties_data ? 
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {},
      properties_data: product.properties_data ? 
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {},
      dimensions: product.dimensions ? JSON.parse(product.dimensions) : {},
      tags: product.tags ? JSON.parse(product.tags) : [],
      images: product.images || []
    }));

    return NextResponse.json({
      success: true,
      products: processedProducts,
      total,
      limit,
      offset
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении товаров' },
      { status: 500 }
    );
  }
}

// POST /api/catalog/products - Создать новый товар
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      catalog_category_id, 
      sku, 
      name, 
      description, 
      brand, 
      model, 
      series, 
      price, 
      properties_data 
    } = body;

    if (!catalog_category_id || !sku || !name || !price) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
        { status: 400 }
      );
    }

    // Проверяем уникальность SKU
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    });

    if (existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Товар с таким SKU уже существует' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        catalog_category_id,
        sku,
        name,
        description,
        brand,
        model,
        series,
        price: parseFloat(price),
        properties_data: properties_data ? JSON.stringify(properties_data) : null
      },
      include: {
        catalog_category: {
          select: {
            id: true,
            name: true,
            level: true,
            path: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании товара' },
      { status: 500 }
    );
  }
}