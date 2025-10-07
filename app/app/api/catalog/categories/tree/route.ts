import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Получаем все категории с товарами
    const categories = await prisma.catalogCategory.findMany({
      where: {
        is_active: true
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                is_active: true
              }
            }
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { sort_order: 'asc' },
        { name: 'asc' }
      ]
    });

    // Преобразуем в нужный формат
    const categoriesWithCounts = categories.map(category => ({
      id: category.id,
      name: category.name,
      parent_id: category.parent_id,
      level: category.level,
      path: category.path,
      products_count: category._count.products
    }));

    // Строим дерево
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // Создаем карту категорий
    categoriesWithCounts.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: []
      });
    });

    // Строим иерархию
    categoriesWithCounts.forEach(category => {
      const categoryNode = categoryMap.get(category.id);
      
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryNode);
        }
      } else {
        rootCategories.push(categoryNode);
      }
    });

    return NextResponse.json({
      success: true,
      categories: rootCategories
    });

  } catch (error) {
    console.error('Error fetching category tree:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
