import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export interface SimplifiedProductImportResult {
  success: boolean;
  message: string;
  imported: number;
  updated: number;
  errors: string[];
  warnings: string[];
  products: Array<{
    id: string;
    sku: string;
    name: string;
    base_price: number;
    properties_count: number;
  }>;
}

export interface ExcelRow {
  [key: string]: any;
}

export class SimplifiedProductImportService {
  /**
   * Упрощенный импорт товаров из Excel файла
   * Заголовки Excel = Поля шаблона (прямое соответствие)
   */
  async importFromExcel(
    file: Buffer, 
    filename: string, 
    catalogCategoryId: string
  ): Promise<SimplifiedProductImportResult> {
    
    console.log('🚀 УПРОЩЕННЫЙ ИМПОРТ ТОВАРОВ');
    console.log('=============================');
    console.log(`📁 Файл: ${filename}`);
    console.log(`📂 Категория: ${catalogCategoryId}`);
    
    try {
      // Читаем Excel файл
      const workbook = XLSX.read(file, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Конвертируем в JSON
      const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (data.length === 0) {
        return {
          success: false,
          message: 'Файл не содержит данных',
          imported: 0,
          updated: 0,
          errors: ['Файл пуст или не содержит данных'],
          warnings: [],
          products: []
        };
      }

      // Первая строка - заголовки (они же поля шаблона)
      const headers = data[0] as string[];
      const rows = data.slice(1).filter(row => row.length > 0);
      
      console.log(`📋 Заголовки (${headers.length}):`);
      headers.forEach((header, index) => {
        console.log(`   ${index + 1}. "${header}"`);
      });
      
      console.log(`📊 Строк данных: ${rows.length}`);

      // Получаем категорию
      const catalogCategory = await prisma.catalogCategory.findUnique({
        where: { id: catalogCategoryId }
      });
      
      if (!catalogCategory) {
        return {
          success: false,
          message: 'Категория каталога не найдена',
          imported: 0,
          updated: 0,
          errors: ['Указанная категория каталога не существует'],
          warnings: [],
          products: []
        };
      }

      console.log(`✅ Категория найдена: ${catalogCategory.name}`);

      // Парсим товары
      const parseResult = this.parseProducts(rows, headers, catalogCategoryId);
      
      if (parseResult.errors.length > 0) {
        console.log(`⚠️ Ошибки парсинга: ${parseResult.errors.length}`);
        parseResult.errors.forEach(error => console.log(`   - ${error}`));
      }

      console.log(`📦 Товаров обработано: ${parseResult.products.length}`);

      // Сохраняем товары в базу данных
      const saveResult = await this.saveProducts(parseResult.products);
      
      // Обновляем счетчик товаров в категории
      await this.updateCategoryProductCount(catalogCategoryId);
      
      // Создаем запись в истории импорта
      await this.createImportHistory(
        catalogCategoryId,
        filename,
        file.length,
        saveResult.imported,
        saveResult.updated,
        saveResult.errors
      );

      console.log(`🎉 ИМПОРТ ЗАВЕРШЕН:`);
      console.log(`   Импортировано: ${saveResult.imported}`);
      console.log(`   Обновлено: ${saveResult.updated}`);
      console.log(`   Ошибок: ${saveResult.errors.length}`);

      return {
        success: true,
        message: 'Импорт завершен успешно',
        imported: saveResult.imported,
        updated: saveResult.updated,
        errors: [...parseResult.errors, ...saveResult.errors],
        warnings: parseResult.warnings,
        products: saveResult.products
      };

    } catch (error) {
      console.error('❌ Критическая ошибка импорта:', error);
      return {
        success: false,
        message: 'Ошибка при импорте файла',
        imported: 0,
        updated: 0,
        errors: [error.message],
        warnings: [],
        products: []
      };
    }
  }

  /**
   * Парсинг товаров из строк Excel
   * Заголовки Excel = Поля шаблона (прямое соответствие)
   */
  private parseProducts(
    rows: ExcelRow[], 
    headers: string[], 
    catalogCategoryId: string
  ): {
    products: Array<{
      sku: string;
      name: string;
      catalog_category_id: string;
      properties_data: Record<string, any>;
      base_price: number;
      currency: string;
      stock_quantity: number;
      is_active: boolean;
    }>;
    errors: string[];
    warnings: string[];
  } {
    const products = [];
    const errors = [];
    const warnings = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      if (!Array.isArray(row)) {
        errors.push(`Строка ${rowIndex + 2}: Неверный формат данных`);
        continue;
      }

      // Пропускаем пустые строки
      if (row.length === 0 || row.every(cell => !cell)) {
        continue;
      }

      try {
        // Создаем товар
        const product = {
          sku: '',
          name: '',
          catalog_category_id: catalogCategoryId,
          properties_data: {},
          base_price: 0,
          currency: 'RUB',
          stock_quantity: 0,
          is_active: true
        };

        // Заголовки Excel = Поля шаблона (прямое соответствие)
        headers.forEach((header, headerIndex) => {
          if (row[headerIndex] !== undefined && row[headerIndex] !== null && row[headerIndex] !== '') {
            product.properties_data[header] = row[headerIndex];
          }
        });

        // Извлекаем основные поля
        // SKU - обычно в колонке C (индекс 2)
        if (row[2]) {
          product.sku = row[2].toString().trim();
        } else {
          product.sku = `AUTO-${rowIndex + 1}`;
          warnings.push(`Строка ${rowIndex + 2}: SKU сгенерирован автоматически`);
        }

        // Название - обычно в колонке D (индекс 3)
        if (row[3]) {
          product.name = row[3].toString().trim();
        } else {
          product.name = 'Без названия';
          warnings.push(`Строка ${rowIndex + 2}: Название не указано`);
        }

        // Ищем цену по заголовкам
        const priceHeaders = headers.filter(h => 
          h && h.toLowerCase().includes('цена')
        );
        
        if (priceHeaders.length > 0) {
          const priceHeader = priceHeaders[0];
          const priceIndex = headers.indexOf(priceHeader);
          const priceValue = row[priceIndex];
          
          if (priceValue) {
            const price = parseFloat(priceValue.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
            if (!isNaN(price)) {
              product.base_price = price;
            } else {
              warnings.push(`Строка ${rowIndex + 2}: Неверный формат цены "${priceValue}"`);
            }
          }
        }

        // Проверяем обязательные поля
        if (!product.name || product.name === 'Без названия') {
          errors.push(`Строка ${rowIndex + 2}: Отсутствует название товара`);
          continue;
        }

        if (Object.keys(product.properties_data).length === 0) {
          errors.push(`Строка ${rowIndex + 2}: Товар не содержит свойств`);
          continue;
        }

        products.push(product);

      } catch (error) {
        errors.push(`Строка ${rowIndex + 2}: Ошибка обработки - ${error.message}`);
      }
    }

    return { products, errors, warnings };
  }

  /**
   * Сохранение товаров в базу данных
   */
  private async saveProducts(products: Array<{
    sku: string;
    name: string;
    catalog_category_id: string;
    properties_data: Record<string, any>;
    base_price: number;
    currency: string;
    stock_quantity: number;
    is_active: boolean;
  }>): Promise<{
    imported: number;
    updated: number;
    errors: string[];
    products: Array<{
      id: string;
      sku: string;
      name: string;
      base_price: number;
      properties_count: number;
    }>;
  }> {
    let imported = 0;
    let updated = 0;
    const errors = [];
    const savedProducts = [];

    for (const product of products) {
      try {
        // Проверяем, не существует ли уже товар с таким SKU
        const existingProduct = await prisma.product.findUnique({
          where: { sku: product.sku }
        });

        if (existingProduct) {
          // Обновляем существующий товар
          const updatedProduct = await prisma.product.update({
            where: { sku: product.sku },
            data: {
              name: product.name,
              properties_data: JSON.stringify(product.properties_data),
              base_price: product.base_price,
              updated_at: new Date()
            }
          });
          
          savedProducts.push({
            id: updatedProduct.id,
            sku: updatedProduct.sku,
            name: updatedProduct.name,
            base_price: updatedProduct.base_price,
            properties_count: Object.keys(product.properties_data).length
          });
          
          updated++;
        } else {
          // Создаем новый товар
          const newProduct = await prisma.product.create({
            data: {
              sku: product.sku,
              name: product.name,
              catalog_category_id: product.catalog_category_id,
              properties_data: JSON.stringify(product.properties_data),
              base_price: product.base_price,
              currency: product.currency,
              stock_quantity: product.stock_quantity,
              is_active: product.is_active
            }
          });
          
          savedProducts.push({
            id: newProduct.id,
            sku: newProduct.sku,
            name: newProduct.name,
            base_price: newProduct.base_price,
            properties_count: Object.keys(product.properties_data).length
          });
          
          imported++;
        }
        
      } catch (error) {
        errors.push(`Товар "${product.name}": Ошибка сохранения - ${error.message}`);
      }
    }

    return { imported, updated, errors, products: savedProducts };
  }

  /**
   * Обновление счетчика товаров в категории
   */
  private async updateCategoryProductCount(catalogCategoryId: string): Promise<void> {
    const count = await prisma.product.count({
      where: { 
        catalog_category_id: catalogCategoryId,
        is_active: true 
      }
    });

    await prisma.catalogCategory.update({
      where: { id: catalogCategoryId },
      data: { 
        products_count: count,
        updated_at: new Date()
      }
    });
  }

  /**
   * Создание записи в истории импорта
   */
  private async createImportHistory(
    catalogCategoryId: string,
    filename: string,
    fileSize: number,
    imported: number,
    updated: number,
    errors: string[]
  ): Promise<void> {
    await prisma.importHistory.create({
      data: {
        catalog_category_id: catalogCategoryId,
        filename: filename,
        file_size: fileSize,
        imported_count: imported + updated,
        error_count: errors.length,
        status: errors.length > 0 ? 'partial' : 'completed',
        errors: JSON.stringify(errors),
        import_data: JSON.stringify({
          imported: imported,
          updated: updated,
          total_processed: imported + updated
        })
      }
    });
  }
}
