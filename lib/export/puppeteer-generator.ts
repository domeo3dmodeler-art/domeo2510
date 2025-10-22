import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';

// Кэшированный браузер для ускорения генерации
let cachedBrowser: puppeteer.Browser | null = null;

// Функция для очистки кэшированного браузера
export async function cleanupBrowserCache() {
  if (cachedBrowser && cachedBrowser.isConnected()) {
    console.log('🧹 Очищаем кэш браузера...');
    await cachedBrowser.close();
    cachedBrowser = null;
  }
}

// Генерация PDF с Puppeteer
export async function generatePDFWithPuppeteer(data: any): Promise<Buffer> {
  const startTime = Date.now();
  console.log('🚀 Начинаем генерацию PDF с Puppeteer...');

  try {
    const title = data.type === 'quote' ? 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ' :
                  data.type === 'invoice' ? 'СЧЕТ' : 'ЗАКАЗ';

    console.log('📄 Создаем HTML контент для PDF...');

    // Создаем HTML контент с правильной кодировкой
    const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body { 
      font-family: 'Arial', 'Helvetica', sans-serif; 
      font-size: 12px; 
      margin: 0;
      padding: 0;
      line-height: 1.4;
      color: #000;
    }
    .header { 
      text-align: center; 
      font-size: 18px; 
      font-weight: bold; 
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .info { 
      margin-bottom: 20px; 
      line-height: 1.6;
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
    }
    .info div { margin-bottom: 5px; }
    .info strong { font-weight: bold; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 20px;
      font-size: 11px;
    }
    th, td { 
      border: 1px solid #000; 
      padding: 8px; 
      text-align: left;
      vertical-align: top;
    }
    th { 
      background-color: #e0e0e0; 
      font-weight: bold;
      text-align: center;
    }
    .number { text-align: center; width: 5%; }
    .sku { width: 15%; }
    .name { width: 40%; }
    .price { text-align: right; width: 15%; }
    .qty { text-align: center; width: 10%; }
    .total { text-align: right; width: 15%; }
    .total-row { 
      text-align: right; 
      font-size: 14px; 
      font-weight: bold; 
      margin-top: 20px;
      border-top: 2px solid #000;
      padding-top: 10px;
    }
    .footer { 
      font-size: 10px; 
      margin-top: 30px; 
      text-align: center; 
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">${title}</div>
  
  <div class="info">
    <div><strong>Клиент:</strong> ${data.client.name || 'N/A'}</div>
    <div><strong>Телефон:</strong> ${data.client.phone || 'N/A'}</div>
    <div><strong>Адрес:</strong> ${data.client.address || 'N/A'}</div>
    <div><strong>Номер документа:</strong> ${data.documentNumber}</div>
    <div><strong>Дата:</strong> ${new Date().toLocaleDateString('ru-RU')}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th class="number">№</th>
        <th class="sku">Артикул</th>
        <th class="name">Наименование</th>
        <th class="price">Цена за ед.</th>
        <th class="qty">Кол-во</th>
        <th class="total">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map((item: any, index: number) => `
        <tr>
          <td class="number">${index + 1}</td>
          <td class="sku">${item.sku || 'N/A'}</td>
          <td class="name">${item.name}</td>
          <td class="price">${item.unitPrice.toLocaleString('ru-RU')} ₽</td>
          <td class="qty">${item.quantity}</td>
          <td class="total">${item.total.toLocaleString('ru-RU')} ₽</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="total-row">Итого: ${data.totalAmount.toLocaleString('ru-RU')} ₽</div>
  
  <div class="footer">Документ сгенерирован автоматически системой Domeo</div>
</body>
</html>`;

    console.log('🌐 Запускаем Puppeteer браузер...');
    
    // Используем минимальные флаги для стабильности
    console.log('🆕 Создаем новый браузер (минимальные флаги)...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security'
      ],
      timeout: 30000 // Увеличиваем таймаут для стабильности
    });

    console.log('📄 Создаем новую страницу...');
    const page = await browser.newPage();
    
    console.log('📝 Устанавливаем HTML контент...');
    // Устанавливаем контент страницы с надежным ожиданием
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0', // Возвращаем надежное ожидание
      timeout: 30000 
    });

    console.log('🖨️ Генерируем PDF...');
    // Генерируем PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      timeout: 30000 // Увеличиваем таймаут для стабильности
    });

    console.log('🔒 Закрываем браузер...');
    await browser.close();

    const endTime = Date.now();
    console.log(`⚡ PDF сгенерирован за ${endTime - startTime}ms`);

    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    console.error('❌ Ошибка генерации PDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`); 
  }
}

