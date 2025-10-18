import { NextRequest, NextResponse } from 'next/server';

// Mock данные для фото
let mockPhotos: Record<string, any[]> = {
  'doors': [
    {
      id: '1',
      url: '/assets/doors/door_base_1.jpg',
      alt: 'Дверь PO Base 1/1',
      category_id: 'doors'
    }
  ]
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;

    console.log('Deleting photo:', photoId);

    // В реальном приложении здесь будет:
    // 1. Удаление файла с сервера
    // 2. Удаление записи из базы данных

    // Mock удаление
    for (const categoryId in mockPhotos) {
      mockPhotos[categoryId] = mockPhotos[categoryId].filter(photo => photo.id !== photoId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json({ error: 'Ошибка при удалении фото' }, { status: 500 });
  }
}
