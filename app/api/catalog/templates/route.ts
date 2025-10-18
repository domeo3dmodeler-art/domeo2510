import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/catalog/templates - Получить все шаблоны
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const where = categoryId ? { catalog_category_id: categoryId } : {};

    const templates = await prisma.importTemplate.findMany({
      where,
      include: {
        catalog_category: {
          select: {
            id: true,
            name: true,
            level: true,
            path: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении шаблонов' },
      { status: 500 }
    );
  }
}

// POST /api/catalog/templates - Создать новый шаблон
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { catalog_category_id, name, required_fields, calculator_fields, export_fields } = body;

    if (!catalog_category_id || !name) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля' },
        { status: 400 }
      );
    }

    const template = await prisma.importTemplate.create({
      data: {
        catalog_category_id,
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
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при создании шаблона' },
      { status: 500 }
    );
  }
}
