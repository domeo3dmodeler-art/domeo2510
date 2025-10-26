import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import puppeteer, { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Кэш для товаров по категориям
const productsCache = new Map<string, any[]>();
const cacheExpiry = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// Функция для извлечения SKU поставщика из свойств товара
function extractSupplierSku(propertiesData: any): string {
  if (!propertiesData) return 'N/A';
  
  try {
    const props = typeof propertiesData === 'string' 
      ? JSON.parse(propertiesData) 
      : propertiesData;
    
    // Ищем SKU поставщика в различных полях
    return props['Артикул поставщика'] || 
           props['SKU поставщика'] || 
           props['Фабрика_артикул'] ||
           props['Артикул'] || 
           props['SKU'] || 
           'N/A';
  } catch (error) {
    console.warn('Failed to parse properties_data for SKU extraction:', error);
    return 'N/A';
  }
}

// Кэшированный браузер для ускорения генерации
let cachedBrowser: Browser | null = null;

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
    <div><strong>Клиент:</strong> ${data.client.firstName && data.client.lastName ? `${data.client.lastName} ${data.client.firstName} ${data.client.middleName || ''}`.trim() : 'N/A'}</div>
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
          <td class="sku"></td>
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

    console.log('🌐 Запускаем Puppeteer браузер с Chromium...');
    
    // Используем @sparticuz/chromium для Docker и безголовых окружений
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath();
    console.log('🆕 Создаем новый браузер с chromium executablePath...');
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath,
      headless: chromium.headless,
      timeout: 30000 // Увеличиваем таймаут для стабильности
    });

    let page: any = null;
    try {
      console.log('📄 Создаем новую страницу...');
      page = await browser.newPage();
      
      console.log('📝 Устанавливаем HTML контент...');
      // Устанавливаем контент страницы с надежным ожиданием
      await page.setContent(htmlContent, { 
        waitUntil: 'load', // Используем load вместо networkidle0 для стабильности
        timeout: 60000 
      });

      // Дополнительная задержка для стабилизации
      await new Promise(resolve => setTimeout(resolve, 500));

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
        timeout: 60000 // Увеличиваем таймаут
      });

      const endTime = Date.now();
      console.log(`⚡ PDF сгенерирован за ${endTime - startTime}ms`);

      return Buffer.from(pdfBuffer);
      
    } finally {
      // Закрываем браузер (страница закроется автоматически)
      console.log('🔒 Закрываем браузер...');
      try {
        await browser.close();
      } catch (e) {
        console.warn('⚠️ Ошибка при закрытии браузера:', e);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка генерации PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`); 
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

// Поиск ручки в БД по ID
async function findHandleById(handleId: string) {
  console.log('🔧 Ищем ручку по ID:', handleId);
  
  const handle = await prisma.product.findFirst({
    where: {
      id: handleId,
      catalog_category: { name: "Ручки" }
    },
    select: { id: true, properties_data: true, name: true, sku: true }
  });

  if (handle) {
    console.log('✅ Найдена ручка:', handle.sku);
    return [handle];
  } else {
    console.log('❌ Ручка не найдена в БД');
    return [];
  }
}

// Оптимизированный поиск товаров с кэшированием
async function findAllProductsByConfiguration(item: any) {
  console.log('🔍 Ищем товары по конфигурации (оптимизированно):');
  console.log('🎯 Параметры поиска:', {
    model: item.model,
    finish: item.finish,
    color: item.color,
    width: item.width,
    height: item.height
  });

  // Определяем категорию для поиска
  let categoryName = "Межкомнатные двери";
  if (item.type === 'handle') {
    categoryName = "Ручки";
  }

  // Проверяем кэш
  const cacheKey = categoryName;
  const now = Date.now();
  
  if (productsCache.has(cacheKey) && cacheExpiry.get(cacheKey)! > now) {
    console.log('📦 Используем кэшированные товары');
    const cachedProducts = productsCache.get(cacheKey)!;
    return findMatchingProductsInList(cachedProducts, item);
  }

  console.log('📦 Загружаем товары из БД...');
  
  // Загружаем товары с оптимизированным запросом
  const allProducts = await prisma.product.findMany({
    where: {
      catalog_category: { name: categoryName }
    },
    select: { 
      id: true, 
      properties_data: true, 
      name: true, 
      sku: true 
    },
    // Добавляем лимит для безопасности
    take: 10000
  });

  console.log(`📦 Загружено ${allProducts.length} товаров`);

  // Кэшируем результат
  productsCache.set(cacheKey, allProducts);
  cacheExpiry.set(cacheKey, now + CACHE_TTL);

  return findMatchingProductsInList(allProducts, item);
}

// Оптимизированный поиск в списке товаров
function findMatchingProductsInList(products: any[], item: any) {
  const matchingProducts = [];
  let processedCount = 0;

  for (const product of products) {
    if (product.properties_data) {
      try {
        const props = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
        
        if (item.type === 'handle') {
          // Для ручек проверяем только ID (уже найдено по ID)
          if (product.id === item.handleId) {
            console.log('✅ Найдена ручка:', product.sku);
            matchingProducts.push(product);
            break; // Для ручек нужен только один товар
          }
        } else {
          // Для дверей проверяем соответствие конфигурации
          const modelMatch = !item.model || 
            props['Domeo_Название модели для Web'] === item.model ||
            props['МОДЕЛЬ'] === item.model ||
            props['model'] === item.model ||
            (item.model && !props['Domeo_Название модели для Web'] && !props['МОДЕЛЬ'] && !props['model']);
            
          const finishMatch = !item.finish || 
            props['Материал/Покрытие'] === item.finish ||
            props['Тип покрытия'] === item.finish ||
            props['ТИП ПОКРЫТИЯ'] === item.finish ||
            props['finish'] === item.finish;
            
          const colorMatch = !item.color || 
            props['Цвет/Отделка'] === item.color ||
            props['Domeo_Цвет'] === item.color ||
            props['ЦВЕТ'] === item.color ||
            props['color'] === item.color;
            
          const widthMatch = !item.width || 
            String(props['Размер 1']) === String(item.width) ||
            String(props['Ширина/мм']) === String(item.width) ||
            String(props['width']) === String(item.width);
            
          const heightMatch = !item.height || 
            String(props['Размер 2']) === String(item.height) ||
            String(props['Высота/мм']) === String(item.height) ||
            String(props['height']) === String(item.height);
      
          if (modelMatch && finishMatch && colorMatch && widthMatch && heightMatch) {
            console.log('✅ Найден подходящий товар:', product.sku);
            matchingProducts.push(product);
            
            // Ограничиваем количество результатов для производительности
            if (matchingProducts.length >= 5) {
              console.log('⚠️ Ограничиваем результаты до 5 товаров для производительности');
              break;
            }
          }
        }
        
        processedCount++;
        
        // Логируем прогресс каждые 1000 товаров
        if (processedCount % 1000 === 0) {
          console.log(`📊 Обработано ${processedCount}/${products.length} товаров`);
        }
        
      } catch (e) {
        console.warn('Ошибка парсинга properties_data:', e);
      }
    }
  }

  console.log(`🎯 Найдено ${matchingProducts.length} подходящих товаров из ${processedCount} обработанных`);
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
    worksheet.getCell('B3').value = data.client.firstName && data.client.lastName ? `${data.client.lastName} ${data.client.firstName} ${data.client.middleName || ''}`.trim() : 'N/A';
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
      'Наименование у поставщика',
      'Материал/Покрытие',
      'Размер 1',
      'Размер 2', 
      'Размер 3',
      'Цвет/Отделка',
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

      // Ищем подходящие товары в БД
      let matchingProducts: any[] = [];
      if (item.type === 'handle' && item.handleId) {
        // Для ручек используем специальную функцию
        matchingProducts = await findHandleById(item.handleId);
      } else {
        // Для дверей используем обычную функцию
        const result = await findAllProductsByConfiguration(item);
        matchingProducts = result || [];
      }
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
              console.log(`🔍 Тип товара: "${item.type}", Заполняем поля для ${productData.sku}`);
              console.log(`🔍 Проверяем item.type === 'handle': ${item.type === 'handle'}`);
              dbFields.forEach(fieldName => {
                let value = '';
                
                // Универсальная логика для всех товаров
                if (fieldName === 'Наименование у поставщика') {
                  // Для всех товаров используем правильные поля
                  value = props['Фабрика_наименование'] || props['Наименование двери у поставщика'] || props['Наименование поставщика'] || props['Наименование'] || '';
                  console.log(`🔍 Поле "${fieldName}" заполняем: ${value} (из props: ${JSON.stringify(props)})`);
                } else if (fieldName === 'Материал/Покрытие') {
                  // Для дверей: Материал/Покрытие, для ручек: пустое
                  if (item.type === 'handle') {
                    value = ''; // Ручки не заполняют материал
                    console.log(`🔍 Ручка - поле "${fieldName}" оставляем пустым`);
                  } else {
                    value = props['Материал/Покрытие'] || props['Тип покрытия'] || '';
                    console.log(`🔍 Дверь - поле "${fieldName}" заполняем: ${value}`);
                  }
                } else if (fieldName === 'Размер 1') {
                  // Для дверей: Ширина/мм, для ручек: пустое
                  if (item.type === 'handle') {
                    value = ''; // Ручки не заполняют размеры
                    console.log(`🔍 Ручка - поле "${fieldName}" оставляем пустым`);
                  } else {
                    value = props['Ширина/мм'] || '';
                    console.log(`🔍 Дверь - поле "${fieldName}" заполняем: ${value}`);
                  }
                } else if (fieldName === 'Размер 2') {
                  // Для дверей: Высота/мм, для ручек: пустое
                  if (item.type === 'handle') {
                    value = ''; // Ручки не заполняют размеры
                    console.log(`🔍 Ручка - поле "${fieldName}" оставляем пустым`);
                  } else {
                    value = props['Высота/мм'] || '';
                    console.log(`🔍 Дверь - поле "${fieldName}" заполняем: ${value}`);
                  }
                } else if (fieldName === 'Размер 3') {
                  // Для дверей: Толщина/мм, для ручек: пустое
                  if (item.type === 'handle') {
                    value = ''; // Ручки не заполняют размеры
                    console.log(`🔍 Ручка - поле "${fieldName}" оставляем пустым`);
                  } else {
                    value = props['Толщина/мм'] || '';
                    console.log(`🔍 Дверь - поле "${fieldName}" заполняем: ${value}`);
                  }
                } else if (fieldName === 'Цвет/Отделка') {
                  // Для всех товаров используем Цвет/Отделка
                  value = props['Цвет/Отделка'] || props['Domeo_Цвет'] || '';
                } else {
                  // Остальные поля заполняем как обычно
                  if (item.type === 'handle') {
                    // Для ручек используем специальную логику для некоторых полей
                    if (fieldName === 'Цена РРЦ') {
                      value = props['Цена розница'] || props['Цена РРЦ'] || '';
                    } else if (fieldName === 'Артикул поставщика') {
                      value = props['Фабрика_артикул'] || props['Артикул поставщика'] || '';
                    } else {
                      value = props[fieldName] || '';
                    }
                    console.log(`🔍 Ручка - поле "${fieldName}" заполняем: ${value}`);
                  } else {
                    // Для дверей используем стандартную логику
                    value = props[fieldName] || '';
                    console.log(`🔍 Дверь - поле "${fieldName}" заполняем: ${value}`);
                  }
                }
                
                if (value !== undefined && value !== null && value !== '') {
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

    const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer;
    
    const endTime = Date.now();
    console.log(`⚡ Excel заказ сгенерирован за ${endTime - startTime}ms`);
    
    return buffer;
    
  } catch (error) {
    console.error('❌ Ошибка генерации Excel заказа:', error);
    throw new Error(`Excel order generation failed: ${error instanceof Error ? error.message : String(error)}`);
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
  
  const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer;
  
  const endTime = Date.now();
  console.log(`⚡ Excel сгенерирован за ${endTime - startTime}ms`);
  
  return buffer;
}

// Основная функция экспорта с поддержкой cart_session_id и parent_document_id
export async function exportDocumentWithPDF(
  type: 'quote' | 'invoice' | 'order',
  format: 'pdf' | 'excel' | 'csv',
  clientId: string,
  items: any[],
  totalAmount: number,
  cartSessionId?: string | null,
  parentDocumentId?: string | null
) {
  const startTime = Date.now();
  console.log(`🚀 Экспорт ${type} в формате ${format} для ${items.length} позиций`);

  // Проверяем, есть ли уже документ с таким содержимым
  console.log(`🔍 Ищем существующий документ типа ${type} для клиента ${clientId}`);
  const existingDocument = await findExistingDocument(type, clientId, items, totalAmount, parentDocumentId, cartSessionId);
  
  let documentId: string | null = null;
  let documentNumberForDB: string;
  let documentNumberForExport: string;
  
  if (existingDocument) {
    // Используем существующий документ
    documentNumberForDB = existingDocument.number;
    documentId = existingDocument.id;
    console.log(`🔄 Используем существующий документ: ${documentNumberForDB} (ID: ${documentId})`);
    
    // Для экспорта используем тот же номер, что и в БД, но с латинскими префиксами
    const exportPrefix = type === 'quote' ? 'KP' : type === 'invoice' ? 'Invoice' : 'Order';
    // Извлекаем timestamp из номера БД и используем его для экспорта
    // Обрабатываем как старые префиксы (QUOTE-, INVOICE-), так и новые (КП-, Счет-)
    let timestamp = documentNumberForDB.split('-')[1];
    
    // Если timestamp не найден, генерируем новый
    if (!timestamp) {
      timestamp = Date.now().toString();
    }
    
    documentNumberForExport = `${exportPrefix}-${timestamp}`;
    console.log(`📄 Номер для экспорта (тот же): ${documentNumberForExport}`);
  } else {
    // Создаем новый документ с кириллическими префиксами для БД
    const dbPrefix = type === 'quote' ? 'КП' : type === 'invoice' ? 'Счет' : 'Заказ';
    const dbTimestamp = Date.now();
    documentNumberForDB = `${dbPrefix}-${dbTimestamp}`;
    
    // Генерируем номер для экспорта с латинскими префиксами (тот же timestamp)
    const exportPrefix = type === 'quote' ? 'KP' : type === 'invoice' ? 'Invoice' : 'Order';
    documentNumberForExport = `${exportPrefix}-${dbTimestamp}`;
    console.log(`🆕 Создаем новый документ: ${documentNumberForDB} (для экспорта: ${documentNumberForExport})`);
  }

  // Получаем данные клиента
  let client = await prisma.client.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    console.log('⚠️ Клиент не найден, создаем тестового клиента');
    // Создаем тестового клиента в базе данных
    try {
      client = await prisma.client.create({
        data: {
          id: clientId,
          firstName: 'Тестовый',
          lastName: 'Клиент',
          middleName: null,
          phone: '+7 (999) 123-45-67',
          address: 'Тестовый адрес',
          objectId: `test-client-${Date.now()}`,
          customFields: '{}',
          isActive: true
        }
      });
      console.log(`✅ Тестовый клиент создан: ${client.firstName} ${client.lastName} (ID: ${client.id})`);
    } catch (error) {
      console.error('❌ Ошибка создания тестового клиента:', error);
      // Если не удалось создать клиента, используем объект в памяти
      client = {
        id: clientId,
        firstName: 'Тестовый',
        lastName: 'Клиент',
        middleName: null,
        phone: '+7 (999) 123-45-67',
        address: 'Тестовый адрес',
        objectId: 'test-client',
        customFields: '{}',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  // Подготавливаем данные для экспорта
  console.log('🔍 Debug items data:', JSON.stringify(items, null, 2));
  
  const exportData = {
    type,
    documentNumber: documentNumberForExport,
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
        sku: '', // Артикулы не показываем в PDF
        name: name,
        unitPrice: item.unitPrice || item.price || 0,
        quantity: item.qty || item.quantity || 1,
        total: (item.qty || item.quantity || 1) * (item.unitPrice || item.price || 0),
        // Дополнительные поля для поиска в БД (для заказов)
        model: item.model,
        finish: item.finish,
        color: item.color,
        width: item.width,
        height: item.height,
        style: item.style,
        hardware: item.hardware,
        sku_1c: item.sku_1c,
        // КРИТИЧНО: передаем тип товара для правильной логики
        type: item.type,
        handleId: item.handleId,
        handleName: item.handleName
      };
    }),
    totalAmount
  };

  let buffer: Buffer;
  let filename: string;
  let mimeType: string;

  // Убеждаемся, что documentNumberForExport содержит только латинские символы
  const safeDocumentNumber = documentNumberForExport.replace(/[^\x00-\x7F]/g, (char) => {
    const charCode = char.charCodeAt(0);
    if (charCode === 1050) return 'K'; // К
    if (charCode === 1055) return 'P'; // П
    if (charCode === 1057) return 'S'; // С
    if (charCode === 1095) return 'ch'; // ч
    if (charCode === 1077) return 'e'; // е
    if (charCode === 1090) return 't'; // т
    if (charCode === 1079) return 'z'; // з
    if (charCode === 1072) return 'a'; // а
    if (charCode === 1082) return 'k'; // к
    return 'X';
  });
  
  console.log(`🔒 Безопасный номер для экспорта: ${safeDocumentNumber}`);

  // Генерируем файл в зависимости от формата
  switch (format) {
    case 'pdf':
      buffer = await generatePDFWithPuppeteer(exportData);
      filename = `${safeDocumentNumber}.pdf`;
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
      filename = `${safeDocumentNumber}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;
    
    case 'csv':
      const csvContent = generateCSVSimple(exportData);
      buffer = Buffer.from(csvContent, 'utf-8');
      filename = `${safeDocumentNumber}.csv`;
      mimeType = 'text/csv';
      break;
    
    default:
      throw new Error('Неподдерживаемый формат экспорта');
  }

  // Создаем записи в БД только если документ новый
  let dbResult = null;
  if (!existingDocument) {
    try {
      dbResult = await createDocumentRecordsSimple(type, clientId, items, totalAmount, documentNumberForDB, parentDocumentId, cartSessionId);
      console.log(`✅ Записи в БД созданы: ${dbResult.type} #${dbResult.id}`);
    } catch (error) {
      console.error('❌ Ошибка создания записей в БД:', error);
    }
  } else {
    console.log(`✅ Используем существующий документ в БД: ${documentNumberForDB}`);
    dbResult = { id: documentId, type: type };
  }

  const endTime = Date.now();
  console.log(`⚡ Экспорт завершен за ${endTime - startTime}ms`);

  return {
    buffer,
    filename,
    mimeType,
    documentNumber: documentNumberForExport,
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
  
  return [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
}

// Поиск существующего документа по содержимому с учетом parent_document_id и cart_session_id
async function findExistingDocument(
  type: 'quote' | 'invoice' | 'order',
  clientId: string,
  items: any[],
  totalAmount: number,
  parentDocumentId?: string | null,
  cartSessionId?: string | null
) {
  try {
    console.log(`🔍 Поиск существующего документа: ${type}, клиент: ${clientId}, сумма: ${totalAmount}, родитель: ${parentDocumentId || 'нет'}, сессия: ${cartSessionId}`);
    
    // Создаем хеш содержимого для более точного сравнения
    const contentHash = createContentHash(clientId, items, totalAmount);
    console.log(`🔍 Content hash: ${contentHash}`);
    console.log(`🔍 Items count: ${items.length}, Items:`, items.map(item => `${item.type}:${item.model}:${item.qty || item.quantity}:${item.unitPrice || item.price}`));
    
    if (type === 'quote') {
      // Строгая логика поиска существующего КП - точное совпадение всех полей
      const existingQuote = await prisma.quote.findFirst({
        where: {
          parent_document_id: parentDocumentId || null,
          cart_session_id: cartSessionId || null,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: {
          created_at: 'desc'
        }
      });
      
      if (existingQuote) {
        console.log(`✅ Найден существующий КП: ${existingQuote.number} (ID: ${existingQuote.id})`);
        return existingQuote;
      }
    } else if (type === 'invoice') {
      // Строгая логика поиска существующего счета - точное совпадение всех полей
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          parent_document_id: parentDocumentId || null,
          cart_session_id: cartSessionId || null,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: {
          created_at: 'desc'
        }
      });
      
      if (existingInvoice) {
        console.log(`✅ Найден существующий счет: ${existingInvoice.number} (ID: ${existingInvoice.id})`);
        return existingInvoice;
      }
    } else if (type === 'order') {
      // Строгая логика поиска существующего заказа - точное совпадение всех полей
      const existingOrder = await prisma.order.findFirst({
        where: {
          parent_document_id: parentDocumentId || null,
          cart_session_id: cartSessionId || null,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: {
          created_at: 'desc'
        }
      });
      
      if (existingOrder) {
        console.log(`✅ Найден существующий заказ: ${existingOrder.number} (ID: ${existingOrder.id})`);
        return existingOrder;
      }
    }

    console.log(`❌ Существующий документ не найден`);
    return null;
  } catch (error) {
    console.error('❌ Ошибка поиска существующего документа:', error);
    return null;
  }
}

// Создание хеша содержимого для сравнения
function createContentHash(clientId: string, items: any[], totalAmount: number): string {
  const content = {
    client_id: clientId,
    items: items.map(item => ({
      id: item.id,
      type: item.type,
      model: item.model,
      qty: item.qty || item.quantity,
      unitPrice: item.unitPrice || item.price,
      name: item.name
    })),
    total_amount: totalAmount
  };
  
  // Создаем более длинный и уникальный хеш
  const contentString = JSON.stringify(content);
  const hash = Buffer.from(contentString).toString('base64');
  
  // Берем первые 100 символов для лучшей уникальности
  return hash.substring(0, 100);
}

// Пакетное создание записей в БД с поддержкой parent_document_id и cart_session_id
async function createDocumentRecordsSimple(
  type: 'quote' | 'invoice' | 'order',
  clientId: string,
  items: any[],
  totalAmount: number,
  documentNumber: string,
  parentDocumentId?: string | null,
  cartSessionId?: string | null
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
        parent_document_id: parentDocumentId,
        cart_session_id: cartSessionId,
        client_id: clientId,
        created_by: 'system',
        status: 'DRAFT',
        subtotal: totalAmount,
        total_amount: totalAmount,
        currency: 'RUB',
        notes: 'Сгенерировано из конфигуратора дверей',
        cart_data: JSON.stringify(items) // Сохраняем данные корзины
      } as any
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
        notes: name // Убираем артикул из notes
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
        parent_document_id: parentDocumentId,
        cart_session_id: cartSessionId,
        client_id: clientId,
        created_by: 'system',
        status: 'DRAFT',
        subtotal: totalAmount,
        total_amount: totalAmount,
        currency: 'RUB',
        notes: 'Сгенерировано из конфигуратора дверей',
        cart_data: JSON.stringify(items) // Сохраняем данные корзины
      } as any
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
        notes: name // Убираем артикул из notes
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
        parent_document_id: parentDocumentId,
        cart_session_id: cartSessionId,
        client_id: clientId,
        created_by: 'system',
        status: 'PENDING',
        subtotal: totalAmount,
        total_amount: totalAmount,
        currency: 'RUB',
        notes: 'Сгенерировано из конфигуратора дверей',
        cart_data: JSON.stringify(items) // Сохраняем данные корзины
      } as any
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
        notes: name // Убираем артикул из notes
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

// Экспортируем функции для использования в других модулях
export { findExistingDocument, createDocumentRecordsSimple as createDocumentRecord };