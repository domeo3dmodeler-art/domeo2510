import { NextRequest, NextResponse } from 'next/server';
import { catalogService } from '@/lib/services/catalog.service';
import { CreateFrontendCategoryDto } from '@/lib/types/catalog';

// GET /api/frontend-categories/[id] - Получить категорию фронта по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await catalogService.getFrontendCategoryById(params.id);
    
    if (!category) {
      return NextResponse.json(
        { error: 'Frontend category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching frontend category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch frontend category' },
      { status: 500 }
    );
  }
}

// PUT /api/frontend-categories/[id] - Обновить категорию фронта
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data: Partial<CreateFrontendCategoryDto> = await request.json();

    // Валидация
    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    if (data.slug !== undefined && (!data.slug || data.slug.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Slug cannot be empty' },
        { status: 400 }
      );
    }

    // Проверяем уникальность slug (если изменился)
    if (data.slug) {
      const existingCategory = await catalogService.getFrontendCategoryBySlug(data.slug);
      if (existingCategory && existingCategory.id !== params.id) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const category = await catalogService.updateFrontendCategory(params.id, data);
    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating frontend category:', error);
    return NextResponse.json(
      { error: 'Failed to update frontend category' },
      { status: 500 }
    );
  }
}

// DELETE /api/frontend-categories/[id] - Удалить категорию фронта
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await catalogService.deleteFrontendCategory(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting frontend category:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete frontend category' },
      { status: 500 }
    );
  }
}
