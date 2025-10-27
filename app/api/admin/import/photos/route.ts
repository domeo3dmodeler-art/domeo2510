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
          filePath: `/uploads/products/${category}/${fileName}`,
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
    // ЛОГИКА:
    // 1. Группируем файлы по базовому имени (извлекаем, убирая _N в конце)
    // 2. В каждой группе файл с ИМЕНЕМ БЕЗ _N = обложка (cover)
    // 3. Файлы с _N (например, _1, _2) = галерея (gallery_N)
    // 4. Регистр не учитывается
    
    // Группируем файлы по базовому имени
    const photoGroups = new Map<string, any[]>();
    
    for (const photo of uploadedPhotos) {
      const nameWithoutExt = photo.originalName.replace(/\.[^/.]+$/, "").toLowerCase();
      
      // Извлекаем базовое имя (убираем _N в конце)
      const galleryMatch = nameWithoutExt.match(/^(.+?)_(\d+)$/);
      const baseName = galleryMatch ? galleryMatch[1] : nameWithoutExt;
      
      if (!photoGroups.has(baseName)) {
        photoGroups.set(baseName, []);
      }
      photoGroups.get(baseName)!.push({
        ...photo,
        rawName: nameWithoutExt
      });
    }
    
    // Для каждой группы определяем обложку и галерею
    console.log('\n=== ГРУППИРОВКА ФОТО ===');
    console.log('Всего групп:', photoGroups.size);
    
    for (const [baseName, group] of photoGroups.entries()) {
      console.log(`\nГруппа: ${baseName} (${group.length} файлов)`);
      
      // Ищем файл с точным совпадением базового имени (без _N) = это обложка
      let coverPhoto = null;
      
      for (const photo of group) {
        console.log(`  Проверка: ${photo.rawName} === ${baseName}? ${photo.rawName === baseName}`);
        if (photo.rawName === baseName) {
          // Точное совпадение с базовым именем = обложка
          coverPhoto = photo;
          break;
        }
      }
      
      // Устанавливаем тип для каждого фото в группе
      for (const photo of group) {
        if (photo.rawName === baseName) {
          // Точное совпадение с базовым именем = обложка
          photo.photoInfo = {
            fileName: photo.originalName,
            isCover: true,
            number: null,
            baseName: baseName,
            isGallery: false
          };
          console.log(`  ✅ Обложка: ${photo.originalName}`);
        } else {
          // Есть _N в конце = галерея
          const galleryMatch = photo.rawName.match(/^(.+?)_(\d+)$/);
          if (galleryMatch && galleryMatch[1] === baseName) {
            photo.photoInfo = {
              fileName: photo.originalName,
              isCover: false,
              number: parseInt(galleryMatch[2]),
              baseName: baseName,
              isGallery: true
            };
            console.log(`  ✅ Галерея ${galleryMatch[2]}: ${photo.originalName}`);
          } else {
            // Не должно быть такого случая, но на всякий случай
            photo.photoInfo = {
              fileName: photo.originalName,
              isCover: !coverPhoto,
              number: null,
              baseName: baseName,
              isGallery: false
            };
            console.log(`  ⚠️ Fallback (${coverPhoto ? 'галерея' : 'обложка'}): ${photo.originalName}`);
          }
        }
      }
      
      // Синхронизируем photoInfo обратно в исходный массив uploadedPhotos
      for (const groupPhoto of group) {
        const originalPhoto = uploadedPhotos.find(p => p.originalName === groupPhoto.originalName);
        if (originalPhoto) {
          originalPhoto.photoInfo = groupPhoto.photoInfo;
        }
      }
    }
    
    console.log('\n=== КОНЕЦ ГРУППИРОВКИ ===\n');
    
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
