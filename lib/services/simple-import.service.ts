import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export interface SimpleImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
  warnings: string[];
}

export interface SimpleImportOptions {
  skipEmptyValues: boolean;
  validateRequiredFields: boolean;
  updateExisting: boolean;
}

export class SimpleImportService {
  
  /**
   * Простой импорт товаров без маппинга
   * Поля в Excel файле должны точно совпадать с полями шаблона категории
   */
  async importProducts(
    fileBuffer: Buffer,
    catalogCategoryId: string,
    options: SimpleImportOptions = {
      skipEmptyValues: true,
      validateRequiredFields: true,
      updateExisting: true
    }
  ): Promise<SimpleImportResult> {
    
    try {
      console.log('🚀 Начинаем простой импорт без маппинга');
      
      // Читаем Excel файл
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          errors: ['Файл должен содержать заголовки и хотя бы одну строку данных'],
          warnings: []
        };
      }
      
      // Получаем заголовки и данные
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];
      
      console.log('📊 Заголовки файла:', headers);
      console.log('📊 Количество строк:', rows.length);
      
      // Получаем шаблон категории
      const template = await prisma.importTemplate.findUnique({
        where: { catalog_category_id: catalogCategoryId }
      });
      
      if (!template) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          errors: [`Шаблон для категории не найден. Сначала создайте шаблон для категории ${catalogCategoryId}`],
          warnings: []
        };
      }
      
      // Парсим поля шаблона
      const requiredFields = JSON.parse(template.required_fields || '[]');
      const calculatorFields = JSON.parse(template.calculator_fields || '[]');
      const exportFields = JSON.parse(template.export_fields || '[]');
      
      console.log('📋 Обязательные поля:', requiredFields);
      console.log('📋 Поля калькулятора:', calculatorFields);
      console.log('📋 Поля экспорта:', exportFields);
      
      // Проверяем соответствие заголовков шаблону
      const missingRequiredFields = requiredFields.filter((field: string) => 
        !headers.includes(field)
      );
      
      if (missingRequiredFields.length > 0) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          errors: [
            `В файле отсутствуют обязательные поля: ${missingRequiredFields.join(', ')}`,
            `Заголовки в файле должны точно совпадать с полями шаблона категории`
          ],
          warnings: []
        };
      }
      
      // Проверяем лишние поля
      const extraFields = headers.filter(header => 
        !requiredFields.includes(header) && 
        !calculatorFields.includes(header) && 
        !exportFields.includes(header)
      );
      
      if (extraFields.length > 0) {
        console.log('⚠️ Найдены лишние поля:', extraFields);
      }
      
      const result: SimpleImportResult = {
        success: true,
        imported: 0,
        updated: 0,
        errors: [],
        warnings: []
      };
      
      // Обрабатываем каждую строку
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        
        try {
          // Создаем объект товара из строки
          const productData: any = {};
          const propertiesData: any = {};
          
          // Заполняем данные из строки
          headers.forEach((header, headerIndex) => {
            const value = row[headerIndex];
            
            if (value !== undefined && value !== null && value !== '') {
              // Основные поля товара
              if (header === 'Артикул поставщика' || header === 'SKU') {
                productData.sku = String(value);
              } else if (header === 'Название' || header === 'Наименование') {
                productData.name = String(value);
              } else if (header === 'Цена' || header === 'Цена ррц') {
                productData.base_price = parseFloat(String(value)) || 0;
              } else if (header === 'Валюта') {
                productData.currency = String(value) || 'RUB';
              } else if (header === 'Наличие' || header === 'Склад/заказ') {
                productData.stock_quantity = parseInt(String(value)) || 0;
              } else {
                // Все остальные поля идут в properties_data
                propertiesData[header] = value;
              }
            }
          });
          
          // Проверяем обязательные поля
          if (!productData.sku) {
            result.errors.push(`Строка ${rowIndex + 2}: отсутствует артикул`);
            continue;
          }
          
          if (!productData.name) {
            result.errors.push(`Строка ${rowIndex + 2}: отсутствует название`);
            continue;
          }
          
          if (!productData.base_price || productData.base_price <= 0) {
            result.errors.push(`Строка ${rowIndex + 2}: некорректная цена`);
            continue;
          }
          
          // Проверяем существующий товар
          const existingProduct = await prisma.product.findUnique({
            where: { sku: productData.sku }
          });
          
          if (existingProduct) {
            if (options.updateExisting) {
              // Обновляем существующий товар
              await prisma.product.update({
                where: { sku: productData.sku },
                data: {
                  name: productData.name,
                  catalog_category_id: catalogCategoryId,
                  properties_data: JSON.stringify(propertiesData),
                  base_price: productData.base_price,
                  currency: productData.currency,
                  stock_quantity: productData.stock_quantity,
                  updated_at: new Date()
                }
              });
              
              result.updated++;
              result.warnings.push(`Товар "${productData.sku}" обновлен`);
            } else {
              result.warnings.push(`Товар "${productData.sku}" уже существует, пропущен`);
            }
          } else {
            // Создаем новый товар
            await prisma.product.create({
              data: {
                sku: productData.sku,
                name: productData.name,
                catalog_category_id: catalogCategoryId,
                properties_data: JSON.stringify(propertiesData),
                base_price: productData.base_price,
                currency: productData.currency,
                stock_quantity: productData.stock_quantity,
                is_active: true
              }
            });
            
            result.imported++;
          }
          
        } catch (error) {
          const errorMsg = `Строка ${rowIndex + 2}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }
      
      console.log('✅ Простой импорт завершен:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка простого импорта:', error);
      return {
        success: false,
        imported: 0,
        updated: 0,
        errors: [`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`],
        warnings: []
      };
    }
  }
  
  /**
   * Создает шаблон Excel файла для категории
   */
  async createTemplateFile(catalogCategoryId: string): Promise<Buffer> {
    
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: catalogCategoryId }
    });
    
    if (!template) {
      throw new Error('Шаблон для категории не найден');
    }
    
    const requiredFields = JSON.parse(template.required_fields || '[]');
    const calculatorFields = JSON.parse(template.calculator_fields || '[]');
    const exportFields = JSON.parse(template.export_fields || '[]');
    
    // Объединяем все поля
    const allFields = [...requiredFields, ...calculatorFields, ...exportFields];
    
    // Создаем заголовки
    const headers = allFields;
    
    // Создаем пример данных
    const exampleData = allFields.map(field => {
      if (field === 'Артикул поставщика' || field === 'SKU') return 'EXAMPLE-SKU-001';
      if (field === 'Название' || field === 'Наименование') return 'Пример товара';
      if (field === 'Цена' || field === 'Цена ррц') return '1000';
      if (field === 'Валюта') return 'RUB';
      if (field === 'Наличие' || field === 'Склад/заказ') return '10';
      return 'Пример значения';
    });
    
    // Создаем Excel файл
    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

export const simpleImportService = new SimpleImportService();
