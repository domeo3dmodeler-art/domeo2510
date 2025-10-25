import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { validateDocumentFile } from '../../../../../lib/validation/file-validation';

const prisma = new PrismaClient();

// ===================== Импорт товаров по шаблону =====================

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const categoryId = formData.get("categoryId") as string;
    const templateId = formData.get("templateId") as string;
    const mode = formData.get("mode") as string || 'preview'; // 'preview' или 'import'

    if (!file) {
      return NextResponse.json(
        { error: "Файл не предоставлен" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Категория не указана" },
        { status: 400 }
      );
    }

    // Валидация файла
    const validation = validateDocumentFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

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

    // Парсим поля шаблона
    let requiredFields = [];
    let calculatorFields = [];
    let exportFields = [];

    try {
      requiredFields = template.required_fields ? JSON.parse(template.required_fields) : [];
      calculatorFields = template.calculator_fields ? JSON.parse(template.calculator_fields) : [];
      exportFields = template.export_fields ? JSON.parse(template.export_fields) : [];
    } catch (error) {
      console.error('Error parsing template fields:', error);
      return NextResponse.json(
        { error: 'Ошибка при чтении полей шаблона' },
        { status: 500 }
      );
    }

    // Читаем Excel файл
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: "Файл пустой или не содержит данных" },
        { status: 400 }
      );
    }

    // Первая строка - заголовки
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];

    // Создаем маппинг полей шаблона на заголовки файла
    const allTemplateFields = [...requiredFields, ...calculatorFields, ...exportFields];
    const fieldMapping: Record<string, number> = {};

    allTemplateFields.forEach(field => {
      const fieldName = field.displayName || field.fieldName || field;
      const headerIndex = headers.findIndex(header => 
        header && header.toString().trim() === fieldName.toString().trim()
      );
      if (headerIndex !== -1) {
        fieldMapping[field.fieldName || field] = headerIndex;
      }
    });

    console.log('Field mapping:', fieldMapping);
    console.log('Headers:', headers);
    console.log('Template fields:', allTemplateFields.map(f => f.displayName || f.fieldName || f));

    // Обрабатываем строки данных
    const products = [];
    const errors = [];
    const warnings = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (!row || row.every(cell => !cell)) {
        continue; // Пропускаем пустые строки
      }

      const product: any = {
        rowNumber: i + 2, // +2 потому что первая строка - заголовки, а индексация с 0
        specifications: {},
        errors: [],
        warnings: []
      };

      // Заполняем спецификации на основе маппинга
      allTemplateFields.forEach(field => {
        const fieldName = field.fieldName || field;
        const headerIndex = fieldMapping[fieldName];
        
        if (headerIndex !== undefined && row[headerIndex] !== undefined && row[headerIndex] !== '') {
          let value = row[headerIndex];
          
          // Преобразуем значение в зависимости от типа поля
          if (field.type === 'number') {
            const numValue = parseFloat(String(value).replace(',', '.'));
            if (!isNaN(numValue)) {
              value = numValue;
            } else {
              product.warnings.push(`Поле "${field.displayName || fieldName}" должно быть числом`);
            }
          } else if (field.type === 'boolean') {
            value = String(value).toLowerCase() === 'да' || String(value).toLowerCase() === 'true' || String(value) === '1';
          } else if (field.type === 'date') {
            // Пытаемся распарсить дату
            const dateValue = new Date(String(value));
            if (!isNaN(dateValue.getTime())) {
              value = dateValue.toISOString().split('T')[0];
            } else {
              product.warnings.push(`Поле "${field.displayName || fieldName}" должно быть датой`);
            }
          }
          
          product.specifications[fieldName] = value;
        } else if (field.isRequired || requiredFields.includes(field)) {
          product.errors.push(`Обязательное поле "${field.displayName || fieldName}" не заполнено`);
        }
      });

      // Проверяем обязательные поля
      const missingRequiredFields = requiredFields.filter(field => {
        const fieldName = field.fieldName || field;
        return !product.specifications[fieldName] || product.specifications[fieldName] === '';
      });

      if (missingRequiredFields.length > 0) {
        product.errors.push(`Отсутствуют обязательные поля: ${missingRequiredFields.map(f => f.displayName || f.fieldName || f).join(', ')}`);
      }

      // Добавляем продукт в результат
      if (product.errors.length === 0) {
        products.push(product);
      } else {
        errors.push({
          rowNumber: product.rowNumber,
          errors: product.errors,
          warnings: product.warnings,
          data: product.specifications
        });
      }
    }

    // Если режим предварительного просмотра, возвращаем результат без сохранения
    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        mode: 'preview',
        total: rows.length,
        valid: products.length,
        invalid: errors.length,
        products: products.slice(0, 10), // Показываем только первые 10 товаров
        errors: errors.slice(0, 20), // Показываем только первые 20 ошибок
        template: {
          id: template.id,
          name: template.name,
          requiredFields: requiredFields.length,
          calculatorFields: calculatorFields.length,
          exportFields: exportFields.length
        },
        fieldMapping
      });
    }

    // Режим импорта - сохраняем товары в базу данных
    if (mode === 'import') {
      let importedCount = 0;
      const importErrors = [];

      for (const product of products) {
        try {
          // Создаем или обновляем товар
          const existingProduct = await prisma.genericProduct.findFirst({
            where: {
              categoryId: categoryId,
              sku: product.specifications.sku || product.specifications.Артикул || `imported_${Date.now()}_${importedCount}`
            }
          });

          const productData = {
            categoryId: categoryId,
            sku: product.specifications.sku || product.specifications.Артикул || `imported_${Date.now()}_${importedCount}`,
            name: product.specifications.name || product.specifications.Название || 'Импортированный товар',
            base_price: parseFloat(product.specifications.price || product.specifications.Цена || '0') || 0,
            currency: 'RUB',
            properties_data: product.specifications,
            is_active: true,
            stock_quantity: parseInt(product.specifications.stock || product.specifications.Остаток || '0') || 0
          };

          if (existingProduct) {
            await prisma.genericProduct.update({
              where: { id: existingProduct.id },
              data: productData
            });
          } else {
            await prisma.genericProduct.create({
              data: productData
            });
          }

          importedCount++;
        } catch (error) {
          console.error(`Error importing product at row ${product.rowNumber}:`, error);
          importErrors.push({
            rowNumber: product.rowNumber,
            error: 'Ошибка при сохранении в базу данных',
            data: product.specifications
          });
        }
      }

      // Обновляем счетчики товаров в категории
      try {
        await prisma.catalogCategory.update({
          where: { id: categoryId },
          data: {
            products_count: {
              increment: importedCount
            }
          }
        });
      } catch (error) {
        console.error('Error updating category product count:', error);
      }

      return NextResponse.json({
        success: true,
        mode: 'import',
        total: rows.length,
        imported: importedCount,
        errors: errors.length + importErrors.length,
        importErrors: importErrors,
        validationErrors: errors,
        template: {
          id: template.id,
          name: template.name
        }
      });
    }

    return NextResponse.json(
      { error: "Неверный режим импорта" },
      { status: 400 }
    );

  } catch (error) {
    console.error('Template import error:', error);
    return NextResponse.json(
      { error: 'Ошибка при импорте по шаблону' },
      { status: 500 }
    );
  }
}
