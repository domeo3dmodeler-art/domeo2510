import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { validateDocumentFile } from '../../../../lib/validation/file-validation';
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
      return NextResponse.json({ error: validation.error }, { status: 400 });
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
      return NextResponse.json(
        { error: "Шаблон не найден для данной категории" },
        { status: 404 }
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

    // Если нет ни одного обязательного поля из шаблона - ошибка
    if (availableRequiredFields.length === 0) {
      return NextResponse.json({
        error: "Файл не соответствует шаблону категории",
        details: {
          category: template.catalog_category?.name || 'Неизвестная категория',
          missingFields: missingFields,
          availableFields: fixedHeaders,
          templateRequiredFields: requiredFields,
          suggestion: "Скачайте актуальный шаблон для этой категории и используйте его структуру"
        },
        message: `Отсутствуют обязательные поля: ${missingFields.join(', ')}. Скачайте шаблон для категории "${template.catalog_category?.name || 'неизвестной'}" и используйте его структуру.`
      }, { status: 400 });
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

        // Заполняем свойства товара - используем только доступные обязательные поля из шаблона
        const properties: any = {};
        availableRequiredFields.forEach(field => {
          const headerIndex = fixedHeaders.indexOf(field);
          if (headerIndex !== -1 && row[headerIndex] !== undefined) {
            properties[field] = row[headerIndex];
          }
        });

        // Исправляем кодировку свойств
        product.properties_data = fixAllEncoding(properties);

        // Определяем SKU внутреннее
        const internalSku = properties['SKU внутреннее'];
        if (internalSku && internalSku.trim() !== '') {
          product.sku = internalSku.trim();
        } else {
          // Генерируем автоматически, если не указан
          const supplierSku = properties['Артикул поставщика'] || `ITEM_${i + 1}`;
          product.sku = `SKU_${Date.now()}_${supplierSku}`;
        }

        // Определяем название - ищем поле с названием в доступных полях
        const nameField = availableRequiredFields.find(field => 
          field.toLowerCase().includes('название') || 
          field.toLowerCase().includes('наименование') ||
          field.toLowerCase().includes('имя')
        );
        
        if (nameField) {
          product.name = properties[nameField] || 'Без названия';
        } else {
          product.name = 'Без названия';
        }

        // Валидация обязательных полей для нового товара
        if (!internalSku || internalSku.trim() === '') {
          // Если SKU внутреннее пустое, проверяем только доступные обязательные поля из шаблона
          const missingRequiredFields = availableRequiredFields.filter(field => {
            const value = properties[field];
            return !value || value.toString().trim() === '' || value === '-';
          });

          if (missingRequiredFields.length > 0) {
            throw new Error(`Отсутствуют обязательные поля из шаблона: ${missingRequiredFields.join(', ')}`);
          }
        } else {
          // Если SKU внутреннее заполнено, проверяем только название
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
      errors: errors.length
    });

    // Если режим preview, возвращаем предварительный просмотр
    if (mode === 'preview') {
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
        // Проверяем существование товара по SKU внутреннему
        const existingProduct = await prisma.product.findFirst({
          where: {
            sku: product.sku,
            catalog_category_id: categoryId
          }
        });

        if (existingProduct) {
          // Обновляем существующий товар - только заполненные поля
          const updateData: any = {
            updated_at: new Date()
          };

          // Обновляем название, если оно указано
          if (product.name && product.name !== 'Без названия') {
            updateData.name = product.name;
          }

          // Обновляем только заполненные свойства
          const existingProperties = existingProduct.properties_data ? 
            (typeof existingProduct.properties_data === 'string' ? 
              JSON.parse(existingProduct.properties_data) : 
              existingProduct.properties_data) : {};

          const newProperties = { ...existingProperties };
          
          // Обновляем только те поля, которые не пустые в файле
          Object.keys(product.properties_data).forEach(key => {
            const value = product.properties_data[key];
            if (value !== undefined && value !== null && value !== '' && value !== '-') {
              newProperties[key] = value;
            }
          });

          updateData.properties_data = JSON.stringify(newProperties);
          updateData.specifications = JSON.stringify(newProperties);

          await prisma.product.update({
            where: { id: existingProduct.id },
            data: updateData
          });

          updatedCount++;
        } else {
          // Создаем новый товар - все обязательные поля должны быть заполнены
          await prisma.product.create({
            data: {
              sku: product.sku,
              name: product.name,
              catalog_category_id: categoryId,
              properties_data: JSON.stringify(product.properties_data),
              specifications: JSON.stringify(product.properties_data),
              base_price: 0,
              stock_quantity: 0,
              is_active: true
            }
          });

          createdCount++;
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
