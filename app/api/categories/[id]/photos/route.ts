import { NextRequest, NextResponse } from 'next/server';

// Mock данные для фото
const mockPhotos: Record<string, any[]> = {
  'doors': [
    {
      id: '1',
      url: '/assets/doors/door_base_1.jpg',
      alt: 'Дверь PO Base 1/1',
      category_id: 'doors'
    }
  ]
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const photos = mockPhotos[categoryId] || [];

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
