import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { validateImageFile, generateUniqueFileName } from '../../../../../lib/validation/file-validation';
import { uploadRateLimiter, getClientIP, createRateLimitResponse } from '../../../../../lib/security/rate-limiter';
// Импортируем функции напрямую для совместимости
function parsePhotoFileName(fileName: string) {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  
  // Проверяем, есть ли номер в конце (_1, _2, etc.)
  const match = nameWithoutExt.match(/^(.+)_(\d+)$/);
  
  if (match) {
    return {
      fileName,
      isCover: false,
      number: parseInt(match[2]),
      baseName: match[1]
    };
  } else {
    return {
      fileName,
      isCover: true,
      number: null,
      baseName: nameWithoutExt
    };
  }
}

function structurePhotos(photos: string[]) {
  const coverPhotos: string[] = [];
  const galleryPhotos: { photo: string; number: number }[] = [];
  
  photos.forEach(photo => {
    const photoInfo = parsePhotoFileName(photo);
    
    if (photoInfo.isCover) {
      coverPhotos.push(photo);
    } else if (photoInfo.number !== null) {
      galleryPhotos.push({ photo, number: photoInfo.number });
    }
  });
  
  // Сортируем галерею по номерам
  galleryPhotos.sort((a, b) => a.number - b.number);
  
  return {
    cover: coverPhotos.length > 0 ? coverPhotos[0] : null,
    gallery: galleryPhotos.map(item => item.photo)
  };
}

function canAddMorePhotos(existingPhotos: string[], baseName: string): boolean {
  const galleryCount = existingPhotos
    .map(photo => parsePhotoFileName(photo))
    .filter(info => !info.isCover && info.baseName === baseName)
    .length;
  
  return galleryCount < 5;
}

const prisma = new PrismaClient();

// DELETE /api/admin/import/photos - Очистка всех привязок фото в категории
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Не указана категория для очистки' },
        { status: 400 }
      );
    }

    console.log('=== ОЧИСТКА ПРИВЯЗОК ФОТО ===');
    console.log('Категория:', category);

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

    let cleanedProducts = 0;
    let totalPhotosRemoved = 0;

    // Очищаем привязки фото у всех товаров
    for (const product of products) {
      try {
        const currentProperties = JSON.parse(product.properties_data || '{}');
        if (currentProperties.photos && Array.isArray(currentProperties.photos)) {
          const photosCount = currentProperties.photos.length;
          if (photosCount > 0) {
            currentProperties.photos = []; // Очищаем массив фото
            
            await prisma.product.update({
              where: { id: product.id },
              data: {
                properties_data: JSON.stringify(currentProperties)
              }
            });
            
            cleanedProducts++;
            totalPhotosRemoved += photosCount;
            console.log(`Очищено ${photosCount} фото у товара ${product.sku}`);
          }
        }
      } catch (error) {
        console.error(`Ошибка при очистке фото у товара ${product.sku}:`, error);
      }
    }

    const result = {
      success: true,
      message: `Очистка завершена: ${cleanedProducts} товаров очищено, удалено ${totalPhotosRemoved} привязок фото`,
      cleanedProducts: cleanedProducts,
      totalPhotosRemoved: totalPhotosRemoved,
      category: category
    };

    console.log('=== РЕЗУЛЬТАТ ОЧИСТКИ ===');
    console.log(result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при очистке привязок фото:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при очистке привязок фото' },
      { status: 500 }
    );
  }
}

