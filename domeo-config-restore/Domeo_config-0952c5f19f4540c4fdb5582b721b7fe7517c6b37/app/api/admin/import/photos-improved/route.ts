import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { validateImageFile, generateUniqueFileName } from '../../../../../lib/validation/file-validation';
import { uploadRateLimiter, getClientIP, createRateLimitResponse } from '../../../../../lib/security/rate-limiter';

const prisma = new PrismaClient();

// POST /api/admin/import/photos-improved - Улучшенная загрузка фотографий товаров
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!uploadRateLimiter.isAllowed(clientIP)) {
      return createRateLimitResponse(uploadRateLimiter, clientIP);
    }

    const formData = await request.formData();
    const photos = formData.getAll('photos') as File[];
    const category = formData.get('category') as string;
    const mappingProperty = formData.get('mapping_property') as string;

    console.log('=== УЛУЧШЕННАЯ ЗАГРУЗКА ФОТО ===');
    console.log('Количество фото:', photos.length);
    console.log('Категория:', category);
    console.log('Свойство для привязки:', mappingProperty);

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Не выбраны фотографии для загрузки' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Не указана категория для загрузки' },
        { status: 400 }
      );
    }

    if (!mappingProperty) {
      return NextResponse.json(
        { success: false, message: 'Не указано свойство для привязки фото' },
        { status: 400 }
      );
    }

    // Создаем директорию для загрузки
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products', category);
    
    try {
      await mkdir(uploadDir, { recursive: true });
      console.log('Директория создана:', uploadDir);
    } catch (error) {
      console.log('Директория уже существует или ошибка создания:', error);
    }

    const uploadedPhotos: any[] = [];
    const uploadErrors: string[] = [];

    // Загружаем фотографии
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        console.log(`Загружаем фото ${i + 1}/${photos.length}: ${photo.name}`);
        
        // Валидация файла
        const validation = validateImageFile(photo);
        if (!validation.isValid) {
          uploadErrors.push(`Ошибка валидации ${photo.name}: ${validation.error}`);
          continue;
        }
        
        const bytes = await photo.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Генерируем безопасное уникальное имя файла
        const fileName = generateUniqueFileName(photo.name);
        const filePath = path.join(uploadDir, fileName);
        
        await writeFile(filePath, buffer);
        
        // Сохраняем информацию о загруженной фотографии
        uploadedPhotos.push({
          originalName: photo.name,
          fileName: fileName,
          filePath: `/uploads/products/${category}/${fileName}`,
          size: photo.size,
          type: photo.type
        });
        
        console.log(`Photo ${i} uploaded successfully:`, fileName, 'size:', photo.size);
        
      } catch (error) {
        console.error(`Error uploading photo ${i}:`, error);
        uploadErrors.push(`Ошибка при загрузке ${photo.name}: ${error.message}`);
      }
    }
    
    // Привязываем фото к товарам
    let linkedPhotos = 0;
    if (mappingProperty && uploadedPhotos.length > 0) {
      console.log('Привязка фото к товарам по свойству:', mappingProperty);
      
      try {
        // Получаем все товары из категории
        const products = await prisma.product.findMany({
          where: {
            catalog_category_id: category
          },
          select: {
            id: true,
            sku: true,
            properties_data: true
          }
        });
        
        console.log(`Найдено ${products.length} товаров в категории ${category}`);
        
        for (const photo of uploadedPhotos) {
          // Извлекаем имя файла без расширения для поиска
          const fileNameWithoutExt = path.parse(photo.originalName).name;
          
          console.log(`\n=== ОБРАБОТКА ФОТО: ${photo.originalName} ===`);
          console.log(`Имя файла без расширения: ${fileNameWithoutExt}`);
          
          // Находим товары с таким же значением свойства
          const matchingProducts = products.filter(product => {
            try {
              const properties = JSON.parse(product.properties_data || '{}');
              const propertyValue = properties[mappingProperty];
              
              if (propertyValue) {
                const valueStr = propertyValue.toString().trim();
                const fileNameStr = fileNameWithoutExt.trim();
                const exactMatch = valueStr === fileNameStr;
                
                if (exactMatch) {
                  console.log(`✅ НАЙДЕНО СОВПАДЕНИЕ для товара ${product.sku}: "${valueStr}" === "${fileNameStr}"`);
                  return true;
                }
              }
              
              return false;
            } catch (error) {
              console.error(`Ошибка при обработке товара ${product.sku}:`, error);
              return false;
            }
          });
          
          console.log(`Найдено ${matchingProducts.length} товаров для фото ${photo.originalName}`);
          
          // Привязываем фото ко всем найденным товарам
          for (const product of matchingProducts) {
            try {
              const currentProperties = JSON.parse(product.properties_data || '{}');
              
              // Инициализируем массив photos если его нет
              if (!currentProperties.photos) {
                currentProperties.photos = [];
              }
              
              // Извлекаем точное имя файла без расширения
              const exactFileName = photo.originalName.replace(/\.[^/.]+$/, ""); // Убираем расширение
              
              // Ищем существующее фото с таким же именем (включая суффиксы)
              const existingPhotoIndex = currentProperties.photos.findIndex((existingPhoto: string) => {
                const existingFileName = existingPhoto.split('/').pop()?.replace(/\.[^/.]+$/, "") || '';
                return existingFileName === exactFileName;
              });
              
              if (existingPhotoIndex !== -1) {
                // Заменяем существующее фото
                currentProperties.photos[existingPhotoIndex] = photo.filePath;
                
                await prisma.product.update({
                  where: { id: product.id },
                  data: {
                    properties_data: JSON.stringify(currentProperties)
                  }
                });
                
                linkedPhotos++;
                console.log(`🔄 Фото ${photo.originalName} заменено для товара ${product.sku}`);
              } else {
                // Добавляем новое фото в галерею
                currentProperties.photos.push(photo.filePath);
                
                await prisma.product.update({
                  where: { id: product.id },
                  data: {
                    properties_data: JSON.stringify(currentProperties)
                  }
                });
                
                linkedPhotos++;
                console.log(`✅ Фото ${photo.originalName} добавлено в галерею товара ${product.sku}`);
              }
            } catch (error) {
              console.error(`Ошибка при привязке фото к товару ${product.sku}:`, error);
            }
          }
        }
        
      } catch (error) {
        console.error('Ошибка при привязке фото к товарам:', error);
      }
    }

    const result = {
      success: true,
      uploaded: uploadedPhotos.length,
      linked: linkedPhotos,
      errors: uploadErrors.length,
      details: uploadErrors,
      photos: uploadedPhotos.map(photo => ({
        originalName: photo.originalName,
        fileName: photo.fileName,
        filePath: photo.filePath,
        size: photo.size
      }))
    };

    console.log('=== РЕЗУЛЬТАТ ЗАГРУЗКИ ===');
    console.log('Загружено файлов:', result.uploaded);
    console.log('Привязано к товарам:', result.linked);
    console.log('Ошибок:', result.errors);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Ошибка при загрузке фотографий:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при загрузке фотографий', error: (error as Error).message },
      { status: 500 }
    );
  }
}
