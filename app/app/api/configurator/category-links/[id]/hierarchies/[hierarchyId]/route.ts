import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/configurator/category-links/[id]/hierarchies/[hierarchyId] - Обновить иерархию
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; hierarchyId: string } }
) {
  try {
    const body = await request.json();
    const { display_order } = body;

    const hierarchy = await prisma.additionalCategoryHierarchy.update({
      where: { id: params.hierarchyId },
      data: {
        display_order
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
    console.error('Error updating hierarchy:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при обновлении иерархии' },
      { status: 500 }
    );
  }
}

// DELETE /api/configurator/category-links/[id]/hierarchies/[hierarchyId] - Удалить иерархию
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; hierarchyId: string } }
) {
  try {
    await prisma.additionalCategoryHierarchy.delete({
      where: { id: params.hierarchyId }
    });

    return NextResponse.json({
      success: true,
      message: 'Иерархия удалена'
    });
  } catch (error) {
    console.error('Error deleting hierarchy:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при удалении иерархии' },
      { status: 500 }
    );
  }
}