// Получение шаблона для категории дверей
async function getDoorTemplate() {
  const category = await prisma.catalogCategory.findFirst({
    where: { name: 'Межкомнатные двери' }
  });

  if (!category) {
    throw new Error('Категория "Межкомнатные двери" не найдена');
  }

  const template = await prisma.importTemplate.findUnique({
    where: { catalog_category_id: category.id }
  });

  if (!template) {
    throw new Error('Шаблон для категории дверей не найден');
  }

  return {
    requiredFields: JSON.parse(template.required_fields || '[]'),
    calculatorFields: JSON.parse(template.calculator_fields || '[]'),
    exportFields: JSON.parse(template.export_fields || '[]')
  };
}

// Поиск ВСЕХ товаров в БД по точной конфигурации
async function findAllProductsByConfiguration(item: any) {
  console.log('🔍 Ищем ВСЕ товары по конфигурации:');
  console.log('📦 Полный объект товара из корзины:', JSON.stringify(item, null, 2));
  console.log('🎯 Параметры поиска:', {
    model: item.model,
    finish: item.finish,
    color: item.color,
    width: item.width,
    height: item.height
  });

  // Получаем все товары категории дверей
  const allProducts = await prisma.product.findMany({
    where: {
      catalog_category: { name: "Межкомнатные двери" }
    },
    select: { properties_data: true, name: true, sku: true }
  });

  console.log(`📦 Найдено ${allProducts.length} товаров для поиска`);

  const matchingProducts = [];

  for (const product of allProducts) {
    if (product.properties_data) {
      try {
        const props = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
        
            // Проверяем ТОЧНОЕ соответствие конфигурации
            const modelMatch = !item.model || props['Domeo_Название модели для Web'] === item.model;
            const finishMatch = !item.finish || props['Тип покрытия'] === item.finish;
            const colorMatch = !item.color || props['Domeo_Цвет'] === item.color;
            // Исправляем сравнение размеров - приводим к строкам для сравнения
            const widthMatch = !item.width || String(props['Ширина/мм']) === String(item.width);
            const heightMatch = !item.height || String(props['Высота/мм']) === String(item.height);
        
        if (modelMatch && finishMatch && colorMatch && widthMatch && heightMatch) {
          console.log('✅ Найден подходящий товар:', product.sku);
          console.log('   Совпадения:', { modelMatch, finishMatch, colorMatch, widthMatch, heightMatch });
          matchingProducts.push(product);
        } else {
          // Логируем только первые несколько несовпадений для отладки
          if (matchingProducts.length < 3) {
            console.log('❌ Товар не подходит:', product.sku, {
              modelMatch, finishMatch, colorMatch, widthMatch, heightMatch,
              itemModel: item.model, itemFinish: item.finish, itemColor: item.color,
              itemWidth: item.width, itemHeight: item.height,
              dbModel: props['Domeo_Название модели для Web'],
              dbFinish: props['Тип покрытия'],
              dbColor: props['Domeo_Цвет'],
              dbWidth: props['Ширина/мм'],
              dbHeight: props['Высота/мм']
            });
          }
        }
      } catch (e) {
        console.warn('Ошибка парсинга properties_data:', e);
      }
    }
  }

  console.log(`🎯 Найдено ${matchingProducts.length} подходящих товаров`);
  return matchingProducts;
}

