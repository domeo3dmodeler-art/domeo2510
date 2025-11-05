import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/catalog/products/[id] - Получить товар по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
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

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Товар не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении товара' },
      { status: 500 }
    );
  }
}

// PUT /api/catalog/products/[id] - Обновить товар
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Проверяем уникальность SKU (кроме текущего товара)
    if (sku) {
      const existingProduct = await prisma.product.findFirst({
        where: { 
          sku,
          id: { not: params.id }
        }
      });

      if (existingProduct) {
        return NextResponse.json(
          { success: false, message: 'Товар с таким SKU уже существует' },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        catalog_category_id,
        sku,
        name,
        description,
        brand,
        model,
        series,
        price: price ? parseFloat(price) : undefined,
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
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при обновлении товара' },
      { status: 500 }
    );
  }
}

// DELETE /api/catalog/products/[id] - Удалить товар
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.product.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Товар удален'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при удалении товара' },
      { status: 500 }
    );
  }
}