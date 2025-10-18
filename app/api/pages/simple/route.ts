import { NextRequest, NextResponse } from 'next/server';

// Простой API для тестирования без Prisma
export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      pages: [
        {
          id: 'simple-1',
          title: 'Простая страница 1',
          description: 'Тестовая страница',
          isPublished: true,
          url: 'simple-1',
          elementsCount: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    console.error('Error in simple API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received data:', body);
    
    const { title, description } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const newPage = {
      id: `simple-${Date.now()}`,
      title,
      description: description || '',
      url: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50),
      isPublished: false,
      elements: body.elements || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Created page:', newPage);

    return NextResponse.json({ 
      success: true, 
      page: newPage
    });
  } catch (error) {
    console.error('Error creating simple page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create page' },
      { status: 500 }
    );
  }
}

