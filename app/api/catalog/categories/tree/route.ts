import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { logger } from '../../../../../lib/logging/logger';

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
    interface CategoryNode {
      id: string;
      name: string;
      parent_id: string | null;
      level: number;
      path: string;
      products_count: number;
      children: CategoryNode[];
    }

    const categoryMap = new Map<string, CategoryNode>();
    const rootCategories: CategoryNode[] = [];

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
    logger.error('Error fetching category tree', 'catalog/categories/tree', error instanceof Error ? { error: error.message, stack: error.stack } : { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
