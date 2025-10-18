import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/catalog/templates/[id] - Получить шаблон по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.importTemplate.findUnique({
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

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Шаблон не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении шаблона' },
      { status: 500 }
    );
  }
}

// PUT /api/catalog/templates/[id] - Обновить шаблон
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, required_fields, calculator_fields, export_fields } = body;

    const template = await prisma.importTemplate.update({
      where: { id: params.id },
      data: {
        name,
        required_fields: JSON.stringify(required_fields || []),
        calculator_fields: JSON.stringify(calculator_fields || []),
        export_fields: JSON.stringify(export_fields || [])
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
      template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при обновлении шаблона' },
      { status: 500 }
    );
  }
}

// DELETE /api/catalog/templates/[id] - Удалить шаблон
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.importTemplate.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Шаблон удален'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при удалении шаблона' },
      { status: 500 }
    );
  }
}