// Расширенная генерация Excel для заказа
export async function generateExcelOrder(data: any): Promise<Buffer> {
  const startTime = Date.now();
  console.log('🚀 Начинаем генерацию Excel заказа с полными свойствами...');

  try {
    // Получаем шаблон для дверей
    const template = await getDoorTemplate();
    console.log('📋 Поля шаблона:', template.exportFields.length);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Заказ');
    
    // Заголовок документа
    worksheet.mergeCells('A1:Z1');
    worksheet.getCell('A1').value = 'ЗАКАЗ';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Информация о клиенте
    worksheet.getCell('A3').value = 'Клиент:';
    worksheet.getCell('B3').value = data.client.name || 'N/A';
    worksheet.getCell('A4').value = 'Телефон:';
    worksheet.getCell('B4').value = data.client.phone || 'N/A';
    worksheet.getCell('A5').value = 'Адрес:';
    worksheet.getCell('B5').value = data.client.address || 'N/A';

    // Номер документа
    worksheet.getCell('A7').value = 'Номер документа:';
    worksheet.getCell('B7').value = data.documentNumber;
    worksheet.getCell('A8').value = 'Дата:';
    worksheet.getCell('B8').value = new Date().toLocaleDateString('ru-RU');

    // Базовые заголовки + поля из БД в нужном порядке
    const baseHeaders = ['№', 'Наименование', 'Количество', 'Цена', 'Сумма'];
    
    // Определяем нужные поля из БД в правильном порядке
    const dbFields = [
      'Цена опт',
      'Цена РРЦ', 
      'Поставщик',
      'Наименование двери у поставщика',
      'Тип покрытия',
      'Ширина/мм',
      'Высота/мм', 
      'Толщина/мм',
      'Фабрика_Цвет/Отделка',
      'SKU внутреннее',
      'Артикул поставщика'
    ];
    
    const allHeaders = [...baseHeaders, ...dbFields];
    
    // Устанавливаем заголовки
    worksheet.getRow(10).values = allHeaders;
    worksheet.getRow(10).font = { bold: true };
    
    // Цветовая схема: данные из корзины - голубой, данные из БД - бежевый
    const cartHeadersCount = baseHeaders.length;
    const dbHeadersCount = dbFields.length;
    
    // Заголовки из корзины (голубой фон)
    for (let i = 1; i <= cartHeadersCount; i++) {
      const cell = worksheet.getCell(10, i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' } // Светло-голубой
      };
    }
    
    // Заголовки из БД (бежевый фон)
    for (let i = cartHeadersCount + 1; i <= cartHeadersCount + dbHeadersCount; i++) {
      const cell = worksheet.getCell(10, i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5DC' } // Бежевый
      };
    }

    // Добавляем границу после заголовков
    for (let col = 1; col <= allHeaders.length; col++) {
      const headerCell = worksheet.getCell(10, col);
      if (!headerCell.border) headerCell.border = {};
      headerCell.border.bottom = { style: 'thin', color: { argb: 'FF000000' } };
    }

    // Обрабатываем каждый товар из корзины
    let rowIndex = 11;
    let globalRowNumber = 1;
    
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      console.log(`📦 Обрабатываем товар ${i + 1} из корзины:`, item.model);

      // Ищем ВСЕ подходящие товары в БД
      const matchingProducts = await findAllProductsByConfiguration(item);
      console.log(`🔍 Для товара "${item.name}" найдено ${matchingProducts.length} подходящих товаров в БД`);
      
      if (matchingProducts.length === 0) {
        console.log('⚠️ Не найдено подходящих товаров, создаем строку с данными из корзины');
        
        // Если не найдено товаров, создаем строку с данными из корзины
        const row = worksheet.getRow(rowIndex);
        
        // Базовые поля
        row.getCell(1).value = globalRowNumber++; // №
        row.getCell(2).value = item.name; // Наименование
        row.getCell(3).value = item.qty || item.quantity || 1; // Количество
        row.getCell(4).value = item.unitPrice || 0; // Цена
        row.getCell(5).value = (item.qty || item.quantity || 1) * (item.unitPrice || 0); // Сумма
        
        // Форматирование чисел (без .00 и с разделителями групп разрядов)
        row.getCell(4).numFmt = '#,##0';
        row.getCell(5).numFmt = '#,##0';
        
        // Заполняем пустыми значениями для полей из БД
        let colIndex = 6;
        dbFields.forEach(() => {
          row.getCell(colIndex).value = '';
          colIndex++;
        });
        
        // Цветовое выделение и выравнивание: строка из корзины - белый фон
        for (let col = 1; col <= allHeaders.length; col++) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' } // Белый фон для строки из корзины
          };
          // Выравнивание по центру
          row.getCell(col).alignment = { 
            vertical: 'middle', 
            horizontal: 'center' 
          };
        }
        
        // Добавляем границу после товара (если не последний)
        if (i < data.items.length - 1) {
          for (let col = 1; col <= allHeaders.length; col++) {
            const cell = worksheet.getCell(rowIndex - 1, col);
            if (!cell.border) cell.border = {};
            cell.border.bottom = { style: 'thin', color: { argb: 'FF000000' } };
          }
        }
        
        rowIndex++;
      } else {
        // Создаем одну строку корзины с объединенными ячейками для данных из БД
        console.log(`📝 Создаем объединенную строку для товара из корзины с ${matchingProducts.length} вариантами из БД`);
        
        const row = worksheet.getRow(rowIndex);
        
        // Базовые поля (заполняем только один раз)
        row.getCell(1).value = globalRowNumber++; // №
        row.getCell(2).value = item.name; // Наименование из корзины
        row.getCell(3).value = item.qty || item.quantity || 1; // Количество из корзины
        row.getCell(4).value = item.unitPrice || 0; // Цена из корзины
        row.getCell(5).value = (item.qty || item.quantity || 1) * (item.unitPrice || 0); // Сумма
        
        // Форматирование чисел (без .00 и с разделителями групп разрядов)
        row.getCell(4).numFmt = '#,##0';
        row.getCell(5).numFmt = '#,##0';
        
        // Объединяем ячейки для базовых полей (если есть несколько товаров из БД)
        if (matchingProducts.length > 1) {
          // Объединяем ячейки базовых полей по вертикали
          for (let col = 1; col <= 5; col++) {
            const startRow = rowIndex;
            const endRow = rowIndex + matchingProducts.length - 1;
            if (startRow !== endRow) {
              worksheet.mergeCells(startRow, col, endRow, col);
              // Выравниваем по центру для объединенных ячеек
              row.getCell(col).alignment = { 
                vertical: 'middle', 
                horizontal: 'center' 
              };
            }
          }
        }
        
        // Заполняем поля из БД для каждого найденного товара
        let currentRowIndex = rowIndex;
        
        for (let productIndex = 0; productIndex < matchingProducts.length; productIndex++) {
          const productData = matchingProducts[productIndex];
          console.log(`📝 Заполняем поля из БД для товара ${productData.sku} (${productIndex + 1}/${matchingProducts.length})`);
          
          const currentRow = worksheet.getRow(currentRowIndex);
          let colIndex = 6; // Начинаем с 6-й колонки (после базовых)
          
          if (productData.properties_data) {
            try {
              const props = typeof productData.properties_data === 'string' 
                ? JSON.parse(productData.properties_data) 
                : productData.properties_data;
              
              // Заполняем поля в нужном порядке
              dbFields.forEach(fieldName => {
                const value = props[fieldName];
                if (value !== undefined && value !== null) {
                  // Специальное форматирование для цен
                  if (fieldName === 'Цена опт' || fieldName === 'Цена РРЦ') {
                    const numValue = parseFloat(String(value));
                    if (!isNaN(numValue)) {
                      currentRow.getCell(colIndex).value = numValue;
                      currentRow.getCell(colIndex).numFmt = '#,##0';
                    } else {
                      currentRow.getCell(colIndex).value = '';
                    }
                  } else {
                    currentRow.getCell(colIndex).value = String(value);
                  }
                  console.log(`✅ Записано поле "${fieldName}": ${value}`);
                } else {
                  currentRow.getCell(colIndex).value = '';
                  console.log(`❌ Пустое поле "${fieldName}"`);
                }
                colIndex++;
              });
            } catch (e) {
              console.warn('Ошибка парсинга properties_data для товара:', e);
              // Заполняем пустыми значениями
              dbFields.forEach(() => {
                currentRow.getCell(colIndex).value = '';
                colIndex++;
              });
            }
          } else {
            console.log('❌ Нет properties_data для товара');
            // Заполняем пустыми значениями
            dbFields.forEach(() => {
              currentRow.getCell(colIndex).value = '';
              colIndex++;
            });
          }
          
          // Цветовое выделение и выравнивание: строка из БД - светло-серый фон
          for (let col = 1; col <= allHeaders.length; col++) {
            currentRow.getCell(col).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF0F0F0' } // Светло-серый фон для строки из БД
            };
            // Выравнивание по центру
            currentRow.getCell(col).alignment = { 
              vertical: 'middle', 
              horizontal: 'center' 
            };
          }
          
          currentRowIndex++;
        }
        
        // Добавляем границу после группы товаров (если не последний товар)
        if (i < data.items.length - 1) {
          for (let col = 1; col <= allHeaders.length; col++) {
            const cell = worksheet.getCell(currentRowIndex - 1, col);
            if (!cell.border) cell.border = {};
            cell.border.bottom = { style: 'thin', color: { argb: 'FF000000' } };
          }
        }
        
        // Обновляем rowIndex для следующего товара из корзины
        rowIndex = currentRowIndex;
      }
    }

    // Добавляем границу после последней группы товаров
    for (let col = 1; col <= allHeaders.length; col++) {
      const lastDataCell = worksheet.getCell(rowIndex - 1, col);
      if (!lastDataCell.border) lastDataCell.border = {};
      lastDataCell.border.bottom = { style: 'thin', color: { argb: 'FF000000' } };
    }

    // Итого
    const totalRow = worksheet.getRow(rowIndex + 1);
    totalRow.getCell(4).value = 'Итого:';
    totalRow.getCell(4).font = { bold: true };
    totalRow.getCell(4).alignment = { horizontal: 'right' };
    totalRow.getCell(5).value = data.totalAmount;
    totalRow.getCell(5).numFmt = '#,##0';
    totalRow.getCell(5).font = { bold: true };

    // Автоподбор ширины колонок
    worksheet.columns.forEach((column, index) => {
      if (index < 6) {
        // Базовые колонки
        column.width = 15;
      } else {
        // Колонки свойств
        column.width = 20;
      }
    });

    // Границы для таблицы
    const lastCol = String.fromCharCode(65 + allHeaders.length - 1);
    const range = `A10:${lastCol}${rowIndex}`;
    worksheet.getCell(range).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    
    const endTime = Date.now();
    console.log(`⚡ Excel заказ сгенерирован за ${endTime - startTime}ms`);
    
    return buffer;
    
  } catch (error) {
    console.error('❌ Ошибка генерации Excel заказа:', error);
    throw new Error(`Excel order generation failed: ${error.message}`);
  }
}

