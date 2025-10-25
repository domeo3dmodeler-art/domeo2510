import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===================== Сохранение шаблона конфигуратора =====================

export async function POST(req: NextRequest) {
  try {
    const { categoryId, template } = await req.json();

    if (!categoryId || !template) {
      return NextResponse.json(
        { error: 'Не указан ID категории или шаблон' },
        { status: 400 }
      );
    }

    // Обновляем категорию с шаблоном конфигуратора
    const updatedCategory = await prisma.frontendCategory.update({
      where: { id: categoryId },
      data: {
        display_config: JSON.stringify(template),
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      category: updatedCategory,
      message: 'Шаблон конфигуратора сохранен'
    });

  } catch (error) {
    console.error('Template save error:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении шаблона' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// ===================== Получение шаблона конфигуратора =====================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Не указан ID категории' },
        { status: 400 }
      );
    }

    const category = await prisma.frontendCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    let template = null;
    
    if (category.display_config) {
      try {
        template = JSON.parse(category.display_config);
      } catch (error) {
        console.error('Error parsing template:', error);
      }
    }

    return NextResponse.json({
      success: true,
      template,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description
      }
    });

  } catch (error) {
    console.error('Template fetch error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении шаблона' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
