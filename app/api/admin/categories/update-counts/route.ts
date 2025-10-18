import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('=== ОБНОВЛЕНИЕ СЧЕТЧИКОВ ТОВАРОВ ===');
    
    // Получаем все категории
    const categories = await prisma.catalogCategory.findMany({
      where: { is_active: true },
      orderBy: [
        { level: 'asc' },
        { sort_order: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log(`Найдено ${categories.length} категорий для обновления счетчиков`);

    // Подсчитываем товары для каждой категории
    const updatedCounts = await Promise.all(
      categories.map(async (category) => {
        const productsCount = await prisma.product.count({
          where: {
            catalog_category_id: category.id
          }
        });

        // Обновляем счетчик в базе данных
        await prisma.catalogCategory.update({
          where: { id: category.id },
          data: { products_count: productsCount }
        });

        return {
          id: category.id,
          name: category.name,
          products_count: productsCount
        };
      })
    );

    console.log('Счетчики обновлены:', updatedCounts);

    return NextResponse.json({
      success: true,
      message: `Обновлено ${updatedCounts.length} счетчиков`,
      counts: updatedCounts
    });

  } catch (error) {
    console.error('Error updating product counts:', error);
    return NextResponse.json(
      { error: 'Failed to update product counts' },
      { status: 500 }
    );
  }
}