// Быстрая генерация Excel (для КП и Счета)
export async function generateExcelFast(data: any): Promise<Buffer> {
  const startTime = Date.now();
  console.log('🚀 Начинаем генерацию Excel...');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Документ');
  
  // Заголовки
  worksheet.getRow(1).values = ['№', 'Артикул', 'Наименование', 'Количество', 'Цена', 'Сумма'];
  worksheet.getRow(1).font = { bold: true };
  
  // Данные
  data.items.forEach((item: any, index: number) => {
    const row = worksheet.getRow(index + 2);
    row.values = [
      index + 1,
      item.sku || 'N/A',
      item.name,
      item.quantity,
      item.unitPrice,
      item.total
    ];
  });
  
  // Автоширина колонок
  worksheet.columns.forEach(column => {
    column.width = 15;
  });
  
  const buffer = await workbook.xlsx.writeBuffer() as Buffer;
  
  const endTime = Date.now();
  console.log(`⚡ Excel сгенерирован за ${endTime - startTime}ms`);
  
  return buffer;
}

// Основная функция экспорта
export async function exportDocumentWithPDF(
  type: 'quote' | 'invoice' | 'order',
  format: 'pdf' | 'excel' | 'csv',
  clientId: string,
  items: any[],
  totalAmount: number
) {
  const startTime = Date.now();
  console.log(`🚀 Экспорт ${type} в формате ${format} для ${items.length} позиций`);

  // Генерируем номер документа
  const documentNumber = `${type.toUpperCase()}-${Date.now()}`;

  // Получаем данные клиента
  let client = await prisma.client.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    console.log('⚠️ Клиент не найден, создаем тестового клиента');
    // Создаем тестового клиента для демонстрации
    client = {
      id: clientId,
      name: 'Тестовый Клиент',
      phone: '+7 (999) 123-45-67',
      address: 'Тестовый адрес',
      email: 'test@example.com'
    };
  }

  // Подготавливаем данные для экспорта
  const exportData = {
    type,
    documentNumber,
    client,
    items: items.map((item, i) => {
      // Формируем название товара в правильном формате
      let name = '';
      
      if (item.type === 'handle') {
        // Это ручка - используем название ручки с префиксом
        const handleName = item.handleName || item.handleId || 'Неизвестная ручка';
        name = `Ручка ${handleName}`;
      } else if (item.model && item.model.includes('DomeoDoors')) {
        // Это дверь - формируем полное описание
        const finish = item.finish || '';
        const color = item.color || '';
        const dimensions = item.width && item.height ? `${item.width} × ${item.height} мм` : '';
        const hardware = item.hardwareKitName || item.hardware || 'Базовый';
        // Убираем префикс "Комплект фурнитуры — " если он есть
        const cleanHardware = hardware.replace(/^Комплект фурнитуры — /, '');
        
        // Формируем название модели в правильном формате
        const modelName = item.model.replace(/DomeoDoors_/g, '').replace(/_/g, ' ');
        
        if (type === 'order') {
          name = `Дверь DomeoDoors ${modelName} (${finish}, ${color}, ${dimensions}, Комплект фурнитуры -${cleanHardware})`;
        } else {
          // Для КП и Счета - дверь с полным описанием
          name = `Дверь DomeoDoors ${modelName} (${finish}, ${color}, ${dimensions}, Комплект фурнитуры -${cleanHardware})`;
        }
      } else {
        // Другие товары - используем стандартный формат
        name = item.name || `${item.model || 'Товар'} ${item.finish || ''} ${item.color || ''}`.trim();
      }
      
      return {
        rowNumber: i + 1,
        sku: item.sku_1c || 'N/A',
        name: name,
        unitPrice: item.unitPrice || 0,
        quantity: item.qty || item.quantity || 1,
        total: (item.qty || item.quantity || 1) * (item.unitPrice || 0),
        // Дополнительные поля для поиска в БД (для заказов)
        model: item.model,
        finish: item.finish,
        color: item.color,
        width: item.width,
        height: item.height,
        style: item.style,
        hardware: item.hardware,
        sku_1c: item.sku_1c
      };
    }),
    totalAmount
  };

  let buffer: Buffer;
  let filename: string;
  let mimeType: string;

  // Генерируем файл в зависимости от формата
  switch (format) {
    case 'pdf':
      buffer = await generatePDFWithPuppeteer(exportData);
      filename = `${type}-${documentNumber}.pdf`;
      mimeType = 'application/pdf';
      break;
    
    case 'excel':
      if (type === 'order') {
        // Для заказов используем расширенную функцию с полными свойствами
        buffer = await generateExcelOrder(exportData);
      } else {
        // Для КП и Счета используем простую функцию
        buffer = await generateExcelFast(exportData);
      }
      filename = `${type}-${documentNumber}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;
    
    case 'csv':
      const csvContent = generateCSVSimple(exportData);
      buffer = Buffer.from(csvContent, 'utf-8');
      filename = `${type}-${documentNumber}.csv`;
      mimeType = 'text/csv';
      break;
    
    default:
      throw new Error('Неподдерживаемый формат экспорта');
  }

  // Создаем записи в БД
  let dbResult = null;
  try {
    dbResult = await createDocumentRecordsSimple(type, clientId, items, totalAmount, documentNumber);
    console.log(`✅ Записи в БД созданы: ${dbResult.type} #${dbResult.id}`);
  } catch (error) {
    console.error('❌ Ошибка создания записей в БД:', error);
  }

  const endTime = Date.now();
  console.log(`⚡ Экспорт завершен за ${endTime - startTime}ms`);

  return {
    buffer,
    filename,
    mimeType,
    documentNumber,
    documentId: dbResult?.id,
    documentType: dbResult?.type
  };
}

