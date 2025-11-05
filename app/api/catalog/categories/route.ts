import { NextRequest, NextResponse } from 'next/server';
import { catalogService } from '@/lib/services/catalog.service';
import { CreateCatalogCategoryDto } from '@/lib/types/catalog';

// GET /api/catalog/categories - Получить дерево каталога
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const search = searchParams.get('search');

    if (level) {
      const categories = await catalogService.getCategoriesByLevel(parseInt(level));
      return NextResponse.json(categories);
    }

    if (search) {
      const categories = await catalogService.searchCategories(search);
      return NextResponse.json(categories);
    }

    const result = await catalogService.getCatalogTree();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching catalog categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog categories' },
      { status: 500 }
    );
  }
}

// POST /api/catalog/categories - Создать новую категорию
export async function POST(request: NextRequest) {
  try {
    const data: CreateCatalogCategoryDto = await request.json();

    // Валидация
    if (!data.name || data.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const category = await catalogService.createCategory(data);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating catalog category:', error);
    return NextResponse.json(
      { error: 'Failed to create catalog category' },
      { status: 500 }
    );
  }
}
