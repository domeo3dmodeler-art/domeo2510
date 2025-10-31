import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { validateDocumentFile } from '@/lib/validation/file-validation';
import { fixAllEncoding, fixFieldsEncoding } from '@/lib/encoding-utils';
import { apiErrorHandler } from '@/lib/api-error-handler';
import { apiValidator } from '@/lib/api-validator';

const prisma = new PrismaClient();

// ===================== УНИФИЦИРОВАННЫЙ ИМПОРТ =====================

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const categoryId = formData.get("category") as string;
    const mode = formData.get("mode") as string || 'preview'; // 'preview' или 'import'
    const templateId = formData.get("templateId") as string;

    // Валидация входных данных
    if (!file) {
      return NextResponse.json({ error: "Файл не предоставлен" }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Категория не указана" }, { status: 400 });
    }

    // Валидация файла
    const validation = validateDocumentFile(file);
    if (!validation.isValid) {
      console.error('❌ Валидация файла не пройдена:', {
        filename: file.name,
        size: file.size,
        type: file.type,
        error: validation.error
      });
      return NextResponse.json({ 
        error: validation.error,
        details: {
          filename: file.name,
          size: file.size,
          type: file.type
        }
      }, { status: 400 });
    }

    console.log('🔍 Унифицированный импорт:', {
      filename: file.name,
      categoryId,
      mode,
      templateId: templateId || 'auto'
    });

    // Получаем шаблон
    let template;
    if (templateId) {
      template = await prisma.importTemplate.findUnique({
        where: { id: templateId }
      });
    } else {
      template = await prisma.importTemplate.findFirst({
        where: { 
          catalog_category_id: categoryId,
          is_active: true 
        },
        orderBy: { created_at: 'desc' }
      });
    }

    if (!template) {
      console.error('❌ Шаблон не найден для категории:', categoryId);
      
      // Проверяем, существует ли категория
      const category = await prisma.catalogCategory.findUnique({
        where: { id: categoryId },
        select: { name: true }
      });

      const errorMessage = category 
        ? `Шаблон не найден для категории "${category.name}". Создайте шаблон для этой категории перед импортом.`
        : `Категория с ID "${categoryId}" не найдена.`;

      return NextResponse.json(
        { 
          error: errorMessage,
          details: {
            categoryId,
            categoryName: category?.name || null,
            message: "Создайте шаблон импорта для этой категории через раздел 'Шаблоны' в интерфейсе импорта."
          }
        },
        { status: 400 }
      );
    }

    // Парсим поля шаблона с исправлением кодировки
    let requiredFields = JSON.parse(template.required_fields || '[]');
    let calculatorFields = JSON.parse(template.calculator_fields || '[]');
    let exportFields = JSON.parse(template.export_fields || '[]');
    let templateConfig = JSON.parse(template.template_config || '{}');
    
    // Исправляем кодировку
    requiredFields = fixFieldsEncoding(requiredFields);
    calculatorFields = fixFieldsEncoding(calculatorFields);
    exportFields = fixFieldsEncoding(exportFields);
    templateConfig = fixAllEncoding(templateConfig);

    console.log('📋 Используем шаблон:', {
      name: template.name,
      requiredFields: requiredFields.length,
      calculatorFields: calculatorFields.length,
      exportFields: exportFields.length
    });

    // Читаем файл
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawData.length < 2) {
      return NextResponse.json(
        { error: "Файл должен содержать заголовки и хотя бы одну строку данных" },
        { status: 400 }
      );
    }

    const headers = rawData[0] as string[];
    const rows = rawData.slice(1) as any[][];

    console.log('📊 Данные файла:', {
      headers: headers.length,
      rows: rows.length,
      sampleHeaders: headers.slice(0, 5)
    });

    // Исправляем кодировку заголовков
    const fixedHeaders = fixFieldsEncoding(headers);
    
    console.log('🔧 Заголовки после исправления кодировки:', fixedHeaders);

    // Валидируем заголовки - проверяем точное совпадение с шаблоном
    const availableRequiredFields = requiredFields.filter(field => fixedHeaders.includes(field));
    const missingFields = requiredFields.filter(field => !fixedHeaders.includes(field));
    
    console.log('📋 Анализ полей:', {
      requiredFields: requiredFields.length,
      availableRequiredFields: availableRequiredFields.length,
      missingFields: missingFields.length,
      availableFields: fixedHeaders
    });

    // Проверяем наличие SKU внутреннее - это минимальное требование для обновления товаров
    const hasInternalSku = fixedHeaders.includes('SKU внутреннее');
    
    // Если нет ни одного обязательного поля из шаблона И нет SKU внутреннее - ошибка
    if (availableRequiredFields.length === 0 && !hasInternalSku) {
      return NextResponse.json({
        error: "Файл не соответствует шаблону категории",
        details: {
          category: template.catalog_category?.name || 'Неизвестная категория',
          missingFields: missingFields,
          availableFields: fixedHeaders,
          templateRequiredFields: requiredFields,
          suggestion: "Файл должен содержать хотя бы 'SKU внутреннее' для обновления товаров, или все обязательные поля из шаблона. Скачайте актуальный шаблон для этой категории и используйте его структуру."
        },
        message: `Отсутствуют обязательные поля. Файл должен содержать хотя бы 'SKU внутреннее' для обновления товаров, или все обязательные поля из шаблона: ${missingFields.slice(0, 5).join(', ')}.`
      }, { status: 400 });
    }
    
    // Если нет обязательных полей, но есть SKU внутреннее - это режим обновления цен/свойств
    if (availableRequiredFields.length === 0 && hasInternalSku) {
      console.log('ℹ️ Режим обновления: найдено только SKU внутреннее, разрешаем импорт для обновления цен/свойств');
    }

    // Обрабатываем данные
    const products = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const product: any = {
          sku: '', // Будет определен из файла или сгенерирован
          name: '',
          properties_data: {},
          row_number: i + 2
        };

        // Заполняем свойства товара
        // Обрабатываем ТОЛЬКО поля из шаблона (requiredFields)
        // Поля, которые есть в файле, но отсутствуют в шаблоне - ИГНОРИРУЮТСЯ
        const properties: any = {};
        
        // Обрабатываем только поля из шаблона
        requiredFields.forEach(field => {
          // Проверяем, есть ли это поле в файле
          const headerIndex = fixedHeaders.indexOf(field);
          if (headerIndex !== -1 && row[headerIndex] !== undefined) {
            const value = row[headerIndex];
            // Игнорируем пустые значения
            if (value !== undefined && value !== null && value !== '' && value !== '-') {
              properties[field] = value;
            }
          }
          // Если поле из шаблона отсутствует в файле - пропускаем
          // При обновлении: старое значение останется в БД
          // При создании: может быть ошибка валидации, если поле обязательное
        });

        // Логирование для диагностики (только для первых 3 строк)
        if (i < 3) {
          console.log(`📋 Строка ${i + 2}: Обработано полей из шаблона: ${Object.keys(properties).length}`);
          console.log(`  Поля из шаблона (${requiredFields.length}):`, requiredFields);
          console.log(`  Поля найдены в файле (${Object.keys(properties).length}):`, Object.keys(properties));
          console.log(`  Все поля в файле (${fixedHeaders.length}):`, fixedHeaders);
        }

        // Исправляем кодировку свойств
        product.properties_data = fixAllEncoding(properties);

        // Определяем SKU внутреннее
        const internalSku = properties['SKU внутреннее'];
        if (internalSku && internalSku.trim() !== '') {
          product.sku = internalSku.trim();
          
          // Проверяем уникальность SKU во всей БД
          // Если в режиме preview - предупредим позже
          // Если в режиме import - проверим перед созданием/обновлением
        } else {
          // Генерируем автоматически уникальный SKU
          // Используем оптимизированный подход: timestamp (миллисекунды) + наносекунды + случайное число + индекс строки
          // Это обеспечивает очень высокую вероятность уникальности без проверки в БД
          const supplierSku = properties['Артикул поставщика'] || `ITEM_${i + 1}`;
          
          // Генерируем уникальный SKU с оптимизированным подходом
          // Используем timestamp + наносекунды + случайное число + индекс строки для максимальной уникальности
          const timestamp = Date.now();
          
          // Получаем наносекунды через process.hrtime для высокой точности
          let nanoSeconds = '';
          try {
            if (typeof process !== 'undefined' && process.hrtime) {
              const hrtime = process.hrtime();
              // hrtime возвращает [секунды, наносекунды]
              // Используем наносекунды как дополнительную компоненту уникальности
              nanoSeconds = hrtime[1].toString().padStart(9, '0').slice(-6); // Последние 6 цифр
            } else {
              // Fallback: используем случайное число для имитации наносекунд
              nanoSeconds = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            }
          } catch (e) {
            // Если process.hrtime недоступен, используем случайное число
            nanoSeconds = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
          }
          
          // Дополнительная случайная компонента (8 символов)
          const randomSuffix = Math.random().toString(36).substring(2, 10);
          // Индекс строки с padding (6 цифр)
          const rowIndex = (i + 1).toString().padStart(6, '0');
          // Ограничиваем артикул поставщика (20 символов)
          const supplierSkuShort = supplierSku.substring(0, 20);
          
          // Формат: SKU_timestamp_nanoSeconds_random_rowIndex_supplierSku
          // Комбинации: ~2^48 (timestamp) * 2^20 (nanoSeconds) * 2^48 (random) * 2^20 (rowIndex) = ~2^136
          // Вероятность коллизии крайне мала (< 10^-40)
          product.sku = `SKU_${timestamp}_${nanoSeconds}_${randomSuffix}_${rowIndex}_${supplierSkuShort}`;
          
          // Убираем проверку уникальности в цикле для оптимизации производительности
          // Вероятность коллизии с таким форматом практически нулевая
          // Если коллизия произойдет (крайне маловероятно), Prisma выбросит ошибку P2002 при создании
        }

        // Определяем название - ищем поле с названием во всех полях шаблона
        const nameField = requiredFields.find(field => 
          field.toLowerCase().includes('название') || 
          field.toLowerCase().includes('наименование') ||
          field.toLowerCase().includes('имя')
        );
        
        if (nameField && properties[nameField]) {
          product.name = properties[nameField];
        } else {
          product.name = 'Без названия';
        }

        // Валидация обязательных полей для нового товара
        if (!internalSku || internalSku.trim() === '') {
          // Если SKU внутреннее пустое - создается новый товар
          // Проверяем ВСЕ обязательные поля из шаблона
          const missingRequiredFields = requiredFields.filter(field => {
            // Проверяем, есть ли поле в файле И заполнено ли оно
            const hasFieldInFile = fixedHeaders.includes(field);
            const value = properties[field];
            return !hasFieldInFile || !value || value.toString().trim() === '' || value === '-';
          });

          if (missingRequiredFields.length > 0) {
            throw new Error(`Отсутствуют обязательные поля из шаблона: ${missingRequiredFields.join(', ')}`);
          }
        } else {
          // Если SKU внутреннее заполнено - это режим обновления
          // Проверяем только наличие названия
          if (!product.name || product.name === 'Без названия') {
            throw new Error('Не указано название товара');
          }
        }

        products.push(product);

      } catch (error) {
        errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          data: row
        });
      }
    }

    console.log('📦 Обработано товаров:', {
      total: products.length,
      errors: errors.length,
      sampleProducts: products.slice(0, 3).map(p => ({
        sku: p.sku,
        name: p.name,
        propertiesCount: Object.keys(p.properties_data).length,
        properties: Object.keys(p.properties_data)
      }))
    });

    // Если режим preview, возвращаем предварительный просмотр
    if (mode === 'preview') {
      // Проверяем существование товаров в БД для предупреждения о несуществующих SKU
      // SKU проверяются во всей БД (не только в категории), так как SKU должны быть уникальными глобально
      const skuChecks: Array<{ 
        sku: string; 
        exists: boolean; 
        row: number; 
        existingCategoryId?: string | null;
        existingCategoryName?: string | null;
        existingProductName?: string | null;
      }> = [];
      
      for (const product of products) {
        if (product.sku) {
          // Проверяем уникальность SKU во всей БД (не только в категории)
          const existingProduct = await prisma.product.findUnique({
            where: {
              sku: product.sku
            },
            select: { 
              id: true, 
              catalog_category_id: true,
              name: true,
              catalog_category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });
          
          skuChecks.push({
            sku: product.sku,
            exists: !!existingProduct,
            row: product.row_number || 0,
            // Добавляем информацию о категории существующего товара (если найден)
            existingCategoryId: existingProduct?.catalog_category_id || null,
            existingCategoryName: existingProduct?.catalog_category?.name || null,
            existingProductName: existingProduct?.name || null
          });
        }
      }
      
      const notFoundSkus = skuChecks.filter(check => !check.exists);
      const foundSkus = skuChecks.filter(check => check.exists);
      
      // Проверяем, есть ли SKU в других категориях (для предупреждения)
      const skusInOtherCategories = skuChecks.filter(check => 
        check.exists && 
        check.existingCategoryId && 
        check.existingCategoryId !== categoryId
      );
      
      return NextResponse.json({
        success: true,
        mode: 'preview',
        template: {
          name: template.name,
          requiredFields,
          calculatorFields,
          exportFields
        },
        data: {
          totalRows: rows.length,
          validProducts: products.length,
          errors: errors.length,
          sampleProducts: products.slice(0, 5),
          sampleErrors: errors.slice(0, 5)
        },
        skuCheck: {
          total: skuChecks.length,
          found: foundSkus.length,
          notFound: notFoundSkus.length,
          notFoundSkus: notFoundSkus.slice(0, 20), // Первые 20 для показа
          skusInOtherCategories: skusInOtherCategories.length > 0 ? skusInOtherCategories.slice(0, 20) : [], // SKU в других категориях
          warning: notFoundSkus.length > 0 
            ? `Обнаружено ${notFoundSkus.length} несуществующих SKU. Эти товары будут созданы как новые при импорте.` 
            : null,
          crossCategoryWarning: skusInOtherCategories.length > 0
            ? `ОШИБКА: Обнаружено ${skusInOtherCategories.length} SKU, которые уже существуют в других категориях. Импорт товаров из других категорий запрещен. Исправьте SKU в файле и попробуйте снова.`
            : null,
          crossCategorySkus: skusInOtherCategories.length > 0 
            ? skusInOtherCategories.map(check => ({
                sku: check.sku,
                row: check.row,
                existingCategoryName: check.existingCategoryName || 'Неизвестная категория',
                existingCategoryId: check.existingCategoryId,
                existingProductName: check.existingProductName || 'Без названия'
              }))
            : []
        }
      });
    }

    // Режим импорта - сохраняем в базу
    let importedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Проверяем существование товара по SKU внутреннему во всей БД (не только в категории)
        // SKU должен быть уникальным во всей БД товаров
        const existingProduct = await prisma.product.findUnique({
          where: {
            sku: product.sku
          },
          include: {
            catalog_category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
        
        // Если товар найден в другой категории - ЗАПРЕЩАЕМ обновление и выдаем ошибку
        if (existingProduct && existingProduct.catalog_category_id !== categoryId) {
          const existingCategoryName = existingProduct.catalog_category?.name || 'Неизвестная категория';
          const errorMessage = `SKU "${product.sku}" (товар "${existingProduct.name}") уже существует в категории "${existingCategoryName}" (ID: ${existingProduct.catalog_category_id}). Импорт товаров из других категорий запрещен. Удалите или измените SKU в файле.`;
          
          console.error(`❌ ${errorMessage}`);
          throw new Error(errorMessage);
        }

        if (existingProduct) {
          // Обновляем существующий товар - только заполненные поля
          console.log(`🔄 Обновление товара: SKU="${product.sku}", ID=${existingProduct.id}`);
          
          const updateData: any = {
            updated_at: new Date()
          };

          // Обновляем название, если оно указано
          if (product.name && product.name !== 'Без названия') {
            updateData.name = product.name;
            console.log(`  📝 Обновление названия: "${product.name}"`);
          }

          // Обновляем только заполненные свойства
          const existingProperties = existingProduct.properties_data ? 
            (typeof existingProduct.properties_data === 'string' ? 
              JSON.parse(existingProduct.properties_data) : 
              existingProduct.properties_data) : {};

          const newProperties = { ...existingProperties };
          
          console.log(`  📊 Поля из файла (${Object.keys(product.properties_data).length}):`, Object.keys(product.properties_data));
          
          // Обновляем только те поля, которые не пустые в файле
          // Исправляем кодировку полей перед обновлением
          const fixedKeys = fixFieldsEncoding(Object.keys(product.properties_data));
          let updatedFieldsCount = 0;
          Object.keys(product.properties_data).forEach((originalKey, index) => {
            const fixedKey = fixedKeys[index];
            const value = product.properties_data[originalKey];
            if (value !== undefined && value !== null && value !== '' && value !== '-') {
              const oldValue = newProperties[fixedKey];
              newProperties[fixedKey] = value;
              updatedFieldsCount++;
              console.log(`  ✅ Обновление поля "${fixedKey}": "${oldValue}" → "${value}"`);
            }
          });

          console.log(`  📈 Обновлено полей: ${updatedFieldsCount}`);

          updateData.properties_data = JSON.stringify(newProperties);
          updateData.specifications = JSON.stringify(newProperties);

          await prisma.product.update({
            where: { id: existingProduct.id },
            data: updateData
          });

          console.log(`  ✅ Товар успешно обновлен`);
          updatedCount++;
        } else {
          // Создаем новый товар - все обязательные поля должны быть заполнены
          // Исправляем кодировку полей перед сохранением
          const fixedProperties = fixFieldsEncoding(Object.keys(product.properties_data)).reduce((acc, fixedKey, index) => {
            const originalKey = Object.keys(product.properties_data)[index];
            acc[fixedKey] = product.properties_data[originalKey];
            return acc;
          }, {} as Record<string, any>);
          
          try {
            await prisma.product.create({
              data: {
                sku: product.sku,
                name: product.name,
                catalog_category_id: categoryId,
                properties_data: JSON.stringify(fixedProperties),
                specifications: JSON.stringify(fixedProperties),
                base_price: 0,
                stock_quantity: 0,
                is_active: true
              }
            });

            createdCount++;
          } catch (createError: any) {
            // Обрабатываем ошибку уникальности SKU
            if (createError.code === 'P2002' && createError.meta?.target?.includes('sku')) {
              console.error(`❌ SKU "${product.sku}" уже существует в БД (конфликт уникальности)`);
              throw new Error(`SKU "${product.sku}" уже существует в базе данных. SKU должны быть уникальными во всей БД товаров.`);
            }
            throw createError; // Пробрасываем другие ошибки
          }
        }

        importedCount++;

      } catch (error) {
        console.error(`Ошибка импорта товара ${product.sku}:`, error);
        errorCount++;
      }
    }

    // Сохраняем историю импорта
    await prisma.importHistory.create({
      data: {
        template_id: template.id,
        catalog_category_id: categoryId,
        filename: file.name,
        file_size: file.size,
        imported_count: importedCount,
        error_count: errorCount + errors.length,
        status: errorCount > 0 ? 'partial' : 'completed',
        errors: JSON.stringify(errors),
        import_data: JSON.stringify({
          template: template.name,
          requiredFields,
          totalRows: rows.length
        })
      }
    });

           console.log('✅ Импорт завершен:', {
             imported: importedCount,
             created: createdCount,
             updated: updatedCount,
             errors: errorCount,
             validationErrors: errors.length
           });
           
           // Дополнительное логирование для диагностики
           if (updatedCount > 0) {
             console.log(`📊 Обновлено товаров: ${updatedCount}`);
           }
           if (createdCount > 0) {
             console.log(`➕ Создано товаров: ${createdCount}`);
           }
           if (errorCount > 0) {
             console.log(`❌ Ошибок при импорте: ${errorCount}`);
           }

    return NextResponse.json({
      success: true,
      mode: 'import',
      imported: importedCount,
      created: createdCount,
      updated: updatedCount,
      errors: errorCount + errors.length,
      validationErrors: errors.length,
      template: template.name,
      filename: file.name
    });

  } catch (error) {
    console.error('Ошибка унифицированного импорта:', error);
    return apiErrorHandler.handle(error, 'unified-import');
  }
}
