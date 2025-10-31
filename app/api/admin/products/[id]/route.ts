import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { apiErrorHandler } from '@/lib/api-error-handler';
import { apiValidator } from '@/lib/api-validator';
import { fixFieldEncoding } from '@/lib/encoding-utils';

// Временная реализация функции fixAllEncoding
function fixAllEncoding(data: any): any {
  if (typeof data === 'string') {
    return fixFieldEncoding(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(fixAllEncoding);
  }
  
  if (typeof data === 'object' && data !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[fixFieldEncoding(key)] = fixAllEncoding(value);
    }
    return result;
  }
  
  return data;
}

const prisma = new PrismaClient();

// Получить товар по ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    apiValidator.validateId(id, 'productId');

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        catalog_category: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Товар не найден' }, { status: 404 });
    }

    // Исправляем кодировку
    const fixedProduct = fixAllEncoding(product);

    return NextResponse.json({ success: true, product: fixedProduct });

  } catch (error) {
    return apiErrorHandler.handle(error, 'product-get');
  }
}

// Обновить товар
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    apiValidator.validateId(id, 'productId');

    const body = await req.json();
    const fixedBody = fixAllEncoding(body);

    const {
      name,
      sku,
      base_price,
      stock_quantity,
      properties_data,
      specifications,
      is_active,
      sort_order,
    } = fixedBody;

    // Проверяем существование товара
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ success: false, error: 'Товар не найден' }, { status: 404 });
    }

    // Обновляем товар
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(sku && { sku }),
        ...(base_price !== undefined && { base_price: parseFloat(base_price) || 0 }),
        ...(stock_quantity !== undefined && { stock_quantity: parseInt(stock_quantity) || 0 }),
        ...(properties_data && { properties_data: JSON.stringify(properties_data) }),
        ...(specifications && { specifications: JSON.stringify(specifications) }),
        ...(is_active !== undefined && { is_active: Boolean(is_active) }),
        // sort_order удален из схемы Prisma, поэтому не обновляем его
        updated_at: new Date(),
      },
      include: {
        catalog_category: true,
      },
    });

    const fixedProduct = fixAllEncoding(updatedProduct);

    return NextResponse.json({ 
      success: true, 
      message: 'Товар успешно обновлен',
      product: fixedProduct 
    });

  } catch (error) {
    return apiErrorHandler.handle(error, 'product-update');
  }
}

// Удалить товар
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    apiValidator.validateId(id, 'productId');

    // Проверяем существование товара
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        catalog_category: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ success: false, error: 'Товар не найден' }, { status: 404 });
    }

    // Удаляем товар
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Товар успешно удален',
      deletedProduct: fixAllEncoding(existingProduct)
    });

  } catch (error) {
    return apiErrorHandler.handle(error, 'product-delete');
  }
}
