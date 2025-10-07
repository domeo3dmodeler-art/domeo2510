import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/configurator/category-links/[id]/hierarchies - Получить иерархии для связи
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hierarchies = await prisma.additionalCategoryHierarchy.findMany({
      where: { configurator_link_id: params.id },
      include: {
        parent_category: {
          select: {
            id: true,
            name: true
          }
        },
        child_category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        display_order: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      hierarchies
    });
  } catch (error) {
    console.error('Error fetching hierarchies:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении иерархий' },
      { status: 500 }
    );
  }
}

// POST /api/configurator/category-links/[id]/hierarchies - Создать иерархию
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { parent_category_id, child_category_id, display_order } = body;

    if (!parent_category_id || !child_category_id) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
        { status: 400 }
      );
    }

    // Проверяем, что иерархия не существует
    const existingHierarchy = await prisma.additionalCategoryHierarchy.findUnique({
      where: {
        configurator_link_id_parent_category_id_child_category_id: {
          configurator_link_id: params.id,
          parent_category_id,
          child_category_id
        }
      }
    });

    if (existingHierarchy) {
      return NextResponse.json(
        { success: false, message: 'Иерархия уже существует' },
        { status: 400 }
      );
    }

    const hierarchy = await prisma.additionalCategoryHierarchy.create({
      data: {
        configurator_link_id: params.id,
        parent_category_id,
        child_category_id,
        display_order: display_order || 0
      },
      include: {
        parent_category: {
          select: {
            id: true,
            name: true
          }
        },
        child_category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      hierarchy
    });
  } catch (error) {
    console.error('Error creating hierarchy:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании иерархии' },
      { status: 500 }
    );
  }
}