// Простая генерация CSV
function generateCSVSimple(data: any): string {
  const headers = ['№', 'Артикул', 'Наименование', 'Количество', 'Цена', 'Сумма'];
  const rows = data.items.map((item: any, index: number) => [
    index + 1,
    item.sku || 'N/A',
    `"${item.name}"`,
    item.quantity,
    item.unitPrice,
    item.total
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Пакетное создание записей в БД
async function createDocumentRecordsSimple(
  type: 'quote' | 'invoice' | 'order',
  clientId: string,
  items: any[],
  totalAmount: number,
  documentNumber: string
) {
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    throw new Error('Клиент не найден');
  }

  if (type === 'quote') {
    const quote = await prisma.quote.create({
      data: {
        number: documentNumber,
        client_id: clientId,
        created_by: 'system',
        status: 'DRAFT',
        subtotal: totalAmount,
        total_amount: totalAmount,
        currency: 'RUB',
        notes: 'Сгенерировано из конфигуратора дверей',
        cart_data: JSON.stringify(items) // Сохраняем данные корзины
      }
    });

    const quoteItems = items.map((item, i) => {
      // Формируем название товара в правильном формате для КП
      let name = '';
      
      if (item.type === 'handle') {
        // Это ручка - используем название ручки с префиксом
        const handleName = item.handleName || item.handleId || 'Неизвестная ручка';
        name = `Ручка ${handleName}`;
      } else if (item.model && item.model.includes('DomeoDoors')) {
        // Это дверь - формируем полное описание
        const finish = item.finish || '';
        const color = item.color || '';
        const dimensions = item.width && item.height ? `${item.width} × ${item.height} мм` : '';
        const hardware = item.hardwareKitName || item.hardware || 'Базовый';
        // Убираем префикс "Комплект фурнитуры — " если он есть
        const cleanHardware = hardware.replace(/^Комплект фурнитуры — /, '');
        
        // Формируем название модели в правильном формате
        const modelName = item.model.replace(/DomeoDoors_/g, '').replace(/_/g, ' ');
        
        name = `Дверь DomeoDoors ${modelName} (${finish}, ${color}, ${dimensions}, Комплект фурнитуры -${cleanHardware})`;
      } else {
        // Другие товары
        name = item.name || `${item.model || 'Товар'} ${item.finish || ''} ${item.color || ''}`.trim();
      }
      
      return {
        quote_id: quote.id,
        product_id: item.id || `temp_${i}`,
        quantity: item.qty || item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total_price: (item.qty || item.quantity || 1) * (item.unitPrice || 0),
        notes: `${name} | Артикул: ${item.sku_1c || 'N/A'}`
      };
    });

    await prisma.quoteItem.createMany({
      data: quoteItems
    });

    return { id: quote.id, type: 'quote' };

  } else if (type === 'invoice') {
    const invoice = await prisma.invoice.create({
      data: {
        number: documentNumber,
        client_id: clientId,
        created_by: 'system',
        status: 'DRAFT',
        subtotal: totalAmount,
        total_amount: totalAmount,
        currency: 'RUB',
        notes: 'Сгенерировано из конфигуратора дверей',
        cart_data: JSON.stringify(items) // Сохраняем данные корзины
      }
    });

    const invoiceItems = items.map((item, i) => {
      // Формируем название товара в правильном формате для Счета
      let name = '';
      
      if (item.type === 'handle') {
        // Это ручка - используем название ручки с префиксом
        const handleName = item.handleName || item.handleId || 'Неизвестная ручка';
        name = `Ручка ${handleName}`;
      } else if (item.model && item.model.includes('DomeoDoors')) {
        // Это дверь - формируем полное описание
        const finish = item.finish || '';
        const color = item.color || '';
        const dimensions = item.width && item.height ? `${item.width} × ${item.height} мм` : '';
        const hardware = item.hardwareKitName || item.hardware || 'Базовый';
        // Убираем префикс "Комплект фурнитуры — " если он есть
        const cleanHardware = hardware.replace(/^Комплект фурнитуры — /, '');
        
        // Формируем название модели в правильном формате
        const modelName = item.model.replace(/DomeoDoors_/g, '').replace(/_/g, ' ');
        
        name = `Дверь DomeoDoors ${modelName} (${finish}, ${color}, ${dimensions}, Комплект фурнитуры -${cleanHardware})`;
      } else {
        // Другие товары
        name = item.name || `${item.model || 'Товар'} ${item.finish || ''} ${item.color || ''}`.trim();
      }
      
      return {
        invoice_id: invoice.id,
        product_id: item.id || `temp_${i}`,
        quantity: item.qty || item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total_price: (item.qty || item.quantity || 1) * (item.unitPrice || 0),
        notes: `${name} | Артикул: ${item.sku_1c || 'N/A'}`
      };
    });

    await prisma.invoiceItem.createMany({
      data: invoiceItems
    });

    return { id: invoice.id, type: 'invoice' };

  } else if (type === 'order') {
    const order = await prisma.order.create({
      data: {
        number: documentNumber,
        client_id: clientId,
        created_by: 'system',
        status: 'PENDING',
        subtotal: totalAmount,
        total_amount: totalAmount,
        currency: 'RUB',
        notes: 'Сгенерировано из конфигуратора дверей',
        cart_data: JSON.stringify(items) // Сохраняем данные корзины
      }
    });

    const orderItems = items.map((item, i) => {
      // Формируем название товара в правильном формате для Заказа
      let name = '';
      
      if (item.type === 'handle') {
        // Это ручка - используем название ручки с префиксом
        const handleName = item.handleName || item.handleId || 'Неизвестная ручка';
        name = `Ручка ${handleName}`;
      } else if (item.model && item.model.includes('DomeoDoors')) {
        // Это дверь - формируем полное описание
        const finish = item.finish || '';
        const color = item.color || '';
        const dimensions = item.width && item.height ? `${item.width} × ${item.height} мм` : '';
        const hardware = item.hardwareKitName || item.hardware || 'Базовый';
        // Убираем префикс "Комплект фурнитуры — " если он есть
        const cleanHardware = hardware.replace(/^Комплект фурнитуры — /, '');
        
        // Формируем название модели в правильном формате
        const modelName = item.model.replace(/DomeoDoors_/g, '').replace(/_/g, ' ');
        
        name = `Дверь DomeoDoors ${modelName} (${finish}, ${color}, ${dimensions}, Комплект фурнитуры -${cleanHardware})`;
      } else {
        // Другие товары
        name = item.name || `${item.model || 'Товар'} ${item.finish || ''} ${item.color || ''}`.trim();
      }
      
      return {
        order_id: order.id,
        product_id: item.id || `temp_${i}`,
        quantity: item.qty || item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total_price: (item.qty || item.quantity || 1) * (item.unitPrice || 0),
        notes: `${name} | Артикул: ${item.sku_1c || 'N/A'}`
      };
    });

    await prisma.orderItem.createMany({
      data: orderItems
    });

    return { id: order.id, type: 'order' };
  }

  throw new Error('Неподдерживаемый тип документа');
}

// Очистка ресурсов
export async function cleanupExportResources() {
  // Puppeteer автоматически закрывает браузеры
}