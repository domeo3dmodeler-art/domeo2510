import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { validateImageFile, generateUniqueFileName } from '../../../../../lib/validation/file-validation';
import { uploadRateLimiter, getClientIP, createRateLimitResponse } from '../../../../../lib/security/rate-limiter';
import { upsertPropertyPhoto, deletePropertyPhotos } from '../../../../../lib/property-photos';

const prisma = new PrismaClient();

// DELETE /api/admin/import/photos - Очистка всех привязок фото в категории
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const propertyName = searchParams.get('property_name');

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Не указана категория' },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    if (propertyName) {
      // Удаляем фото для конкретного свойства
      const result = await prisma.propertyPhoto.deleteMany({
      where: {
          categoryId: category,
          propertyName: propertyName
        }
      });
      deletedCount = result.count;
    } else {
      // Удаляем все фото в категории
      const result = await prisma.propertyPhoto.deleteMany({
        where: {
          categoryId: category
        }
      });
      deletedCount = result.count;
    }

    // Очищаем кэш
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/catalog/doors/photos`, {
        method: 'DELETE'
      });
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/catalog/doors/complete-data`, {
        method: 'DELETE'
      });
      } catch (error) {
      console.warn('Ошибка очистки кэша:', error);
    }

    return NextResponse.json({
      success: true,
      message: `Удалено ${deletedCount} фото`,
      deletedCount
    });

  } catch (error) {
    console.error('Ошибка очистки фото:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при очистке фото' },
      { status: 500 }
    );
  }
}

