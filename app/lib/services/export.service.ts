import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { catalogService } from './catalog.service';

const prisma = new PrismaClient();

export interface ExportConfig {
  export_type: 'quote' | 'invoice' | 'supplier_order';
  fields_config: Array<{
    field: string;
    label: string;
    width: number;
    format?: string;
    required: boolean;
  }>;
  display_config: {
    title: string;
    company_name: string;
    company_address: string;
    company_phone: string;
    company_email: string;
    logo_url?: string;
    show_totals: boolean;
    show_tax: boolean;
    tax_rate: number;
    currency: string;
    date_format: string;
    number_format: string;
  };
}

export interface ExportResult {
  success: boolean;
  message: string;
  file_url?: string;
  file_name?: string;
  errors: string[];
}

export interface ProductExportData {
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  properties: Record<string, any>;
  catalog_category: {
    name: string;
    path: string;
  };
}

export class ExportService {
  /**
   * Экспорт товаров в Excel
   */
  async exportToExcel(
    catalogCategoryId: string,
    exportType: 'quote' | 'invoice' | 'supplier_order',
    productIds?: string[]
  ): Promise<ExportResult> {
    try {
      // Получаем настройки экспорта
      const exportConfig = await this.getExportConfig(catalogCategoryId, exportType);
      if (!exportConfig) {
        return {
          success: false,
          message: 'Настройки экспорта не найдены',
          errors: ['Настройки экспорта не найдены для указанной категории и типа']
        };
      }

      // Получаем товары
      const products = await this.getProductsForExport(catalogCategoryId, productIds);
      if (products.length === 0) {
        return {
          success: false,
          message: 'Товары не найдены',
          errors: ['Нет товаров для экспорта в указанной категории']
        };
      }

      // Генерируем Excel файл
      const workbook = this.generateExcelWorkbook(products, exportConfig);
      
      // Сохраняем файл
      const fileName = this.generateFileName(exportType, catalogCategoryId);
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // В реальном приложении здесь бы сохраняли файл в файловую систему или S3
      // Для демо возвращаем base64
      const base64 = buffer.toString('base64');
      const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;

      return {
        success: true,
        message: `Успешно экспортировано ${products.length} товаров`,
        file_url: dataUrl,
        file_name: fileName,
        errors: []
      };

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      return {
        success: false,
        message: 'Ошибка при экспорте',
        errors: [error instanceof Error ? error.message : 'Неизвестная ошибка']
      };
    }
  }

  /**
   * Получение настроек экспорта
   */
  private async getExportConfig(
    catalogCategoryId: string,
    exportType: 'quote' | 'invoice' | 'supplier_order'
  ): Promise<ExportConfig | null> {
    const setting = await prisma.exportSetting.findUnique({
      where: {
        catalog_category_id_export_type: {
          catalog_category_id: catalogCategoryId,
          export_type: exportType
        }
      }
    });

    if (!setting) {
      // Возвращаем настройки по умолчанию
      return this.getDefaultExportConfig(exportType);
    }

    return {
      export_type: setting.export_type as 'quote' | 'invoice' | 'supplier_order',
      fields_config: JSON.parse(setting.fields_config),
      display_config: JSON.parse(setting.display_config)
    };
  }

  /**
   * Настройки экспорта по умолчанию
   */
  private getDefaultExportConfig(exportType: 'quote' | 'invoice' | 'supplier_order'): ExportConfig {
    const baseConfig = {
      fields_config: [
        { field: 'sku', label: 'Артикул', width: 15, required: true },
        { field: 'name', label: 'Название', width: 30, required: true },
        { field: 'quantity', label: 'Количество', width: 12, format: 'number', required: true },
        { field: 'unit_price', label: 'Цена за ед.', width: 15, format: 'currency', required: true },
        { field: 'total_price', label: 'Сумма', width: 15, format: 'currency', required: true }
      ],
      display_config: {
        title: '',
        company_name: 'ООО "Компания"',
        company_address: 'г. Москва, ул. Примерная, д. 1',
        company_phone: '+7 (495) 123-45-67',
        company_email: 'info@company.ru',
        show_totals: true,
        show_tax: true,
        tax_rate: 20,
        currency: 'RUB',
        date_format: 'DD.MM.YYYY',
        number_format: '#,##0.00'
      }
    };

    switch (exportType) {
      case 'quote':
        return {
          ...baseConfig,
          display_config: {
            ...baseConfig.display_config,
            title: 'Коммерческое предложение'
          }
        };
      case 'invoice':
        return {
          ...baseConfig,
          display_config: {
            ...baseConfig.display_config,
            title: 'Счет на оплату'
          }
        };
      case 'supplier_order':
        return {
          ...baseConfig,
          display_config: {
            ...baseConfig.display_config,
            title: 'Заказ поставщику'
          }
        };
      default:
        return baseConfig;
    }
  }

