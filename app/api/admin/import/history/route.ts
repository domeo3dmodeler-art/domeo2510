import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/import/history - Получить историю импорта
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const history = await prisma.importHistory.findMany({
      orderBy: {
        created_at: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        template: {
          select: {
            name: true
          }
        },
        catalog_category: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      history: history.map(item => ({
        id: item.id,
        filename: item.filename,
        file_size: item.file_size,
        imported_count: item.imported_count,
        error_count: item.error_count,
        status: item.status,
        errors: item.errors ? JSON.parse(item.errors) : [],
        created_at: item.created_at,
        template_name: item.template?.name || 'Неизвестный шаблон',
        category_name: item.catalog_category?.name || 'Неизвестная категория'
      }))
    });

  } catch (error) {
    console.error('Error fetching import history:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении истории импорта' },
      { status: 500 }
    );
  }
}