// POST /api/admin/import/photos - Загрузка фотографий для свойств товаров
export async function POST(request: NextRequest) {
  try {
    // Проверка rate limiting
    const clientIP = getClientIP(request);
    const isAllowed = uploadRateLimiter.isAllowed(clientIP);
    
    if (!isAllowed) {
      return createRateLimitResponse(uploadRateLimiter, clientIP);
    }

    const formData = await request.formData();
    const photos = formData.getAll('photos') as File[];
    const category = formData.get('category') as string;
    const mappingProperty = formData.get('mapping_property') as string;
    const uploadType = formData.get('upload_type') as string || 'property';

    console.log('=== ЗАГРУЗКА ФОТО ===');
    console.log('Количество фото:', photos.length);
    console.log('Категория:', category);
    console.log('Свойство для привязки:', mappingProperty);
    console.log('Тип загрузки:', uploadType);

    if (!category || !mappingProperty) {
      return NextResponse.json(
        { success: false, message: 'Не указаны категория или свойство для привязки' },
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
        
        // Сохраняем информацию о загруженной фотографии (будем определять тип позже)
        const uploadedPhoto = {
          originalName: photo.name,
          fileName: fileName,
          filePath: `products/${category}/${fileName}`, // Без /uploads, т.к. API добавляет это
          size: photo.size,
          type: photo.type,
          photoInfo: null // Определим после загрузки всех файлов
        };
        
        uploadedPhotos.push(uploadedPhoto);
        
        console.log(`Photo ${i} uploaded successfully:`, fileName);
        
      } catch (error) {
        console.error(`Error uploading photo ${i}:`, error);
        uploadErrors.push(`Ошибка при загрузке ${photo.name}: ${error.message}`);
      }
    }
    
    // После загрузки всех файлов определяем тип фото (обложка/галерея)
    // НОВАЯ ЛОГИКА:
    // 1. Для КАЖДОГО файла определяем базовое имя модели, убирая ВСЕ суффиксы _N
    // 2. Если файл БЕЗ _N (точное совпадение с базовым именем) = обложка (cover)
    // 3. Если файл с _N (например, X_1, X_2) = галерея (gallery_N)
    // 4. Регистр не учитывается
    //
    // Примеры:
    // "DomeoDoors_Base_1.png" -> базовое имя "domeodoors_base_1" -> обложка
    // "DomeoDoors_Base_1_1.png" -> базовое имя "domeodoors_base_1" -> галерея_1
    // "DomeoDoors_Base_1_2.png" -> базовое имя "domeodoors_base_1" -> галерея_2
    // "DomeoDoors_Base_2.png" -> базовое имя "domeodoors_base_2" -> обложка
    // "DomeoDoors_Base_2_1.png" -> базовое имя "domeodoors_base_2" -> галерея_1
    
    console.log('\n=== ОПРЕДЕЛЕНИЕ ТИПА ФОТО ===');
    console.log('Всего файлов:', uploadedPhotos.length);
    
    for (const photo of uploadedPhotos) {
      const nameWithoutExt = photo.originalName.replace(/\.[^/.]+$/, "").toLowerCase();
      
      // НОВАЯ ЛОГИКА:
      // Фото: DomeoDoors_Alberti4 → модель: DomeoDoors_Alberti_4
      // Фото: DomeoDoors_Alberti4_1 → галерея для DomeoDoors_Alberti_4
      
      // Проверяем, есть ли в конце паттерн _<цифра> (для галереи)
      const galleryMatch = nameWithoutExt.match(/^(.+?)_(\d+)$/);
      
      let photoBaseName; // Имя модели в файле (Alberti4)
      let modelName; // Имя модели в БД (Alberti_4)
      let galleryNumber;
      let isCover;
      
      if (galleryMatch) {
        // Есть суффикс _N в конце - это ГАЛЕРЕЯ
        photoBaseName = galleryMatch[1]; // DomeoDoors_Alberti4
        galleryNumber = parseInt(galleryMatch[2]);
        isCover = false;
      } else {
        // НЕТ суффикса _N - это ОБЛОЖКА
        photoBaseName = nameWithoutExt;
        galleryNumber = null;
        isCover = true;
      }
      
      // Преобразуем имя фото в имя модели:
      // DomeoDoors_Alberti4 → DomeoDoors_Alberti_4
      // Правило: последняя цифра после буквы → _N
      const modelMatch = photoBaseName.match(/^(.+)([a-z])(\d+)$/);
      if (modelMatch) {
        const prefix = modelMatch[1]; // "domeodoors_alberti"
        const letter = modelMatch[2]; // "i"
        const number = modelMatch[3]; // "4"
        modelName = `${prefix}${letter}_${number}`; // "domeodoors_alberti_4"
      } else {
        modelName = photoBaseName; // Оставляем как есть, если не найдено
      }
      
      photo.photoInfo = {
        fileName: photo.originalName,
        isCover: isCover,
        number: galleryNumber,
        baseName: modelName, // Используем преобразованное имя модели
        isGallery: !isCover
      };
      
      if (isCover) {
        console.log(`✅ Обложка: ${photo.originalName} -> модель "${modelName}"`);
      } else {
        console.log(`📸 Галерея ${galleryNumber}: ${photo.originalName} -> модель "${modelName}"`);
      }
    }
    
    console.log('\n=== КОНЕЦ ОПРЕДЕЛЕНИЯ ТИПА ===\n');
    
    // Привязываем фото к товарам или свойствам
    let linkedPhotos = 0;
    const linkedDetails: any[] = [];

    if (mappingProperty && uploadedPhotos.length > 0) {
      if (uploadType === 'property') {
        console.log('Привязка фото к свойствам товаров (property_photos)...');
        
        for (const photo of uploadedPhotos) {
          const { photoInfo } = photo;
          
          // Проверяем, что photoInfo был установлен
          if (!photoInfo) {
            console.error(`❌ photoInfo не установлен для ${photo.originalName}`);
            continue;
          }
          
          console.log(`\n=== ОБРАБОТКА ФОТО: ${photo.originalName} ===`);
          console.log(`Тип фото: ${photoInfo.isCover ? 'ОБЛОЖКА' : 'ГАЛЕРЕЯ'}`);
          console.log(`Базовое имя: ${photoInfo.baseName}`);
          console.log(`Номер: ${photoInfo.number || 'N/A'}`);

          // Определяем тип фото для базы данных
          const photoType = photoInfo.isCover 
            ? 'cover' 
            : (photoInfo.number ? `gallery_${photoInfo.number}` : 'cover');

          // Сохраняем фото в property_photos
          const savedPhoto = await upsertPropertyPhoto(
            category,
            mappingProperty,
            photoInfo.baseName,
            photo.filePath,
            photoType,
            {
              originalFilename: photo.originalName,
              fileSize: photo.size,
              mimeType: photo.type
            }
          );

          if (savedPhoto) {
            linkedPhotos++;
            
            // Находим товары с этим значением свойства для статистики
        const products = await prisma.product.findMany({
          where: {
                catalog_category_id: category,
                properties_data: {
                  contains: `"${mappingProperty}":"${photoInfo.baseName}"`
                }
          },
          select: {
            id: true,
            sku: true,
                name: true
              }
            });

            linkedDetails.push({
              fileName: photo.originalName,
              message: `Привязано к ${products.length} товарам`,
              productsLinked: products.length,
              matchedProducts: products.map(p => ({
                id: p.id,
                sku: p.sku,
                name: p.name
              }))
            });

            console.log(`✅ Фото ${photo.originalName} привязано к свойству ${mappingProperty}="${photoInfo.baseName}"`);
          } else {
            console.error(`❌ Ошибка сохранения фото ${photo.originalName}`);
          }
        }
      } else {
        console.log('Привязка фото к товарам (properties_data)...');

        for (const photo of uploadedPhotos) {
          const { photoInfo } = photo;
          
          // Проверяем, что photoInfo был установлен
          if (!photoInfo) {
            console.error(`❌ photoInfo не установлен для ${photo.originalName}`);
            continue;
          }
          
          console.log(`\n=== ОБРАБОТКА ФОТО: ${photo.originalName} ===`);
          console.log(`Базовое имя: ${photoInfo.baseName}`);

          // Находим товары с этим значением свойства
          const products = await prisma.product.findMany({
            where: {
              catalog_category_id: category,
              properties_data: {
                contains: `"${mappingProperty}":"${photoInfo.baseName}"`
              }
            },
            select: {
              id: true,
              sku: true,
              name: true,
              properties_data: true
            }
          });

          let productsUpdated = 0;
          for (const product of products) {
            try {
              const properties = JSON.parse(product.properties_data || '{}');
              if (!properties.photos) {
                properties.photos = [];
              }
              
              // Добавляем фото к товару
              properties.photos.push(photo.filePath);
                
                await prisma.product.update({
                  where: { id: product.id },
                  data: {
                  properties_data: JSON.stringify(properties)
                }
              });
              
              productsUpdated++;
            } catch (error) {
              console.error(`Ошибка обновления товара ${product.sku}:`, error);
            }
          }

          if (productsUpdated > 0) {
                linkedPhotos++;
            linkedDetails.push({
              fileName: photo.originalName,
              message: `Привязано к ${productsUpdated} товарам`,
              productsLinked: productsUpdated,
              matchedProducts: products.slice(0, productsUpdated).map(p => ({
                id: p.id,
                sku: p.sku,
                name: p.name
              }))
            });

            console.log(`✅ Фото ${photo.originalName} привязано к ${productsUpdated} товарам`);
          }
        }
      }
    }

    // Очищаем кэш
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/catalog/doors/photos`, {
        method: 'DELETE'
      });
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/catalog/doors/complete-data`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn('Ошибка очистки кэша:', error);
    }

    const result = {
      success: true,
      uploaded: uploadedPhotos.length,
      linked: linkedPhotos,
      errors: uploadErrors.length,
      uploadErrors,
      linkedDetails,
      photos: uploadedPhotos,
      category,
      upload_dir: uploadDir,
      mapping_property: mappingProperty
    };

        console.log('=== РЕЗУЛЬТАТ ЗАГРУЗКИ ===');
    console.log(`Загружено файлов: ${result.uploaded}`);
    console.log(`Привязано к ${uploadType === 'property' ? 'свойствам' : 'товарам'}: ${result.linked}`);
    console.log(`Ошибок: ${result.errors}`);

        return NextResponse.json(result);

  } catch (error) {
    console.error('Критическая ошибка загрузки фото:', error);
    return NextResponse.json(
      { success: false, message: 'Критическая ошибка сервера при загрузке фото' },
      { status: 500 }
    );
  }
}