  /**
   * Получение товаров для экспорта
   */
  private async getProductsForExport(
    catalogCategoryId: string,
    productIds?: string[]
  ): Promise<ProductExportData[]> {
    const where: any = {
      catalog_category_id: catalogCategoryId,
      is_active: true
    };

    if (productIds && productIds.length > 0) {
      where.id = { in: productIds };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        catalog_category: {
          select: {
            name: true,
            path: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return products.map(product => ({
      sku: product.sku,
      name: product.name,
      quantity: 1, // По умолчанию количество 1
      unit_price: product.base_price,
      total_price: product.base_price,
      properties: JSON.parse(product.properties_data),
      catalog_category: product.catalog_category
    }));
  }

  /**
   * Генерация Excel файла
   */
  private generateExcelWorkbook(products: ProductExportData[], config: ExportConfig): XLSX.WorkBook {
    const workbook = XLSX.utils.book_new();

    // Создаем основной лист
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Добавляем заголовок документа
    const headerRows = this.generateDocumentHeader(config);
    headerRows.forEach((row, index) => {
      XLSX.utils.sheet_add_aoa(worksheet, [row], { origin: `A${index + 1}` });
    });

    // Добавляем заголовки колонок
    const columnHeaders = config.fields_config.map(field => field.label);
    XLSX.utils.sheet_add_aoa(worksheet, [columnHeaders], { 
      origin: `A${headerRows.length + 3}` 
    });

    // Добавляем данные товаров
    const dataRows = products.map(product => 
      config.fields_config.map(field => {
        switch (field.field) {
          case 'sku':
            return product.sku;
          case 'name':
            return product.name;
          case 'quantity':
            return product.quantity;
          case 'unit_price':
            return product.unit_price;
          case 'total_price':
            return product.total_price;
          default:
            return product.properties[field.field] || '';
        }
      })
    );

    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { 
      origin: `A${headerRows.length + 4}` 
    });

    // Добавляем итоги
    if (config.display_config.show_totals) {
      const totalRow = this.generateTotalRow(products, config);
      XLSX.utils.sheet_add_aoa(worksheet, [totalRow], { 
        origin: `A${headerRows.length + 4 + dataRows.length + 2}` 
      });
    }

    // Настраиваем ширину колонок
    worksheet['!cols'] = config.fields_config.map(field => ({ width: field.width }));

    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Экспорт');

    return workbook;
  }

  /**
   * Генерация заголовка документа
   */
  private generateDocumentHeader(config: ExportConfig): string[][] {
    const rows: string[][] = [];

    // Заголовок документа
    if (config.display_config.title) {
      rows.push([config.display_config.title]);
      rows.push([]);
    }

    // Информация о компании
    rows.push([config.display_config.company_name]);
    rows.push([config.display_config.company_address]);
    rows.push([config.display_config.company_phone]);
    rows.push([config.display_config.company_email]);
    rows.push([]);

    // Дата
    rows.push([`Дата: ${new Date().toLocaleDateString('ru-RU')}`]);
    rows.push([]);

    return rows;
  }

  /**
   * Генерация строки итогов
   */
  private generateTotalRow(products: ProductExportData[], config: ExportConfig): string[] {
    const totalAmount = products.reduce((sum, product) => sum + product.total_price, 0);
    const taxAmount = config.display_config.show_tax 
      ? totalAmount * (config.display_config.tax_rate / 100)
      : 0;
    const finalAmount = totalAmount + taxAmount;

    const row = new Array(config.fields_config.length).fill('');
    
    // Находим колонку "Сумма"
    const totalPriceIndex = config.fields_config.findIndex(field => field.field === 'total_price');
    if (totalPriceIndex !== -1) {
      row[totalPriceIndex] = totalAmount;
    }

    // Добавляем строки с налогом и итогом
    return row;
  }

  /**
   * Генерация имени файла
   */
  private generateFileName(
    exportType: 'quote' | 'invoice' | 'supplier_order',
    catalogCategoryId: string
  ): string {
    const date = new Date().toISOString().split('T')[0];
    const typeNames = {
      quote: 'КП',
      invoice: 'Счет',
      supplier_order: 'Заказ'
    };

    return `${typeNames[exportType]}_${catalogCategoryId}_${date}.xlsx`;
  }

  /**
   * Сохранение настроек экспорта
   */
  async saveExportConfig(
    catalogCategoryId: string,
    exportType: 'quote' | 'invoice' | 'supplier_order',
    config: ExportConfig
  ): Promise<void> {
    await prisma.exportSetting.upsert({
      where: {
        catalog_category_id_export_type: {
          catalog_category_id: catalogCategoryId,
          export_type: exportType
        }
      },
      update: {
        fields_config: JSON.stringify(config.fields_config),
        display_config: JSON.stringify(config.display_config)
      },
      create: {
        catalog_category_id: catalogCategoryId,
        export_type: exportType,
        fields_config: JSON.stringify(config.fields_config),
        display_config: JSON.stringify(config.display_config)
      }
    });
  }

  /**
   * Получение всех настроек экспорта для категории
   */
  async getExportConfigs(catalogCategoryId: string): Promise<ExportConfig[]> {
    const settings = await prisma.exportSetting.findMany({
      where: { catalog_category_id: catalogCategoryId }
    });

    return settings.map(setting => ({
      export_type: setting.export_type as 'quote' | 'invoice' | 'supplier_order',
      fields_config: JSON.parse(setting.fields_config),
      display_config: JSON.parse(setting.display_config)
    }));
  }

  /**
   * Удаление настроек экспорта
   */
  async deleteExportConfig(
    catalogCategoryId: string,
    exportType: 'quote' | 'invoice' | 'supplier_order'
  ): Promise<void> {
    await prisma.exportSetting.delete({
      where: {
        catalog_category_id_export_type: {
          catalog_category_id: catalogCategoryId,
          export_type: exportType
        }
      }
    });
  }
}

export const exportService = new ExportService();
