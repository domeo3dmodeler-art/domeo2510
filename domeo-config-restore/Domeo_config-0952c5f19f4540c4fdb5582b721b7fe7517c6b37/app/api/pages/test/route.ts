import { NextRequest, NextResponse } from 'next/server';

// Временный API для тестирования без Prisma
export async function GET() {
  try {
    // Возвращаем тестовые данные
    const testPages = [
      {
        id: 'test-page-1',
        title: 'Тестовая страница 1',
        description: 'Это тестовая страница для проверки API',
        isPublished: true,
        url: 'test-page-1',
        elementsCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'test-page-2',
        title: 'Тестовая страница 2',
        description: 'Еще одна тестовая страница',
        isPublished: false,
        url: 'test-page-2',
        elementsCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return NextResponse.json({ 
      success: true, 
      pages: testPages
    });
  } catch (error) {
    console.error('Error in test API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, elements, isPublished = false } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Генерируем тестовые данные
    const newPage = {
      id: `test-page-${Date.now()}`,
      title,
      description: description || '',
      url: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50),
      isPublished,
      elements: elements || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      page: newPage
    });
  } catch (error) {
    console.error('Error creating test page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create page' },
      { status: 500 }
    );
  }
}

