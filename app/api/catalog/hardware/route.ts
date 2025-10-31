import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'kits' или 'handles'

    if (type === 'kits') {
      // Получаем комплекты фурнитуры
      const kits = await prisma.product.findMany({
        where: {
          catalog_category_id: 'cmg50xchh0024v7mn2b5ri4qy', // ID категории "Комплекты фурнитуры"
        },
        select: {
          id: true,
          name: true,
          properties_data: true,
        },
      });

      const formattedKits = kits.map(kit => {
        let props;
        try {
          props = typeof kit.properties_data === 'string' 
            ? JSON.parse(kit.properties_data) 
            : kit.properties_data;
        } catch (parseError) {
          console.error('Error parsing kit properties:', parseError, 'Data:', kit.properties_data);
          props = {};
        }
        return {
          id: kit.id,
          name: props['Наименование для Web'] || kit.name,
          description: props['Описание комплекта для Web'] || '',
          price: parseFloat(props['Группа_цена'] || '0'),
          priceGroup: props['Ценовая группа'] || '',
          isBasic: props['Ценовая группа'] === 'Базовый',
        };
      });

      return NextResponse.json(formattedKits);
    }

    if (type === 'handles') {
      // Получаем ручки
      const handles = await prisma.product.findMany({
        where: {
          catalog_category_id: 'cmg50xchb001wv7mnbzhw5y9r', // ID категории "Ручки"
        },
        select: {
          id: true,
          name: true,
          properties_data: true,
        },
      });

      const formattedHandles = handles.map(handle => {
        let props;
        try {
          props = typeof handle.properties_data === 'string' 
            ? JSON.parse(handle.properties_data) 
            : handle.properties_data;
        } catch (parseError) {
          console.error('Error parsing handle properties:', parseError, 'Data:', handle.properties_data);
          props = {};
        }
        
        // Получаем фотографии из properties_data
        let photos = [];
        
        // Проверяем разные форматы хранения фото
        if (props.photos) {
          if (typeof props.photos === 'object' && props.photos.cover) {
            // Формат { cover: "...", gallery: [...] }
            const coverPhoto = props.photos.cover;
            const galleryPhotos = props.photos.gallery || [];
            
            // Нормализуем пути к фото
            const normalizePhoto = (photo: string) => {
              if (!photo) return null;
              // Если путь начинается с "products/", добавляем "/uploads/"
              if (photo.startsWith('products/')) {
                return `/uploads/${photo}`;
              }
              // Если уже начинается с "/uploads/", возвращаем как есть
              if (photo.startsWith('/uploads/')) {
                return photo;
              }
              // Если не начинается с "/", добавляем префикс
              if (!photo.startsWith('/')) {
                return `/uploads/products/${photo}`;
              }
              return photo;
            };
            
            photos = [
              normalizePhoto(coverPhoto),
              ...galleryPhotos.map(normalizePhoto)
            ].filter(Boolean);
          } else if (Array.isArray(props.photos)) {
            // Массив фото - нормализуем каждый
            photos = props.photos.map((photo: string) => {
              if (!photo) return null;
              if (photo.startsWith('products/')) {
                return `/uploads/${photo}`;
              }
              if (photo.startsWith('/uploads/')) {
                return photo;
              }
              if (!photo.startsWith('/')) {
                return `/uploads/products/${photo}`;
              }
              return photo;
            }).filter(Boolean);
          }
        }
        
        return {
          id: handle.id,
          name: props['Domeo_наименование для Web'] || props['Domeo_наименование ручки_1С'] || handle.name,
          group: props['Группа'] || 'Без группы',
          price: parseFloat(props['Domeo_цена группы Web'] || '0'),
          isBasic: props['Группа'] === 'Базовый',
          showroom: props['Наличие в шоуруме'] === 'да' || props['Наличие в шоуруме'] === 'Да',
          supplier: props['Поставщик'] || '',
          article: props['Фабрика_артикул'] || '',
          factoryName: props['Фабрика_наименование'] || '',
          photos: photos,
        };
      });

      // Группируем ручки по группам
      const groupedHandles = formattedHandles.reduce((acc, handle) => {
        const group = handle.group || 'Без группы';
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(handle);
        return acc;
      }, {} as Record<string, any[]>);

      return NextResponse.json(groupedHandles);
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error fetching hardware data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
