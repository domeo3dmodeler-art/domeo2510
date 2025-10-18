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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const categoryId = formData.get('categoryId') as string;
    const folderUrl = formData.get('folderUrl') as string;
    const photos = formData.getAll('photos') as File[];

    console.log('Uploading photos for category:', categoryId);
    console.log('Folder URL:', folderUrl);
    console.log('Photos count:', photos.length);

    // В реальном приложении здесь будет:
    // 1. Сохранение файлов на сервер или в облачное хранилище
    // 2. Обработка ссылки на папку (скачивание всех фото из папки)
    // 3. Сохранение метаданных в базу данных

    // Mock обработка
    const newPhotos: any[] = [];

    // Обработка загруженных файлов
    photos.forEach((photo, index) => {
      const photoId = `photo_${Date.now()}_${index}`;
      newPhotos.push({
        id: photoId,
        url: `/uploads/${categoryId}/${photo.name}`,
        alt: photo.name,
        category_id: categoryId
      });
    });

    // Обработка ссылки на папку
    if (folderUrl) {
      // В реальном приложении здесь будет скачивание всех фото из папки
      const folderPhotoId = `folder_${Date.now()}`;
      newPhotos.push({
        id: folderPhotoId,
        url: folderUrl,
        alt: 'Фото из папки',
        category_id: categoryId
      });
    }

    // Добавляем новые фото к существующим
    if (!mockPhotos[categoryId]) {
      mockPhotos[categoryId] = [];
    }
    mockPhotos[categoryId].push(...newPhotos);

    return NextResponse.json({ 
      success: true, 
      message: `Загружено ${newPhotos.length} фото`,
      photos: newPhotos
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return NextResponse.json({ error: 'Ошибка при загрузке фото' }, { status: 500 });
  }
}
