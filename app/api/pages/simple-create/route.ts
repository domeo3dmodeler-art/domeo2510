import { NextRequest, NextResponse } from 'next/server';

// Простой API для создания страниц без Prisma
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { title, description, elements = [], isPublished = false } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Генерируем уникальный URL
    const baseUrl = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    let url = baseUrl;
    let counter = 1;
    while (counter < 100) {
      url = counter === 1 ? baseUrl : `${baseUrl}-${counter}`;
      counter++;
      break; // Пока не проверяем уникальность
    }

    // Создаем страницу в памяти (для демонстрации)
    const page = {
      id: `page-${Date.now()}`,
      title,
      description: description || '',
      url,
      isPublished,
      elements: elements.map((element: any, index: number) => ({
        id: element.id || `element-${index}`,
        type: element.type,
        props: element.props || {},
        position: element.position || { x: 0, y: 0 },
        size: element.size || { width: 200, height: 100 },
        zIndex: element.zIndex || index + 1,
        parentId: element.parentId || null,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Created page:', JSON.stringify(page, null, 2));

    return NextResponse.json({
      success: true,
      page,
      message: 'Страница успешно создана'
    });

  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - получить все страницы
export async function GET() {
  try {
    // Возвращаем тестовые страницы
    const pages = [
      {
        id: 'test-page-1',
        title: 'Тестовая страница 1',
        description: 'Это тестовая страница для проверки API',
        url: 'test-page-1',
        isPublished: true,
        elementsCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'test-page-2',
        title: 'Тестовая страница 2',
        description: 'Еще одна тестовая страница',
        url: 'test-page-2',
        isPublished: false,
        elementsCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      pages
    });

  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