// POST /api/admin/import/photos - Загрузка фотографий товаров
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

    console.log('=== ЗАГРУЗКА ФОТО ===');
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
        
        console.log(`Photo ${i} uploaded successfully:`, fileName);
        
      } catch (error) {
        console.error(`Error uploading photo ${i}:`, error);
        uploadErrors.push(`Ошибка при загрузке ${photo.name}: ${error.message}`);
      }
    }
    
    // Привязываем фото к товарам, если указано свойство для привязки
    let linkedPhotos = 0;
    if (mappingProperty && uploadedPhotos.length > 0) {
      console.log('Привязка фото к товарам по свойству:', mappingProperty);
      
      // Очищаем существующие привязки фото с такими же именами (опционально)
      // Это предотвратит накопление дублирующихся привязок при повторных загрузках
      
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
        
        if (products.length > 0) {
          console.log('Пример товара:', products[0]);
          try {
            const sampleProperties = JSON.parse(products[0].properties_data || '{}');
            console.log('Свойства примера товара:', Object.keys(sampleProperties));
            console.log(`Значение ${mappingProperty} в примере:`, sampleProperties[mappingProperty]);
          } catch (error) {
            console.error('Ошибка парсинга примера:', error);
          }
        }
        
        // Сначала очищаем существующие привязки фото с такими же именами
        const photoNamesToClean = uploadedPhotos.map(photo => path.parse(photo.originalName).name);
        console.log('Очистка существующих привязок для ТОЧНЫХ имен фото:', photoNamesToClean);
        console.log('Пример: будет удалено только фото с именем "d2", но НЕ "d2_variant" или "product_d2"');
        
        for (const product of products) {
          try {
            const currentProperties = JSON.parse(product.properties_data || '{}');
            if (currentProperties.photos && Array.isArray(currentProperties.photos)) {
              const originalPhotosCount = currentProperties.photos.length;
              
              // Удаляем фото, которые ТОЧНО совпадают с именами из загружаемых файлов
              currentProperties.photos = currentProperties.photos.filter((photoPath: string) => {
                const photoFileName = path.parse(photoPath).name;
                return !photoNamesToClean.some(name => photoFileName === name);
              });
              
              // Дополнительно удаляем несуществующие файлы
              const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products', category);
              if (fs.existsSync(uploadDir)) {
                const realFiles = fs.readdirSync(uploadDir);
                currentProperties.photos = currentProperties.photos.filter((photoPath: string) => {
                  const fileName = path.basename(photoPath);
                  return realFiles.includes(fileName);
                });
              }
              
              if (currentProperties.photos.length !== originalPhotosCount) {
                await prisma.product.update({
                  where: { id: product.id },
                  data: {
                    properties_data: JSON.stringify(currentProperties)
                  }
                });
                console.log(`Очищено ${originalPhotosCount - currentProperties.photos.length} привязок фото для товара ${product.sku} (было: ${originalPhotosCount}, стало: ${currentProperties.photos.length})`);
              }
            }
          } catch (error) {
            console.error(`Ошибка при очистке фото для товара ${product.sku}:`, error);
          }
        }

        for (const photo of uploadedPhotos) {
          // Парсим имя файла для определения типа фото
          const photoInfo = parsePhotoFileName(photo.originalName);
          
          console.log(`\n=== ОБРАБОТКА ФОТО: ${photo.originalName} ===`);
          console.log(`Тип фото: ${photoInfo.isCover ? 'ОБЛОЖКА' : 'ГАЛЕРЕЯ'}`);
          console.log(`Базовое имя: ${photoInfo.baseName}`);
          console.log(`Номер: ${photoInfo.number || 'N/A'}`);
          console.log(`Свойство для поиска: ${mappingProperty}`);
          
          // Находим ВСЕ товары с таким же значением свойства
          const matchingProducts = products.filter(product => {
            try {
              const properties = JSON.parse(product.properties_data || '{}');
              
              // Ищем по всем возможным ключам свойств (из-за проблем с кодировкой)
              let foundMatch = false;
              let matchedValue = null;
              
              // Список возможных ключей для поиска артикула
              const possibleKeys = [
                mappingProperty, // Оригинальный ключ
                'Артикул поставщика',
                'Артикул',
                'SKU',
                'sku',
                'Артикул_поставщика',
                'Артикул поставщика',
                'Supplier SKU',
                'Supplier_sku'
              ];
              
              // Также ищем по всем ключам, которые содержат "артикул" или "sku"
              const allKeys = Object.keys(properties);
              allKeys.forEach(key => {
                if (key.toLowerCase().includes('артикул') || 
                    key.toLowerCase().includes('sku') ||
                    key.toLowerCase().includes('supplier')) {
                  possibleKeys.push(key);
                }
              });
              
              // Убираем дубликаты
              const uniqueKeys = [...new Set(possibleKeys)];
              
              for (const key of uniqueKeys) {
                const propertyValue = properties[key];
                if (propertyValue) {
                  const valueStr = propertyValue.toString().trim();
                  const baseNameStr = photoInfo.baseName.trim();
                  
                  console.log(`Проверка товара ${product.sku} по ключу "${key}":`, {
                    propertyValue: valueStr,
                    baseName: baseNameStr,
                    exactMatch: valueStr === baseNameStr
                  });
                  
                  // Проверяем ТОЛЬКО точное совпадение с базовым именем
                  const exactMatch = valueStr === baseNameStr;
                  
                  if (exactMatch) {
                    foundMatch = true;
                    matchedValue = valueStr;
                    console.log(`✅ НАЙДЕНО ТОЧНОЕ СОВПАДЕНИЕ для товара ${product.sku}: ключ="${key}", значение="${valueStr}"`);
                    break;
                  }
                }
              }
              
              if (!foundMatch) {
                console.log(`❌ Совпадений не найдено для товара ${product.sku}`);
                console.log(`Доступные свойства:`, Object.keys(properties));
                console.log(`Доступные значения:`, Object.values(properties));
              }
              
              return foundMatch;
            } catch (error) {
              console.error('Ошибка парсинга свойств товара:', error);
              return false;
            }
          });
          
          console.log(`Найдено ${matchingProducts.length} товаров для фото ${photo.originalName}`);
            
          // Инициализируем счетчики для этого фото
          photo.productsLinked = 0;
          photo.matchedProducts = [];
          
          // Привязываем фото ко всем найденным товарам
          for (const product of matchingProducts) {
            try {
              const currentProperties = JSON.parse(product.properties_data || '{}');
              const existingPhotos = currentProperties.photos || [];
              
              // Структурируем существующие фото
              const photoStructure = structurePhotos(existingPhotos);
              
              // Проверяем ограничения для галереи
              if (!photoInfo.isCover && !canAddMorePhotos(existingPhotos, photoInfo.baseName)) {
                console.log(`⚠️ Достигнут лимит фото для товара ${product.sku} (базовое имя: ${photoInfo.baseName})`);
                photo.matchedProducts.push({
                  id: product.id,
                  sku: product.sku,
                  name: product.name,
                  error: 'Достигнут лимит фото (максимум 5)'
                });
                continue;
              }
              
              // Определяем, нужно ли обновлять фото
              let shouldUpdate = false;
              let updatedPhotos = [...existingPhotos];
              
              if (photoInfo.isCover) {
                // Для обложки: заменяем существующую обложку или добавляем новую
                const existingCoverIndex = updatedPhotos.findIndex(existingPhoto => {
                  const existingInfo = parsePhotoFileName(path.parse(existingPhoto).name);
                  return existingInfo.isCover && existingInfo.baseName === photoInfo.baseName;
                });
                
                if (existingCoverIndex !== -1) {
                  // Заменяем существующую обложку
                  updatedPhotos[existingCoverIndex] = photo.filePath;
                  console.log(`🔄 Заменена обложка для товара ${product.sku}`);
                } else {
                  // Добавляем новую обложку
                  updatedPhotos.unshift(photo.filePath); // Обложка всегда первая
                  console.log(`➕ Добавлена новая обложка для товара ${product.sku}`);
                }
                shouldUpdate = true;
              } else {
                // Для галереи: заменяем существующее фото с тем же номером или добавляем новое
                const existingGalleryIndex = updatedPhotos.findIndex(existingPhoto => {
                  const existingInfo = parsePhotoFileName(path.parse(existingPhoto).name);
                  return !existingInfo.isCover && 
                         existingInfo.baseName === photoInfo.baseName && 
                         existingInfo.number === photoInfo.number;
                });
                
                if (existingGalleryIndex !== -1) {
                  // Заменяем существующее фото галереи
                  updatedPhotos[existingGalleryIndex] = photo.filePath;
                  console.log(`🔄 Заменено фото галереи #${photoInfo.number} для товара ${product.sku}`);
                } else {
                  // Добавляем новое фото галереи
                  updatedPhotos.push(photo.filePath);
                  console.log(`➕ Добавлено новое фото галереи #${photoInfo.number} для товара ${product.sku}`);
                }
                shouldUpdate = true;
              }
              
              if (shouldUpdate) {
                currentProperties.photos = updatedPhotos;
                
                await prisma.product.update({
                  where: { id: product.id },
                  data: {
                    properties_data: JSON.stringify(currentProperties)
                  }
                });
                
                linkedPhotos++;
                photo.productsLinked++;
                photo.matchedProducts.push({
                  id: product.id,
                  sku: product.sku,
                  name: product.name
                });
                
                console.log(`✅ Фото ${photo.originalName} успешно обработано для товара ${product.sku}`);
              }
            } catch (error) {
              console.error(`Ошибка при привязке фото ${photo.originalName} к товару ${product.sku}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка при привязке фото к товарам:', error);
      }
    }
    
    // Создаем детальный отчет
    const details = uploadedPhotos.map(photo => ({
      fileName: photo.originalName,
      message: photo.productsLinked > 0 
        ? `Привязано к ${photo.productsLinked} товарам`
        : 'Товары не найдены для привязки',
      productsLinked: photo.productsLinked,
      matchedProducts: photo.matchedProducts || []
    }));

    // Подсчитываем количество уникальных товаров, которые получили фото
    const uniqueProductsWithPhotos = new Set();
    uploadedPhotos.forEach(photo => {
      if (photo.matchedProducts) {
        photo.matchedProducts.forEach((product: any) => {
          if (!product.alreadyLinked) {
            uniqueProductsWithPhotos.add(product.id);
          }
        });
      }
    });

    const result = {
      success: uploadErrors.length === 0,
      message: uploadErrors.length === 0 
        ? `Успешно загружено ${uploadedPhotos.length} фотографий${linkedPhotos > 0 ? `, привязано к товарам: ${linkedPhotos} привязок, уникальных товаров: ${uniqueProductsWithPhotos.size}` : ''}`
        : `Загружено ${uploadedPhotos.length} фотографий, ${uploadErrors.length} ошибок${linkedPhotos > 0 ? `, привязано к товарам: ${linkedPhotos} привязок, уникальных товаров: ${uniqueProductsWithPhotos.size}` : ''}`,
      uploaded: uploadedPhotos.length,
      linked: linkedPhotos,
      uniqueProducts: uniqueProductsWithPhotos.size,
      errors: uploadErrors.length,
      details: details,
      photos: uploadedPhotos,
      category: category,
      upload_dir: uploadDir,
      mapping_property: mappingProperty
    };

        console.log('=== РЕЗУЛЬТАТ ЗАГРУЗКИ ===');
        console.log(result);

        // Очищаем кэш калькулятора после успешной загрузки
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          
          await Promise.all([
            fetch(`${baseUrl}/api/catalog/doors/complete-data`, { method: 'DELETE' }),
            fetch(`${baseUrl}/api/catalog/doors/photos`, { method: 'DELETE' })
          ]);
          console.log('🧹 Кэш калькулятора очищен');
        } catch (error) {
          console.warn('⚠️ Не удалось очистить кэш калькулятора:', error);
        }

        return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при загрузке фотографий:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при загрузке фотографий' },
      { status: 500 }
    );
  }
}