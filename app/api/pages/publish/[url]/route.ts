import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить опубликованную страницу по URL
export async function GET(
  request: NextRequest,
  { params }: { params: { url: string } }
) {
  try {
    const page = await prisma.page.findUnique({
      where: { 
        url: params.url,
        isPublished: true // Только опубликованные страницы
      },
      include: {
        elements: {
          orderBy: { zIndex: 'asc' }
        }
      }
    });

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found or not published' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      page: {
        id: page.id,
        title: page.title,
        description: page.description,
        url: page.url,
        elements: page.elements.map(element => ({
          id: element.id,
          type: element.type,
          props: JSON.parse(element.props || '{}'),
          position: JSON.parse(element.position || '{}'),
          size: JSON.parse(element.size || '{}'),
          zIndex: element.zIndex,
          parentId: element.parentId
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching published page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch published page' },
      { status: 500 }
    );
  }
}
