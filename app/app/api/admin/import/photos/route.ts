import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { validateImageFile, generateUniqueFileName } from '../../../../../lib/validation/file-validation';
import { uploadRateLimiter, getClientIP, createRateLimitResponse } from '../../../../../lib/security/rate-limiter';

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
        console.log('Очистка существующих привязок для имен фото:', photoNamesToClean);
        
        for (const product of products) {
          try {
            const currentProperties = JSON.parse(product.properties_data || '{}');
            if (currentProperties.photos && Array.isArray(currentProperties.photos)) {
              const originalPhotosCount = currentProperties.photos.length;
              // Удаляем фото, которые содержат имена из загружаемых файлов
              currentProperties.photos = currentProperties.photos.filter((photoPath: string) => {
                const photoFileName = path.parse(photoPath).name;
                return !photoNamesToClean.some(name => photoFileName.includes(name));
              });
              
              if (currentProperties.photos.length !== originalPhotosCount) {
                await prisma.product.update({
                  where: { id: product.id },
                  data: {
                    properties_data: JSON.stringify(currentProperties)
                  }
                });
                console.log(`Очищено ${originalPhotosCount - currentProperties.photos.length} привязок фото для товара ${product.sku}`);
              }
            }
          } catch (error) {
            console.error(`Ошибка при очистке фото для товара ${product.sku}:`, error);
          }
        }

        for (const photo of uploadedPhotos) {
          // Извлекаем имя файла без расширения для поиска
          const fileNameWithoutExt = path.parse(photo.originalName).name;
          
          console.log(`\n=== ОБРАБОТКА ФОТО: ${photo.originalName} ===`);
          console.log(`Имя файла без расширения: ${fileNameWithoutExt}`);
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
                  const fileNameStr = fileNameWithoutExt.trim();
                  
                  console.log(`Проверка товара ${product.sku} по ключу "${key}":`, {
                    propertyValue: valueStr,
                    fileNameWithoutExt: fileNameStr,
                    exactMatch: valueStr === fileNameStr
                  });
                  
                  // Проверяем ТОЛЬКО точное совпадение
                  const exactMatch = valueStr === fileNameStr;
                  
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
              currentProperties.photos = currentProperties.photos || [];
              
              // Проверяем, не привязано ли уже это фото к товару
              // Ищем по имени файла (без полного пути), так как путь может отличаться
              const isAlreadyLinked = currentProperties.photos.some((existingPhoto: string) => {
                const existingFileName = path.parse(existingPhoto).name;
                const newFileName = path.parse(photo.filePath).name;
                return existingFileName === newFileName;
              });
              
              if (!isAlreadyLinked) {
                currentProperties.photos.push(photo.filePath);
                
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
                
                console.log(`Фото ${photo.originalName} привязано к товару ${product.sku}`);
              } else {
                console.log(`Фото ${photo.originalName} уже привязано к товару ${product.sku}`);
                photo.matchedProducts.push({
                  id: product.id,
                  sku: product.sku,
                  name: product.name,
                  alreadyLinked: true
                });
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка при загрузке фотографий:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при загрузке фотографий' },
      { status: 500 }
    );
  }
}