import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { apiErrorHandler } from '@/lib/api-error-handler';
import { apiValidator } from '@/lib/api-validator';

const prisma = new PrismaClient();

// ===================== НАСТРОЙКИ ЭКСПОРТА =====================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const catalogCategoryId = searchParams.get('catalogCategoryId');
    const exportType = searchParams.get('exportType') || 'default';

    apiValidator.validateId(catalogCategoryId!, 'catalogCategoryId');

    // Получаем настройки экспорта
    let exportSetting = await prisma.exportSetting.findUnique({
      where: {
        catalog_category_id_export_type: {
          catalog_category_id: catalogCategoryId!,
          export_type: exportType
        }
      }
    });

    // Если настройки нет, создаем по умолчанию
    if (!exportSetting) {
      const defaultConfig = getDefaultExportConfig(exportType);
      exportSetting = await prisma.exportSetting.create({
        data: {
          catalog_category_id: catalogCategoryId!,
          export_type: exportType,
          fields_config: JSON.stringify(defaultConfig.fields),
          display_config: JSON.stringify(defaultConfig.display)
        }
      });
    }

    const fieldsConfig = JSON.parse(exportSetting.fields_config || '[]');
    const displayConfig = JSON.parse(exportSetting.display_config || '{}');

    return NextResponse.json({
      success: true,
      config: {
        id: exportSetting.id,
        exportType: exportSetting.export_type,
        fields: fieldsConfig,
        display: displayConfig
      }
    });

  } catch (error) {
    return apiErrorHandler.handle(error, 'export-config-get');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      catalogCategoryId, 
      exportType, 
      fields, 
      display 
    } = body;

    apiValidator.validateId(catalogCategoryId, 'catalogCategoryId');

    // Валидируем поля
    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'Поля экспорта не могут быть пустыми' },
        { status: 400 }
      );
    }

    // Проверяем уникальность ключей полей
    const fieldKeys = fields.map(field => field.key);
    const uniqueKeys = new Set(fieldKeys);
    if (uniqueKeys.size !== fieldKeys.length) {
      return NextResponse.json(
        { error: 'Ключи полей должны быть уникальными' },
        { status: 400 }
      );
    }

    // Сохраняем или обновляем настройки
    const exportSetting = await prisma.exportSetting.upsert({
      where: {
        catalog_category_id_export_type: {
          catalog_category_id: catalogCategoryId,
          export_type: exportType
        }
      },
      update: {
        fields_config: JSON.stringify(fields),
        display_config: JSON.stringify(display)
      },
      create: {
        catalog_category_id: catalogCategoryId,
        export_type: exportType,
        fields_config: JSON.stringify(fields),
        display_config: JSON.stringify(display)
      }
    });

    return NextResponse.json({
      success: true,
      config: {
        id: exportSetting.id,
        exportType: exportSetting.export_type,
        fields: JSON.parse(exportSetting.fields_config || '[]'),
        display: JSON.parse(exportSetting.display_config || '{}')
      }
    });

  } catch (error) {
    return apiErrorHandler.handle(error, 'export-config-post');
  }
}

// ===================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====================

function getDefaultExportConfig(exportType: string) {
  const baseFields = [
    { key: 'sku', label: 'SKU', source: 'product', format: 'text', required: true },
    { key: 'name', label: 'Название', source: 'product', format: 'text', required: true },
    { key: 'supplier_sku', label: 'Артикул поставщика', source: 'properties', propertyKey: 'Артикул поставщика', format: 'text', required: true },
    { key: 'model_name', label: 'Название модели', source: 'properties', propertyKey: 'Domeo_Название модели для Web', format: 'text', required: true },
    { key: 'width', label: 'Ширина/мм', source: 'properties', propertyKey: 'Ширина/мм', format: 'number', required: true },
    { key: 'height', label: 'Высота/мм', source: 'properties', propertyKey: 'Высота/мм', format: 'number', required: true },
    { key: 'thickness', label: 'Толщина/мм', source: 'properties', propertyKey: 'Толщина/мм', format: 'number', required: false },
    { key: 'color', label: 'Цвет', source: 'properties', propertyKey: 'Domeo_Цвет', format: 'text', required: false },
    { key: 'supplier', label: 'Поставщик', source: 'properties', propertyKey: 'Поставщик', format: 'text', required: false },
    { key: 'price_rrc', label: 'Цена РРЦ', source: 'properties', propertyKey: 'Цена РРЦ', format: 'currency', required: true },
    { key: 'price_opt', label: 'Цена опт', source: 'properties', propertyKey: 'Цена опт', format: 'currency', required: true },
    { key: 'base_price', label: 'Цена базовая', source: 'product', format: 'currency', required: false },
    { key: 'stock', label: 'Остаток', source: 'product', format: 'number', required: false }
  ];

  const displayConfig = {
    title: getTitleForExportType(exportType),
    company_name: 'ООО "Домео"',
    company_address: 'г. Москва, ул. Примерная, д. 1',
    company_phone: '+7 (495) 123-45-67',
    company_email: 'info@domeo.ru',
    show_totals: true,
    show_tax: false,
    tax_rate: 0,
    currency: 'RUB',
    date_format: 'DD.MM.YYYY',
    number_format: '#,##0.00'
  };

  // Фильтруем поля в зависимости от типа экспорта
  let filteredFields = baseFields;
  
  switch (exportType) {
    case 'price_list':
      // Прайс-лист - основные поля для клиентов
      filteredFields = baseFields.filter(field => 
        ['sku', 'name', 'supplier_sku', 'model_name', 'width', 'height', 'color', 'price_rrc', 'base_price', 'stock'].includes(field.key)
      );
      break;
      
    case 'supplier_order':
      // Заказ поставщику - поля для заказа
      filteredFields = baseFields.filter(field => 
        ['sku', 'name', 'supplier_sku', 'model_name', 'width', 'height', 'thickness', 'supplier', 'price_opt'].includes(field.key)
      );
      break;
      
    case 'catalog':
      // Каталог - полная информация
      filteredFields = baseFields;
      break;
      
    case 'calculator':
      // Калькулятор - поля для расчета
      filteredFields = baseFields.filter(field => 
        ['sku', 'name', 'width', 'height', 'thickness', 'price_rrc', 'price_opt'].includes(field.key)
      );
      break;
  }

  return {
    fields: filteredFields,
    display: displayConfig
  };
}

function getTitleForExportType(exportType: string): string {
  const titles: Record<string, string> = {
    'price_list': 'Прайс-лист',
    'supplier_order': 'Заказ поставщику',
    'catalog': 'Каталог товаров',
    'calculator': 'Данные для калькулятора',
    'default': 'Экспорт товаров'
  };
  
  return titles[exportType] || titles['default'];
}
