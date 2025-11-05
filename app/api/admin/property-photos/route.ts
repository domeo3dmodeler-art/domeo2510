import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/property-photos - Получить фото для свойств
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const propertyName = searchParams.get('propertyName');
    const propertyValue = searchParams.get('propertyValue');

    const where: any = {};
    
    if (categoryId) where.categoryId = categoryId;
    if (propertyName) where.propertyName = propertyName;
    if (propertyValue) where.propertyValue = propertyValue;

    const photos = await prisma.propertyPhoto.findMany({
      where,
      orderBy: [
        { propertyName: 'asc' },
        { propertyValue: 'asc' },
        { photoType: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      photos,
      count: photos.length
    });

  } catch (error) {
    console.error('Ошибка получения фото свойств:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при получении фото свойств' },
      { status: 500 }
    );
  }
}

// POST /api/admin/property-photos - Добавить фото для свойства
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      categoryId,
      propertyName,
      propertyValue,
      photoPath,
      photoType = 'cover',
      originalFilename,
      fileSize,
      mimeType
    } = body;

    if (!categoryId || !propertyName || !propertyValue || !photoPath) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные поля: categoryId, propertyName, propertyValue, photoPath' },
        { status: 400 }
      );
    }

    // Проверяем, есть ли уже фото для этого свойства и типа
    const existingPhoto = await prisma.propertyPhoto.findUnique({
      where: {
        categoryId_propertyName_propertyValue_photoType: {
          categoryId,
          propertyName,
          propertyValue,
          photoType
        }
      }
    });

    let photo;
    if (existingPhoto) {
      // Обновляем существующее фото
      photo = await prisma.propertyPhoto.update({
        where: { id: existingPhoto.id },
        data: {
          photoPath,
          originalFilename,
          fileSize,
          mimeType,
          updatedAt: new Date()
        }
      });
    } else {
      // Создаем новое фото
      photo = await prisma.propertyPhoto.create({
        data: {
          categoryId,
          propertyName,
          propertyValue,
          photoPath,
          photoType,
          originalFilename,
          fileSize,
          mimeType
        }
      });
    }

    return NextResponse.json({
      success: true,
      photo,
      message: existingPhoto ? 'Фото обновлено' : 'Фото добавлено'
    });

  } catch (error) {
    console.error('Ошибка добавления фото свойства:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при добавлении фото свойства' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/property-photos - Удалить фото свойства
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const categoryId = searchParams.get('categoryId');
    const propertyName = searchParams.get('propertyName');
    const propertyValue = searchParams.get('propertyValue');
    const photoType = searchParams.get('photoType');

    if (id) {
      // Удаляем конкретное фото по ID
      await prisma.propertyPhoto.delete({
        where: { id }
      });
    } else if (categoryId && propertyName && propertyValue) {
      // Удаляем все фото для конкретного свойства
      const where: any = {
        categoryId,
        propertyName,
        propertyValue
      };
      
      if (photoType) {
        where.photoType = photoType;
      }

      await prisma.propertyPhoto.deleteMany({
        where
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Не указаны параметры для удаления' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Фото удалено'
    });

  } catch (error) {
    console.error('Ошибка удаления фото свойства:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при удалении фото свойства' },
      { status: 500 }
    );
  }
}
