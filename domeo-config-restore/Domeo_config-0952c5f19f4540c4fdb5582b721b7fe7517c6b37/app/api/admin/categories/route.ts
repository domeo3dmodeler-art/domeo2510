import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===================== Создание новой категории =====================

export async function POST(req: NextRequest) {
  try {
    const { name, slug, description, parentId } = await req.json();

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Не указано название или slug категории' },
        { status: 400 }
      );
    }

    // Проверяем уникальность slug
    const existingCategory = await prisma.frontendCategory.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Категория с таким slug уже существует' },
        { status: 400 }
      );
    }

    // Создаем категорию
    const newCategory = await prisma.frontendCategory.create({
      data: {
        name,
        slug,
        description: description || '',
        is_active: true,
        catalog_category_ids: '[]',
        display_config: '{}'
      }
    });

    return NextResponse.json({
      success: true,
      category: {
        id: newCategory.id,
        name: newCategory.name,
        slug: newCategory.slug,
        description: newCategory.description,
        isActive: newCategory.is_active,
        catalogCategoryIds: JSON.parse(newCategory.catalog_category_ids),
        displayConfig: JSON.parse(newCategory.display_config),
        createdAt: newCategory.created_at,
        updatedAt: newCategory.updated_at
      },
      message: 'Категория успешно создана'
    });

  } catch (error) {
    console.error('Category creation error:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании категории' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// ===================== Получение списка категорий =====================

export async function GET(req: NextRequest) {
  try {
    const categories = await prisma.frontendCategory.findMany({
      orderBy: [
        { name: 'asc' }
      ]
    });

    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      isActive: category.is_active,
      catalogCategoryIds: JSON.parse(category.catalog_category_ids),
      displayConfig: JSON.parse(category.display_config),
      productsCount: 0, // Пока не реализовано
      subcategoriesCount: 0, // Пока не реализовано
      configuratorConfig: {},
      pageTemplate: null,
      customLayout: null,
      properties: [],
      importMapping: {},
      createdAt: category.created_at,
      updatedAt: category.updated_at
    }));

    return NextResponse.json({
      success: true,
      categories: formattedCategories
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении категорий' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}