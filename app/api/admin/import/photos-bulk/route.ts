import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { validateImageFile, generateUniqueFileName } from '../../../../../lib/validation/file-validation';
import { uploadRateLimiter, getClientIP, createRateLimitResponse } from '../../../../../lib/security/rate-limiter';

const prisma = new PrismaClient();

// POST /api/admin/import/photos-bulk - Массовая загрузка фотографий с прогрессом
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
    const autoLink = formData.get('auto_link') === 'true';

    console.log('=== МАССОВАЯ ЗАГРУЗКА ФОТО ===');
    console.log('Количество фото:', photos.length);
    console.log('Категория:', category);
    console.log('Свойство для привязки:', mappingProperty);
    console.log('Автопривязка:', autoLink);

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
    const linkingResults: any[] = [];

    // Загружаем фотографии
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        console.log(`Загружаем фото ${i + 1}/${photos.length}: ${photo.name}`);
        
        // Валидация файла (убрали проверку размера)
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
        const photoInfo = {
          originalName: photo.name,
          fileName: fileName,
          filePath: `/uploads/products/${category}/${fileName}`,
          size: photo.size,
          type: photo.type,
          uploadedAt: new Date().toISOString()
        };
        
        uploadedPhotos.push(photoInfo);
        
        console.log(`Photo ${i + 1} uploaded successfully:`, fileName, 'size:', photo.size);
        
      } catch (error) {
        console.error(`Error uploading photo ${i + 1}:`, error);
        uploadErrors.push(`Ошибка при загрузке ${photo.name}: ${error.message}`);
      }
    }
    
    // Автоматическая привязка фото к товарам
    let linkedPhotos = 0;
    let linkedProducts = 0;
    
    if (autoLink && mappingProperty && uploadedPhotos.length > 0) {
      console.log('Автоматическая привязка фото к товарам по свойству:', mappingProperty);
      
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
                
                // Более гибкое сравнение (учитываем регистр и пробелы)
                const exactMatch = valueStr.toLowerCase() === fileNameStr.toLowerCase();
                const partialMatch = valueStr.toLowerCase().includes(fileNameStr.toLowerCase()) ||
                                   fileNameStr.toLowerCase().includes(valueStr.toLowerCase());
                
                if (exactMatch || partialMatch) {
                  console.log(`✅ НАЙДЕНО СОВПАДЕНИЕ для товара ${product.sku}: "${valueStr}" ~ "${fileNameStr}"`);
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
                
                linkingResults.push({
                  photo: photo.originalName,
                  product: product.sku,
                  status: 'replaced'
                });
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
                
                linkingResults.push({
                  photo: photo.originalName,
                  product: product.sku,
                  status: 'linked'
                });
              }
            } catch (error) {
              console.error(`Ошибка при привязке фото к товару ${product.sku}:`, error);
              
              linkingResults.push({
                photo: photo.originalName,
                product: product.sku,
                status: 'error',
                error: error.message
              });
            }
          }
          
          if (matchingProducts.length > 0) {
            linkedProducts += matchingProducts.length;
          }
        }
        
      } catch (error) {
        console.error('Ошибка при привязке фото к товарам:', error);
      }
    }

    // Статистика загрузки
    const stats = {
      totalPhotos: photos.length,
      uploadedPhotos: uploadedPhotos.length,
      uploadErrors: uploadErrors.length,
      linkedPhotos: linkedPhotos,
      linkedProducts: linkedProducts,
      linkingResults: linkingResults
    };

    console.log('✅ Массовая загрузка завершена:', stats);

    return NextResponse.json({
      success: true,
      message: `Загружено ${uploadedPhotos.length} из ${photos.length} фото`,
      stats: stats,
      uploadedPhotos: uploadedPhotos,
      uploadErrors: uploadErrors,
      linkingResults: linkingResults
    });

  } catch (error) {
    console.error('Ошибка при массовой загрузке фото:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при загрузке фото' },
      { status: 500 }
    );
  }
}
