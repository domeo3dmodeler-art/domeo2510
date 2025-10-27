import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PropertyPhotoInfo {
  id: string;
  categoryId: string;
  propertyName: string;
  propertyValue: string;
  photoPath: string;
  photoType: string;
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhotoStructure {
  cover: string | null;
  gallery: string[];
}

/**
 * Получает фото для конкретного значения свойства
 */
export async function getPropertyPhotos(
  categoryId: string,
  propertyName: string,
  propertyValue: string
): Promise<PropertyPhotoInfo[]> {
  try {
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId,
        propertyName,
        propertyValue
      },
      orderBy: {
        photoType: 'asc'
      }
    });

    return photos;
  } catch (error) {
    console.error('Ошибка получения фото свойства:', error);
    return [];
  }
}

/**
 * Структурирует фото в обложку и галерею
 */
export function structurePropertyPhotos(photos: PropertyPhotoInfo[]): PhotoStructure {
  // Сначала ищем фото с явным типом "cover"
  const coverPhoto = photos.find(photo => photo.photoType === 'cover');
  
  if (coverPhoto) {
    // Если есть явная обложка, остальные фото - галерея
    const gallery = photos
      .filter(photo => photo.photoPath !== coverPhoto.photoPath)
      .map(photo => photo.photoPath);
    
    return {
      cover: coverPhoto.photoPath,
      gallery
    };
  }
  
  // Если нет явной обложки, выбираем самое короткое имя файла
  const sortedPhotos = [...photos].sort((a, b) => {
    const filenameA = a.photoPath.split('/').pop() || '';
    const filenameB = b.photoPath.split('/').pop() || '';
    
    // Сортируем по длине имени файла (короткое = обложка)
    if (filenameA.length !== filenameB.length) {
      return filenameA.length - filenameB.length;
    }
    
    // Если длины равны, сортируем по имени
    return filenameA.localeCompare(filenameB);
  });

  // Первое фото (с самым коротким именем) = обложка
  const cover = sortedPhotos.length > 0 ? sortedPhotos[0].photoPath : null;
  
  // Остальные фото = галерея
  const gallery = sortedPhotos.length > 1 
    ? sortedPhotos.slice(1).map(photo => photo.photoPath) 
    : [];

  return {
    cover,
    gallery
  };
}

/**
 * Добавляет или обновляет фото для свойства
 */
export async function upsertPropertyPhoto(
  categoryId: string,
  propertyName: string,
  propertyValue: string,
  photoPath: string,
  photoType: string = 'cover',
  metadata?: {
    originalFilename?: string;
    fileSize?: number;
    mimeType?: string;
  }
): Promise<PropertyPhotoInfo | null> {
  try {
    const photo = await prisma.propertyPhoto.upsert({
      where: {
        categoryId_propertyName_propertyValue_photoType: {
          categoryId,
          propertyName,
          propertyValue,
          photoType
        }
      },
      update: {
        photoPath,
        originalFilename: metadata?.originalFilename,
        fileSize: metadata?.fileSize,
        mimeType: metadata?.mimeType,
        updatedAt: new Date()
      },
      create: {
        categoryId,
        propertyName,
        propertyValue,
        photoPath,
        photoType,
        originalFilename: metadata?.originalFilename,
        fileSize: metadata?.fileSize,
        mimeType: metadata?.mimeType
      }
    });

    return photo;
  } catch (error) {
    console.error('Ошибка добавления фото свойства:', error);
    return null;
  }
}

/**
 * Удаляет фото для свойства
 */
export async function deletePropertyPhotos(
  categoryId: string,
  propertyName: string,
  propertyValue: string,
  photoType?: string
): Promise<number> {
  try {
    const where: any = {
      categoryId,
      propertyName,
      propertyValue
    };

    if (photoType) {
      where.photoType = photoType;
    }

    const result = await prisma.propertyPhoto.deleteMany({
      where
    });

    return result.count;
  } catch (error) {
    console.error('Ошибка удаления фото свойства:', error);
    return 0;
  }
}

/**
 * Получает все уникальные значения свойства с фото
 */
export async function getPropertyValuesWithPhotos(
  categoryId: string,
  propertyName: string
): Promise<string[]> {
  try {
    const photos = await prisma.propertyPhoto.findMany({
      where: {
        categoryId,
        propertyName
      },
      select: {
        propertyValue: true
      },
      distinct: ['propertyValue']
    });

    return photos.map(photo => photo.propertyValue);
  } catch (error) {
    console.error('Ошибка получения значений свойства с фото:', error);
    return [];
  }
}

/**
 * Получает статистику фото для категории
 */
export async function getCategoryPhotosStats(categoryId: string) {
  try {
    const stats = await prisma.propertyPhoto.groupBy({
      by: ['propertyName'],
      where: {
        categoryId
      },
      _count: {
        id: true
      }
    });

    const totalPhotos = await prisma.propertyPhoto.count({
      where: {
        categoryId
      }
    });

    return {
      totalPhotos,
      byProperty: stats.map(stat => ({
        propertyName: stat.propertyName,
        count: stat._count.id
      }))
    };
  } catch (error) {
    console.error('Ошибка получения статистики фото:', error);
    return {
      totalPhotos: 0,
      byProperty: []
    };
  }
}
