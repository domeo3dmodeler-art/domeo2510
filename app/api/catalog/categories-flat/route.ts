import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/catalog/categories-flat - Получить плоский список категорий для импорта
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Загрузка плоского списка категорий для импорта');

    const categories = await prisma.catalogCategory.findMany({
      where: { is_active: true },
      orderBy: [
        { level: 'asc' },
        { sort_order: 'asc' },
        { name: 'asc' }
      ]
    });

    // Подсчитываем товары для каждой категории
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productCount = await prisma.product.count({
          where: {
            catalog_category_id: category.id
          }
        });
        
        return {
          id: category.id,
          name: category.name,
          level: category.level,
          parent_id: category.parent_id,
          product_count: productCount,
          displayName: category.name
        };
      })
    );

    console.log(`✅ Загружено ${categoriesWithCounts.length} категорий`);
    console.log('Пример категории:', categoriesWithCounts[0]);

    return NextResponse.json({
      categories: categoriesWithCounts,
      total_count: categoriesWithCounts.length
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при загрузке категорий:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog categories', details: (error as Error).message },
      { status: 500 }
    );
  }
}
