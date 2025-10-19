import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { fixFieldsEncoding, fixAllEncoding } from '@/lib/encoding-utils';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const catalogCategoryId = searchParams.get('catalogCategoryId');

    if (!catalogCategoryId) {
      return NextResponse.json({ success: false, error: 'catalogCategoryId is required' }, { status: 400 });
    }

    // Получаем шаблон для категории
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: catalogCategoryId },
      include: {
        catalog_category: {
          select: { name: true }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found for this category' }, { status: 404 });
    }

    // Парсим поля шаблона с исправлением кодировки
    let requiredFields = JSON.parse(template.required_fields || '[]');
    const calculatorFields = JSON.parse(template.calculator_fields || '[]');
    const exportFields = JSON.parse(template.export_fields || '[]');
    const templateConfig = JSON.parse(template.template_config || '{}');
    
    // Исправляем кодировку полей
    requiredFields = fixFieldsEncoding(requiredFields);

    // Создаем заголовки для Excel файла
    const headers = Array.isArray(requiredFields) ? requiredFields : 
                   ['Артикул поставщика', 'Domeo_Название модели для Web'];
    
    // Создаем примеры данных для каждого поля
    const exampleData = headers.map((header: string) => {
      switch (header) {
        case 'Артикул поставщика':
          return 'SUP-001';
        case 'Domeo_Название модели для Web':
          return 'Модель А';
        case 'Ширина/мм':
          return 800;
        case 'Высота/мм':
          return 2000;
        case 'Толщина/мм':
          return 40;
        case 'Тип покрытия':
          return 'Экошпон';
        case 'Domeo_Цвет':
          return 'Дуб';
        case 'Domeo_Стиль Web':
          return 'Современный';
        case 'Тип конструкции':
          return 'Царговая';
        case 'Тип открывания':
          return 'Распашная';
        case 'Поставщик':
          return 'Поставщик А';
        case 'Ед.изм.':
          return 'шт';
        case 'Склад/заказ':
          return 'Склад';
        case 'Цена опт':
          return 15000;
        case 'Кромка':
          return 'Да';
        case 'Стоимость надбавки за кромку':
          return 500;
        case 'Молдинг':
          return 'Нет';
        case 'Стекло':
          return 'Нет';
        case 'Фабрика_Коллекция':
          return 'Коллекция А';
        case 'Фабрика_Цвет/Отделка':
          return 'Дуб светлый';
        case 'photos':
          return 'photo1.jpg, photo2.jpg';
        case 'Domeo_Название модели для Web':
          return 'Модель А';
        case 'Domeo_Стиль Web':
          return 'Современный';
        case 'Тип покрытия':
          return 'ПВХ';
        case 'Domeo_Цвет':
          return 'Белый';
        case 'Ширина/мм':
          return 600;
        case 'Высота/мм':
          return 2000;
        case 'Толщина/мм':
          return 40;
        case 'Тип открывания':
          return 'Распашная';
        case 'Поставщик':
          return 'Поставщик А';
        case 'Ед.изм.':
          return 'шт';
        case 'Склад/заказ':
          return 'В наличии';
        default:
          return 'Пример';
      }
    });

    // Создаем Excel файл
    const excelData = [
      headers,
      exampleData
    ];

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Настраиваем кодировку для правильного отображения русских символов
    ws['!cols'] = headers.map(() => ({ width: 20 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Шаблон');

    // Добавляем инструкции на отдельный лист
    const instructionsData = [
      ['ИНСТРУКЦИЯ ПО ЗАПОЛНЕНИЮ ШАБЛОНА'],
      [''],
      ['ПОЛЯ ШАБЛОНА:'],
      ...requiredFields.map((field: string) => [field, 'Поле для импорта товаров']),
      [''],
      ['ВАЖНО:'],
      ['- Заголовки должны точно совпадать с шаблоном'],
      ['- Не удаляйте и не переименовывайте столбцы'],
      ['- Заполните все поля шаблона'],
      ['- SKU генерируется автоматически']
    ];

    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Инструкция');

    // Генерируем буфер с правильной кодировкой
    const buffer = XLSX.write(wb, { 
      type: 'buffer', 
      bookType: 'xlsx',
      cellStyles: true,
      compression: true
    });

    // Возвращаем файл с безопасным именем
    const categoryName = template.catalog_category?.name || 'category';
    const safeCategoryName = categoryName.replace(/[^a-zA-Z0-9]/g, '_'); // Заменяем все не-ASCII символы на подчеркивания
    const fileName = `template_${safeCategoryName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
           return new NextResponse(buffer, {
             headers: {
               'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'Content-Disposition': `attachment; filename="${fileName}"`,
               'Content-Length': buffer.length.toString(),
               'Cache-Control': 'no-cache, no-store, must-revalidate',
               'Pragma': 'no-cache',
               'Expires': '0'
             },
           });

  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
