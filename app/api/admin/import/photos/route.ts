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
      
      // ЛОГИКА ОПРЕДЕЛЕНИЯ ТИПА ФОТО:
      // 1. Проверяем, есть ли в конце имя файла суффикс _N (галерея)
      // 2. Убираем суффикс _N если есть
      // 3. Преобразуем имя модели из формата фото в формат БД
      // 
      // Примеры:
      // "domeodoors_alberti4" -> модель "domeodoors_alberti_4" (обложка)
      // "domeodoors_alberti4_1" -> модель "domeodoors_alberti_4" (галерея_1)
      // "domeodoors_base_1" -> модель "domeodoors_base_1" (обложка)
      // "domeodoors_base_1_1" -> модель "domeodoors_base_1" (галерея_1)
      
      // ЛОГИКА:
      // 1. Если имя файла заканчивается на _1, _2 и т.д. (например, base_1_1, base_1_2) → ГАЛЕРЕЯ
      // 2. Если имя файла НЕ заканчивается на дополнительное _N → ОБЛОЖКА
      // 
      // Примеры:
      // "Base_1.png" → обложка (полное совпадение с значением свойства)
      // "Base_1_1.png" → галерея_1 (дополнительный _1)
      // "Base_1_2.png" → галерея_2 (дополнительный _2)
      
      // Проверяем, есть ли в конце имени файла дополнительный суффикс _N
      // Например: "d29_1" → нашли "_1" в конце, значит это галерея
      // Важно: ищем именно "_N" (подчеркивание + цифра), а не просто цифру
      const galleryMatch = nameWithoutExt.match(/_(\d+)$/);
      
      let baseName: string;
      let galleryNumber: number | null = null;
      let isCover: boolean;
      
      if (galleryMatch) {
        // Есть суффикс _N в конце - это галерея
        // Пример: "d29_1" → galleryMatch находит "_1", это галерея
        // Убираем последний суффикс _N из имени
        baseName = nameWithoutExt.slice(0, -galleryMatch[0].length);
        galleryNumber = parseInt(galleryMatch[1]);
        isCover = false;
        
        console.log(`📸 ГАЛЕРЕЯ: ${nameWithoutExt} → база "${baseName}", номер ${galleryNumber}`);
      } else {
        // НЕТ дополнительного суффикса _N - это ОБЛОЖКА
        baseName = nameWithoutExt;
        galleryNumber = null;
        isCover = true;
        
        console.log(`📷 ОБЛОЖКА: ${nameWithoutExt}`);
      }
      
      const modelName = baseName;
      
      photo.photoInfo = {
        fileName: photo.originalName,
        isCover: isCover,
        number: galleryNumber,
        baseName: modelName,
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

          // Для propertyValue ВСЕГДА сохраняем полное имя файла
          // Оно должно полностью совпадать со значением выбранного свойства
          const propertyValue = nameWithoutExt;
          
          // Сохраняем фото в property_photos
          const savedPhoto = await upsertPropertyPhoto(
            category,
            mappingProperty,
            propertyValue,
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
            
            // Для поиска по артикулу используем оригинальное имя файла без расширения
            const searchValue = mappingProperty === 'Артикул поставщика' 
              ? photo.originalName.replace(/\.[^/.]+$/, "").toLowerCase()
              : photoInfo.baseName;
            
            console.log(`Ищем товары по свойству "${mappingProperty}" = "${searchValue}"`);
            
            // Находим товары с этим значением свойства для статистики
        const products = await prisma.product.findMany({
          where: {
                catalog_category_id: category,
                properties_data: {
                  contains: `"${mappingProperty}":"${searchValue}"`
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

          // Для поиска по артикулу используем оригинальное имя файла без расширения
          const searchValue = mappingProperty === 'Артикул поставщика' 
            ? photo.originalName.replace(/\.[^/.]+$/, "").toLowerCase()
            : photoInfo.baseName;
          
          console.log(`Ищем товары по свойству "${mappingProperty}" = "${searchValue}"`);

          // Находим товары с этим значением свойства
          const products = await prisma.product.findMany({
            where: {
              catalog_category_id: category,
              properties_data: {
                contains: `"${mappingProperty}":"${searchValue}"`
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
              
              // Инициализируем структуру фото
              if (!properties.photos) {
                properties.photos = { cover: null, gallery: [] };
              } else if (Array.isArray(properties.photos)) {
                // Миграция старых данных: массив -> объект
                const oldPhotos = properties.photos;
                properties.photos = {
                  cover: oldPhotos[0] || null,
                  gallery: oldPhotos.slice(1)
                };
              }
              
              // Определяем, куда добавлять фото
              if (photo.photoInfo.isCover) {
                // Обложка - заменяем существующую
                properties.photos.cover = photo.filePath;
                console.log(`📸 Обложка для товара ${product.sku}: ${photo.filePath}`);
              } else if (photo.photoInfo.number) {
                // Галерея - добавляем в массив
                const galleryNumber = photo.photoInfo.number;
                // Заполняем массив null'ами если нужно
                while (properties.photos.gallery.length < galleryNumber - 1) {
                  properties.photos.gallery.push(null);
                }
                properties.photos.gallery[galleryNumber - 1] = photo.filePath;
                console.log(`📸 Фото галереи ${galleryNumber} для товара ${product.sku}: ${photo.filePath}`);
              } else {
                // Без номера - добавляем в конец галереи
                properties.photos.gallery.push(photo.filePath);
              }
                
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
