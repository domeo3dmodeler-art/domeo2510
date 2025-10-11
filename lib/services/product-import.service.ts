import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { catalogService } from './catalog.service';

const prisma = new PrismaClient();

export interface ProductImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
  warnings: string[];
  products: Array<{
    sku: string;
    name: string;
    catalog_category_id: string;
    properties_data: Record<string, any>;
  }>;
}

export interface ExcelRow {
  [key: string]: any;
}

export class ProductImportService {
  /**
   * Импорт товаров из Excel файла
   */
  async importFromExcel(
    file: Buffer, 
    filename: string, 
    catalogCategoryId: string,
    templateId?: string
  ): Promise<ProductImportResult> {
    try {
      // Читаем Excel файл
      const workbook = XLSX.read(file, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Конвертируем в JSON
      const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Пропускаем заголовок (первую строку)
      const rows = data.slice(1).filter(row => row.length > 0);
      
      if (rows.length === 0) {
        return {
          success: false,
          message: 'Файл не содержит данных',
          imported: 0,
          errors: ['Файл пуст или не содержит данных'],
          warnings: [],
          products: []
        };
      }

      // Получаем категорию каталога
      const catalogCategory = await catalogService.getCategoryById(catalogCategoryId);
      if (!catalogCategory) {
        return {
          success: false,
          message: 'Категория каталога не найдена',
          imported: 0,
          errors: ['Указанная категория каталога не существует'],
          warnings: [],
          products: []
        };
      }

      // Получаем шаблон импорта (если указан)
      let importTemplate = null;
      if (templateId) {
        const templates = await catalogService.getImportTemplatesByCategory(catalogCategoryId);
        importTemplate = templates.find(t => t.id === templateId);
      }

      // Анализируем структуру файла
      const analysis = this.analyzeFileStructure(rows, catalogCategory, importTemplate);
      
      if (!analysis.isValid) {
        return {
          success: false,
          message: 'Неверная структура файла',
          imported: 0,
          errors: analysis.errors,
          warnings: analysis.warnings,
          products: []
        };
      }

      // Парсим товары
      const products = this.parseProducts(rows, analysis, catalogCategoryId);
      
      // Валидируем данные
      const validation = this.validateProducts(products, catalogCategory);
      
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Ошибки валидации данных',
          imported: 0,
          errors: validation.errors,
          warnings: validation.warnings,
          products: []
        };
      }

      // Импортируем в базу данных
      const importResult = await this.importToDatabase(products, catalogCategoryId);
      
      return {
        success: true,
        message: `Успешно импортировано ${importResult.imported} товаров`,
        imported: importResult.imported,
        errors: importResult.errors,
        warnings: [...analysis.warnings, ...validation.warnings, ...importResult.warnings],
        products: products.map(product => ({
          sku: product.sku,
          name: product.name,
          catalog_category_id: product.catalog_category_id,
          properties_data: product.properties_data
        }))
      };

    } catch (error) {
      console.error('Error importing products:', error);
      return {
        success: false,
        message: 'Ошибка при импорте файла',
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Неизвестная ошибка'],
        warnings: [],
        products: []
      };
    }
  }

  /**
   * Анализ структуры файла
   */
  private analyzeFileStructure(
    rows: ExcelRow[], 
    catalogCategory: any, 
    importTemplate: any
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    columns: string[];
    requiredFields: string[];
    optionalFields: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (rows.length === 0) {
      errors.push('Файл не содержит данных');
      return { isValid: false, errors, warnings, columns: [], requiredFields: [], optionalFields: [] };
    }

    // Определяем максимальное количество колонок
    const maxColumns = Math.max(...rows.map(row => Array.isArray(row) ? row.length : 0));
    
    if (maxColumns < 2) {
      errors.push('Файл должен содержать минимум 2 колонки (SKU и название)');
      return { isValid: false, errors, warnings, columns: [], requiredFields: [], optionalFields: [] };
    }

    // Генерируем названия колонок
    const columns = Array.from({ length: maxColumns }, (_, i) => `Колонка ${i + 1}`);
    
    // Определяем обязательные поля
    const requiredFields = ['sku', 'name'];
    const optionalFields: string[] = [];

    // Если есть шаблон, используем его
    if (importTemplate) {
      requiredFields.push(...importTemplate.required_fields);
      optionalFields.push(...importTemplate.calculator_fields);
      optionalFields.push(...importTemplate.export_fields);
    } else {
      // Иначе определяем поля из свойств категории
      const propertyAssignments = catalogCategory.property_assignments || [];
      propertyAssignments.forEach((assignment: any) => {
        if (assignment.is_required) {
          requiredFields.push(assignment.product_property.name);
        } else {
          optionalFields.push(assignment.product_property.name);
        }
      });
    }

    return {
      isValid: true,
      errors,
      warnings,
      columns,
      requiredFields,
      optionalFields
    };
  }

  /**
   * Парсинг товаров из строк Excel
   */
  private parseProducts(
    rows: ExcelRow[], 
    analysis: any, 
    catalogCategoryId: string
  ): Array<{
    sku: string;
    name: string;
    catalog_category_id: string;
    properties_data: Record<string, any>;
    base_price: number;
    currency: string;
    stock_quantity: number;
    is_active: boolean;
  }> {
    const products: Array<{
      sku: string;
      name: string;
      catalog_category_id: string;
      properties_data: Record<string, any>;
      base_price: number;
      currency: string;
      stock_quantity: number;
      is_active: boolean;
    }> = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      if (!Array.isArray(row)) continue;

      // Извлекаем основные поля
      // В Excel файле: колонка A - номер, B - пустая, C - пустая (артикул), D - название модели
      const sku = row[2]?.toString().trim() || '';
      const name = row[3]?.toString().trim() || '';
      
      // Если SKU пустой, генерируем его автоматически
      const finalSku = sku || `AUTO-${rowIndex + 1}`;
      
      if (!name) continue;

      // Извлекаем свойства товара
      const properties_data: Record<string, any> = {};
      
      // Парсим все колонки как свойства, используя заголовки из шаблона
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const value = row[colIndex];
        
        if (value !== undefined && value !== null && value !== '') {
          // Используем номер колонки как ключ, так как у нас есть маппинг в шаблоне
          properties_data[`column_${colIndex}`] = value;
        }
      }

      // Извлекаем цену (колонка P - индекс 15)
      const base_price = parseFloat(row[15]?.toString()) || 0;
      
      // Извлекаем остаток (колонка O - индекс 14, но это "Склад/заказ", не количество)
      const stock_quantity = 0; // По умолчанию 0, так как в Excel нет поля количества

      products.push({
        sku: finalSku,
        name,
        catalog_category_id: catalogCategoryId,
        properties_data,
        base_price,
        currency: 'RUB',
        stock_quantity,
        is_active: true
      });
    }

    return products;
  }

  /**
   * Валидация товаров
   */
  private validateProducts(
    products: Array<{
      sku: string;
      name: string;
      catalog_category_id: string;
      properties_data: Record<string, any>;
      base_price: number;
      currency: string;
      stock_quantity: number;
      is_active: boolean;
    }>,
    catalogCategory: any
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const skuSet = new Set<string>();

    for (const product of products) {
      // Проверка на пустое название
      if (!product.name || product.name.trim().length === 0) {
        errors.push(`Товар с SKU "${product.sku}": пустое название`);
        continue;
      }

      // Проверка на пустой SKU
      if (!product.sku || product.sku.trim().length === 0) {
        errors.push(`Товар "${product.name}": пустой SKU`);
        continue;
      }

      // Проверка на дубликаты SKU
      if (skuSet.has(product.sku)) {
        warnings.push(`Дубликат SKU: "${product.sku}"`);
      }
      skuSet.add(product.sku);

      // Проверка длины названия
      if (product.name.length > 255) {
        errors.push(`Товар "${product.sku}": название слишком длинное (${product.name.length} символов)`);
      }

      // Проверка длины SKU
      if (product.sku.length > 100) {
        errors.push(`Товар "${product.sku}": SKU слишком длинный (${product.sku.length} символов)`);
      }

      // Проверка цены
      if (product.base_price < 0) {
        warnings.push(`Товар "${product.sku}": отрицательная цена`);
      }

      // Проверка остатка
      if (product.stock_quantity < 0) {
        warnings.push(`Товар "${product.sku}": отрицательный остаток`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Импорт в базу данных
   */
  private async importToDatabase(
    products: Array<{
      sku: string;
      name: string;
      catalog_category_id: string;
      properties_data: Record<string, any>;
      base_price: number;
      currency: string;
      stock_quantity: number;
      is_active: boolean;
    }>,
    catalogCategoryId: string
  ): Promise<{
    imported: number;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let imported = 0;

    try {
      // Начинаем транзакцию
      await prisma.$transaction(async (tx) => {
        for (const productData of products) {
          try {
            // Проверяем, существует ли товар с таким SKU
            const existingProduct = await tx.product.findUnique({
              where: { sku: productData.sku }
            });

            if (existingProduct) {
              // Обновляем существующий товар
              await tx.product.update({
                where: { sku: productData.sku },
                data: {
                  name: productData.name,
                  catalog_category_id: productData.catalog_category_id,
                  properties_data: JSON.stringify(productData.properties_data),
                  base_price: productData.base_price,
                  currency: productData.currency,
                  stock_quantity: productData.stock_quantity,
                  is_active: productData.is_active,
                  updated_at: new Date()
                }
              });
              warnings.push(`Товар "${productData.sku}" обновлен`);
            } else {
              // Создаем новый товар
              await tx.product.create({
                data: {
                  sku: productData.sku,
                  name: productData.name,
                  catalog_category_id: productData.catalog_category_id,
                  properties_data: JSON.stringify(productData.properties_data),
                  base_price: productData.base_price,
                  currency: productData.currency,
                  stock_quantity: productData.stock_quantity,
                  is_active: productData.is_active
                }
              });
            }

            imported++;

          } catch (error) {
            const errorMsg = `Ошибка создания товара "${productData.sku}": ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
            errors.push(errorMsg);
            console.error(errorMsg, error);
          }
        }
      });

    } catch (error) {
      const errorMsg = `Ошибка транзакции: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
      errors.push(errorMsg);
      console.error(errorMsg, error);
    }

    return {
      imported,
      errors,
      warnings
    };
  }

  /**
   * Получение шаблона Excel файла для категории
   */
  async getExcelTemplate(catalogCategoryId: string): Promise<Buffer> {
    // Получаем категорию и её свойства
    const catalogCategory = await catalogService.getCategoryById(catalogCategoryId);
    if (!catalogCategory) {
      throw new Error('Категория каталога не найдена');
    }

    // Получаем шаблоны импорта
    const templates = await catalogService.getImportTemplatesByCategory(catalogCategoryId);
    const template = templates[0]; // Используем первый шаблон

    // Формируем заголовки
    let headers = ['SKU', 'Название', 'Цена', 'Остаток'];
    
    if (template) {
      // Используем только поля из шаблона
      try {
        const templateConfig = JSON.parse(template.template_config || '{}');
        if (templateConfig.headers && Array.isArray(templateConfig.headers)) {
          headers = templateConfig.headers;
        } else {
          // Fallback к старому формату
          const requiredFields = JSON.parse(template.required_fields || '[]');
          const calculatorFields = JSON.parse(template.calculator_fields || '[]');
          const exportFields = JSON.parse(template.export_fields || '[]');
          
          headers = [...new Set([...headers, ...requiredFields, ...calculatorFields, ...exportFields])];
        }
      } catch (error) {
        console.warn('Error parsing template config:', error);
        // Fallback к старому формату
        const requiredFields = JSON.parse(template.required_fields || '[]');
        const calculatorFields = JSON.parse(template.calculator_fields || '[]');
        const exportFields = JSON.parse(template.export_fields || '[]');
        
        headers = [...new Set([...headers, ...requiredFields, ...calculatorFields, ...exportFields])];
      }
    } else {
      // Если нет шаблона, используем свойства категории
      const propertyAssignments = catalogCategory.property_assignments || [];
      propertyAssignments.forEach((assignment: any) => {
        if (!headers.includes(assignment.product_property.name)) {
          headers.push(assignment.product_property.name);
        }
      });
    }

    // Создаем пример данных
    const exampleData = [
      ['DOOR-001', 'Дверь межкомнатная Дуб', '15000', '10'],
      ['DOOR-002', 'Дверь входная Металл', '25000', '5'],
      ['DOOR-003', 'Дверь раздвижная Стекло', '20000', '8']
    ];

    // Добавляем примеры свойств
    if (template) {
      exampleData[0].push('Дуб', '80x200', 'Белый');
      exampleData[1].push('Металл', '90x210', 'Черный');
      exampleData[2].push('Стекло', '70x200', 'Прозрачный');
    }

    const templateData = [headers, ...exampleData];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');

    // Устанавливаем ширину колонок
    worksheet['!cols'] = headers.map(() => ({ width: 20 }));

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Получение истории импортов товаров
   */
  async getProductImportHistory(catalogCategoryId: string): Promise<Array<{
    id: string;
    filename: string;
    imported_count: number;
    error_count: number;
    status: string;
    created_at: Date;
  }>> {
    return prisma.importHistory.findMany({
      where: { catalog_category_id: catalogCategoryId },
      orderBy: { created_at: 'desc' },
      take: 50
    });
  }
}

export const productImportService = new ProductImportService();
