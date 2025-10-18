import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===================== Экспорт конфигурации =====================

export async function POST(req: NextRequest) {
  try {
    const { type, configData, categoryId } = await req.json();

    if (!type || !configData) {
      return NextResponse.json(
        { error: 'Не указан тип экспорта или данные конфигурации' },
        { status: 400 }
      );
    }

    // Получаем информацию о категории
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: true
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    let result;

    switch (type) {
      case 'kp':
        result = await generateKP(configData, category);
        break;
      case 'invoice':
        result = await generateInvoice(configData, category);
        break;
      case 'order':
        result = await generateOrder(configData, category);
        break;
      case 'pdf':
        result = await generatePDF(configData, category);
        break;
      case 'excel':
        result = await generateExcel(configData, category);
        break;
      default:
        return NextResponse.json(
          { error: 'Неподдерживаемый тип экспорта' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      filename: result.filename,
      downloadUrl: result.downloadUrl
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Ошибка при экспорте' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// ===================== Генерация КП =====================

async function generateKP(configData: any, category: any) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `KP_${category.name}_${timestamp}.pdf`;

  // Здесь будет логика генерации PDF с КП
  // Пока возвращаем заглушку
  const kpData = {
    title: `Коммерческое предложение - ${category.name}`,
    date: new Date().toLocaleDateString('ru-RU'),
    category: category.name,
    config: configData,
    items: [
      {
        name: 'Основной товар',
        description: 'Описание товара',
        quantity: 1,
        price: 15000,
        total: 15000
      }
    ],
    total: 15000,
    notes: 'Коммерческое предложение сгенерировано автоматически'
  };

  return {
    filename,
    downloadUrl: `/api/download/${filename}`,
    data: kpData
  };
}

// ===================== Генерация счета =====================

async function generateInvoice(configData: any, category: any) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Invoice_${category.name}_${timestamp}.pdf`;

  const invoiceData = {
    title: `Счет на оплату - ${category.name}`,
    date: new Date().toLocaleDateString('ru-RU'),
    category: category.name,
    config: configData,
    items: [
      {
        name: 'Основной товар',
        description: 'Описание товара',
        quantity: 1,
        price: 15000,
        total: 15000
      }
    ],
    total: 15000,
    tax: 1500,
    totalWithTax: 16500,
    notes: 'Счет сгенерирован автоматически'
  };

  return {
    filename,
    downloadUrl: `/api/download/${filename}`,
    data: invoiceData
  };
}

// ===================== Генерация заказа =====================

async function generateOrder(configData: any, category: any) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Order_${category.name}_${timestamp}.pdf`;

  const orderData = {
    title: `Заказ поставщику - ${category.name}`,
    date: new Date().toLocaleDateString('ru-RU'),
    category: category.name,
    config: configData,
    items: [
      {
        name: 'Основной товар',
        description: 'Описание товара',
        quantity: 1,
        price: 15000,
        total: 15000
      }
    ],
    total: 15000,
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU'),
    notes: 'Заказ сгенерирован автоматически'
  };

  return {
    filename,
    downloadUrl: `/api/download/${filename}`,
    data: orderData
  };
}

// ===================== Генерация PDF =====================

async function generatePDF(configData: any, category: any) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Config_${category.name}_${timestamp}.pdf`;

  // Здесь будет логика генерации PDF с конфигурацией
  const pdfData = {
    title: `Конфигурация товара - ${category.name}`,
    date: new Date().toLocaleDateString('ru-RU'),
    category: category.name,
    config: configData,
    summary: 'Сводка по конфигурации товара'
  };

  return {
    filename,
    downloadUrl: `/api/download/${filename}`,
    data: pdfData
  };
}

// ===================== Генерация Excel =====================

async function generateExcel(configData: any, category: any) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Config_${category.name}_${timestamp}.xlsx`;

  // Здесь будет логика генерации Excel с конфигурацией
  const excelData = {
    title: `Конфигурация товара - ${category.name}`,
    date: new Date().toLocaleDateString('ru-RU'),
    category: category.name,
    config: configData,
    sheets: [
      {
        name: 'Конфигурация',
        data: [
          ['Параметр', 'Значение'],
          ['Категория', category.name],
          ['Стиль', configData.style || 'Не указан'],
          ['Модель', configData.model || 'Не указана'],
          ['Материал', configData.material || 'Не указан'],
          ['Цвет', configData.color || 'Не указан'],
          ['Ширина', configData.width || 'Не указана'],
          ['Высота', configData.height || 'Не указана']
        ]
      },
      {
        name: 'Фурнитура',
        data: [
          ['Тип фурнитуры', 'Выбрано'],
          ...(configData.hardware || []).map((item: string) => [item, 'Да'])
        ]
      }
    ]
  };

  return {
    filename,
    downloadUrl: `/api/download/${filename}`,
    data: excelData
  };
}
