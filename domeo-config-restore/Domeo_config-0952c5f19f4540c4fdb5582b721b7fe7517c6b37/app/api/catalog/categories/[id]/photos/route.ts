import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;

    // Получаем все товары категории
    const products = await prisma.product.findMany({
      where: { catalog_category_id: categoryId },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, message: 'В категории нет товаров' },
        { status: 404 }
      );
    }

    let deletedCount = 0;
    let processedCount = 0;

    // Обрабатываем каждый товар
    for (const product of products) {
      try {
        const properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;

        // Проверяем наличие фотографий
        if (properties.photos && Array.isArray(properties.photos) && properties.photos.length > 0) {
          deletedCount += properties.photos.length;
          
          // Удаляем массив фотографий
          delete properties.photos;
          
          // Обновляем товар
          await prisma.product.update({
            where: { id: product.id },
            data: {
              properties_data: JSON.stringify(properties)
            }
          });
        }
        
        processedCount++;
      } catch (error) {
        console.error(`Ошибка при обработке товара ${product.sku}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Фотографии успешно удалены из ${processedCount} товаров`,
      deletedCount: deletedCount,
      processedCount: processedCount
    });

  } catch (error) {
    console.error('Ошибка при удалении всех фотографий:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при удалении всех фотографий' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
