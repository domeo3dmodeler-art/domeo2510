import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const { photoMapping, photoData } = await req.json();

    console.log('PUT /api/admin/categories/[id]/photos - Сохранение фотографий:', {
      categoryId,
      hasPhotoMapping: !!photoMapping,
      hasPhotoData: !!photoData,
      photoMappingType: typeof photoMapping,
      photoDataType: typeof photoData
    });

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Не указан ID категории' },
        { status: 400 }
      );
    }

    // Проверяем существование категории
    const existingCategory = await prisma.frontendCategory.findUnique({
      where: { id: categoryId }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      updated_at: new Date()
    };

    if (photoMapping) {
      console.log('Сохранение упрощенного photoMapping:', {
        mappingType: photoMapping.mappingType,
        totalFiles: photoMapping.totalFiles,
        mappedCount: photoMapping.mappedCount
      });
      
      try {
        const minimalMapping = {
          mappingType: photoMapping.mappingType,
          totalFiles: photoMapping.totalFiles || 0,
          mappedCount: photoMapping.mappedCount || 0,
          savedAt: new Date().toISOString()
        };
        
        updateData.photo_mapping = JSON.stringify(minimalMapping);
        console.log('Упрощенный photoMapping успешно подготовлен');
      } catch (error) {
        console.error('Ошибка сериализации photoMapping:', error);
        return NextResponse.json(
          { error: 'Ошибка сериализации данных фотографий' },
          { status: 400 }
        );
      }
    }
    
    if (photoData) {
      console.log('Сохранение photoData:', photoData);
      try {
        updateData.photo_data = JSON.stringify(photoData);
        console.log('photoData успешно подготовлен');
      } catch (error) {
        console.error('Ошибка сериализации photoData:', error);
        return NextResponse.json(
          { error: 'Ошибка сериализации данных фотографий' },
          { status: 400 }
        );
      }
    }

    // Обновляем категорию
    console.log('Обновление категории с данными фотографий:', updateData);
    
    const updatedCategory = await prisma.frontendCategory.update({
      where: { id: categoryId },
      data: updateData
    });
    
    console.log('Категория успешно обновлена с фотографиями:', updatedCategory.id);
    
    return NextResponse.json({
      success: true,
      message: 'Данные фотографий успешно сохранены',
      categoryId: updatedCategory.id,
      photoMapping: photoMapping ? {
        mappingType: photoMapping.mappingType,
        totalFiles: photoMapping.totalFiles,
        mappedCount: photoMapping.mappedCount
      } : null,
      photoData: photoData ? {
        totalCount: photoData.totalCount,
        filesCount: photoData.files?.length || 0
      } : null
    });

  } catch (error) {
    console.error('Общая ошибка сохранения фотографий:', error);
    return NextResponse.json(
      { error: `Ошибка при сохранении фотографий: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
