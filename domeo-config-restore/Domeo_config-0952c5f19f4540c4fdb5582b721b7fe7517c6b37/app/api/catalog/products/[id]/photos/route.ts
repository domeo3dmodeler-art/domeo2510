import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    // Получаем товар
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sku: true,
        properties_data: true
      }
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Товар не найден' },
        { status: 404 }
      );
    }

    // Парсим свойства
    const properties = typeof product.properties_data === 'string' 
      ? JSON.parse(product.properties_data) 
      : product.properties_data;

    // Проверяем наличие фотографий
    if (!properties.photos || !Array.isArray(properties.photos) || properties.photos.length === 0) {
      return NextResponse.json(
        { success: false, message: 'У товара нет фотографий' },
        { status: 400 }
      );
    }

    // Удаляем массив фотографий
    delete properties.photos;

    // Обновляем товар
    await prisma.product.update({
      where: { id: productId },
      data: {
        properties_data: JSON.stringify(properties)
      }
    });

    return NextResponse.json({
      success: true,
      message: `Фотографии товара ${product.sku} успешно удалены`
    });

  } catch (error) {
    console.error('Ошибка при удалении фотографий:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при удалении фотографий' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
