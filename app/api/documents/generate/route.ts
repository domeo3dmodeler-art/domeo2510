import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import { findExistingDocument } from '@/lib/export/puppeteer-generator';

const prisma = new PrismaClient();

// Функция для генерации PDF документа
async function generatePDF(data: any): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-pings',
      '--password-store=basic',
      '--use-mock-keychain'
    ],
    timeout: 30000
  });
  
  const page = await browser.newPage();
  
  // HTML шаблон для документа
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12px;
          margin: 20px;
          color: #000;
        }
        .header {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 30px;
        }
        .client-info {
          margin-bottom: 20px;
        }
        .client-info div {
          margin-bottom: 5px;
        }
        .document-info {
          margin-bottom: 30px;
        }
        .document-info div {
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .number { width: 5%; text-align: center; }
        .sku { width: 15%; }
        .name { width: 40%; }
        .price { width: 15%; text-align: right; }
        .qty { width: 10%; text-align: center; }
        .total { width: 15%; text-align: right; }
        .total-sum {
          text-align: right;
          font-weight: bold;
          font-size: 14px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${data.type === 'quote' ? 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ' : 'СЧЕТ'}
      </div>
      
      <div class="client-info">
        <div><strong>Клиент:</strong> ${data.client.firstName} ${data.client.lastName}</div>
        <div><strong>Телефон:</strong> ${data.client.phone}</div>
        <div><strong>Адрес:</strong> ${data.client.address}</div>
      </div>
      
      <div class="document-info">
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
              <td class="price">${item.unitPrice.toLocaleString('ru-RU')} Р</td>
              <td class="qty">${item.quantity}</td>
              <td class="total">${item.total.toLocaleString('ru-RU')} Р</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total-sum">
        Итого: ${data.totalAmount.toLocaleString('ru-RU')} Р
      </div>
    </body>
    </html>
  `;
  
  await page.setContent(html, { 
    waitUntil: 'networkidle0',
    timeout: 30000 
  });
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    timeout: 30000
  });
  
  await browser.close();
  
  return Buffer.from(pdf);
}

// Функция для генерации Excel документа заказа
async function generateExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Заказ');

  // Заголовок документа
  worksheet.mergeCells('A1:Z1');
  worksheet.getCell('A1').value = 'ЗАКАЗ';
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Информация о клиенте
  worksheet.getCell('A3').value = 'Клиент:';
  worksheet.getCell('B3').value = `${data.client.firstName} ${data.client.lastName}`;
  worksheet.getCell('A4').value = 'Телефон:';
  worksheet.getCell('B4').value = data.client.phone;
  worksheet.getCell('A5').value = 'Адрес:';
  worksheet.getCell('B5').value = data.client.address;

  // Номер документа
  worksheet.getCell('A7').value = 'Номер документа:';
  worksheet.getCell('B7').value = data.documentNumber;
  worksheet.getCell('A8').value = 'Дата:';
  worksheet.getCell('B8').value = new Date().toLocaleDateString('ru-RU');

  // Собираем ВСЕ свойства из БД для найденных товаров
  const allProperties = new Set<string>();
  
  // Сначала собираем все свойства из всех товаров
  data.items.forEach((item: any, index: number) => {
    console.log(`🔍 Товар ${index + 1}:`, {
      sku: item.sku,
      name: item.name,
      hasProperties: !!item.properties_data
    });
    
    if (item.properties_data) {
      try {
        const props = typeof item.properties_data === 'string' 
          ? JSON.parse(item.properties_data) 
          : item.properties_data;
        console.log('📊 Свойства товара:', {
          totalCount: Object.keys(props).length,
          properties: Object.keys(props).slice(0, 20) // Первые 20 свойств
        });
        
        // Добавляем ВСЕ свойства, кроме технических
        Object.keys(props).forEach(key => {
          // Исключаем только технические поля
          if (!key.includes('_id') && 
              !key.includes('photo') && 
              !key.includes('url') &&
              !key.includes('path') &&
              !key.includes('image') &&
              key.length > 2) {
            allProperties.add(key);
          }
        });
      } catch (e) {
        console.warn('Failed to parse properties_data:', e);
      }
    } else {
    }
  });
  

  // Базовые заголовки
  const baseHeaders = [
    '№', 'Артикул', 'Наименование', 'Количество', 'Цена', 'Сумма', 'Фурнитура'
  ];
  
  // Добавляем все свойства из БД
  const propertyHeaders = Array.from(allProperties).sort();
  const allHeaders = [...baseHeaders, ...propertyHeaders];
  
  worksheet.getRow(10).values = allHeaders;
  worksheet.getRow(10).font = { bold: true };
  worksheet.getRow(10).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Данные товаров
  let rowIndex = 11;
  data.items.forEach((item: any, index: number) => {
    const row = worksheet.getRow(rowIndex);
    
    // Базовые поля
    row.getCell(1).value = index + 1; // №
    row.getCell(2).value = item.sku || 'N/A'; // Артикул
    row.getCell(3).value = item.name; // Наименование
    row.getCell(4).value = item.quantity; // Количество
    row.getCell(5).value = item.unitPrice; // Цена
    row.getCell(6).value = item.total; // Сумма
    row.getCell(7).value = item.hardwareKitName || 'Базовый комплект'; // Фурнитура
    
    // Форматирование чисел
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(6).numFmt = '#,##0.00';
    
    // Все свойства из БД
    let colIndex = 8; // Начинаем с 8-й колонки (после базовых + фурнитура)
    if (item.properties_data) {
      try {
        const props = typeof item.properties_data === 'string' 
          ? JSON.parse(item.properties_data) 
          : item.properties_data;
        
        propertyHeaders.forEach(propKey => {
          const value = props[propKey];
          // Заполняем ВСЕ ячейки, даже если значение пустое
          if (value !== undefined && value !== null) {
            row.getCell(colIndex).value = String(value);
          } else {
            row.getCell(colIndex).value = ''; // Пустое значение
          }
          colIndex++;
        });
      } catch (e) {
        console.warn('Failed to parse properties_data for item:', e);
        // Заполняем пустыми значениями
        propertyHeaders.forEach(() => {
          row.getCell(colIndex).value = '';
          colIndex++;
        });
      }
    } else {
      // Заполняем пустыми значениями
      propertyHeaders.forEach(() => {
        row.getCell(colIndex).value = '';
        colIndex++;
      });
    }
    
    rowIndex++;
  });

  // Автоподбор ширины колонок
  worksheet.columns.forEach((column, index) => {
    if (index < 7) {
      // Базовые колонки (включая фурнитуру)
      column.width = 15;
    } else {
      // Колонки свойств
      column.width = 20;
    }
  });
  
  // Итого
  const totalRow = worksheet.getRow(rowIndex + 1);
  totalRow.getCell(5).value = 'Итого:';
  totalRow.getCell(5).font = { bold: true };
  totalRow.getCell(6).value = data.totalAmount;
  totalRow.getCell(6).numFmt = '#,##0.00';
  totalRow.getCell(6).font = { bold: true };

  // Границы для таблицы
  const lastCol = String.fromCharCode(65 + allHeaders.length - 1); // Последняя колонка
  const range = `A10:${lastCol}${rowIndex}`;
  worksheet.getCell(range).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

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

// Функция для формирования наименования товара
function buildProductName(item: any): string {
  if (item.handleId) {
    // Для ручек - простое название из description
    return item.description || 'Ручка';
  }
  
  // Для дверей - полное описание по формату: Дверь Model (finish, color, width × height мм, Фурнитура - kit)
  const parts = [
    'Дверь',
    item.model || 'Unknown',
    `(${item.finish || 'Unknown'}, ${item.color || 'Unknown'}, ${item.width || 0} × ${item.height || 0} мм`
  ];
  
  // Добавляем информацию о фурнитуре если есть
  if (item.hardwareKitId) {
    parts[parts.length - 1] += `, Фурнитура - ${item.hardwareKitName || 'Базовый комплект'}`;
  }
  
  parts[parts.length - 1] += ')';
  
  return parts.join(' ');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, clientId, items, totalAmount } = body;
    
    console.log('📄 Генерация документа:', {
      type, 
      clientId, 
      itemsCount: items.length, 
      totalAmount,
      sampleItem: items[0] ? {
        model: items[0].model,
        finish: items[0].finish,
        color: items[0].color,
        style: items[0].style
      } : null
    });

    // Получаем данные клиента
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 });
    }

    // Генерируем cart_session_id для группировки документов
    const cartHash = Buffer.from(JSON.stringify({
      clientId,
      items: items.map(item => ({
        id: item.id,
        type: item.type,
        model: item.model,
        qty: item.qty,
        unitPrice: item.unitPrice
      })),
      totalAmount
    })).toString('base64').substring(0, 20);
    
    const cartSessionId = `cart_${cartHash}`;
    
    
    // Проверяем существующий документ (дедупликация)
    const existingDocument = await findExistingDocument(type, null, cartSessionId, clientId, items, totalAmount);
    
    let documentNumber: string;
    let documentId: string | null = null;
    
    if (existingDocument) {
      documentNumber = existingDocument.number;
      documentId = existingDocument.id;
    } else {
      documentNumber = `${type.toUpperCase()}-${Date.now()}`;
    }

    if (type === 'quote') {
      let quote;
      
      if (existingDocument) {
        // Используем существующий КП
        quote = existingDocument;
      } else {
        // Создаем новый КП
        quote = await prisma.quote.create({
          data: {
            number: documentNumber,
            cart_session_id: cartSessionId,
            client_id: clientId,
            created_by: 'system', // TODO: Получить из токена
            status: 'DRAFT',
            subtotal: totalAmount,
            total_amount: totalAmount,
            currency: 'RUB',
            notes: 'Сгенерировано из конфигуратора дверей',
            cart_data: JSON.stringify(items)
          }
        });

        // Создаем позиции КП только для нового документа
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const productName = buildProductName(item);
          
          await prisma.quoteItem.create({
            data: {
              quote_id: quote.id,
              product_id: item.id || `temp_${i}`,
              quantity: item.qty || item.quantity || 1,
              unit_price: item.unitPrice || 0,
              total_price: (item.qty || item.quantity || 1) * (item.unitPrice || 0),
              notes: `${productName} | Артикул: ${item.sku_1c || 'N/A'}`
            }
          });
        }
      }

      // Генерируем PDF для КП
      const pdfBuffer = await generatePDF({
        type: 'quote',
        documentNumber,
        client,
        items: await Promise.all(items.map(async (item, i) => {
          // Ищем товар в БД для получения SKU поставщика
          let supplierSku = 'N/A';
          
          if (item.type === 'door') {
            // Для дверей ищем по конфигурации
            const product = await prisma.product.findFirst({
              where: {
                catalog_category: {
                  name: 'Межкомнатные двери'
                },
                name: item.model
              },
              select: {
                properties_data: true
              }
            });
            
            if (product) {
              supplierSku = extractSupplierSku(product.properties_data);
            }
          } else if (item.type === 'handle') {
            // Для ручек ищем по ID
            const product = await prisma.product.findFirst({
              where: {
                catalog_category: {
                  name: 'Ручки'
                },
                id: item.handleId
              },
              select: {
                properties_data: true
              }
            });
            
            if (product) {
              supplierSku = extractSupplierSku(product.properties_data);
            }
          }
          
          return {
            rowNumber: i + 1,
            sku: supplierSku,
            name: buildProductName(item),
            unitPrice: item.unitPrice || 0,
            quantity: item.qty || item.quantity || 1,
            total: (item.qty || item.quantity || 1) * (item.unitPrice || 0)
          };
        })),
        totalAmount
      });

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="KP-${documentNumber}.pdf"`
        }
      });

    } else if (type === 'invoice') {
      let invoice;
      
      if (existingDocument) {
        // Используем существующий счет
        invoice = existingDocument;
      } else {
        // Создаем новый счет
        invoice = await prisma.invoice.create({
          data: {
            number: documentNumber,
            cart_session_id: cartSessionId,
            client_id: clientId,
            created_by: 'system', // TODO: Получить из токена
            status: 'DRAFT',
            subtotal: totalAmount,
            total_amount: totalAmount,
            currency: 'RUB',
            notes: 'Сгенерировано из конфигуратора дверей',
            cart_data: JSON.stringify(items)
          }
        });

        // Создаем позиции счета только для нового документа
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const productName = buildProductName(item);
          
          await prisma.invoiceItem.create({
            data: {
              invoice_id: invoice.id,
              product_id: item.id || `temp_${i}`,
              quantity: item.qty || item.quantity || 1,
              unit_price: item.unitPrice || 0,
              total_price: (item.qty || item.quantity || 1) * (item.unitPrice || 0),
              notes: `${productName} | Артикул: ${item.sku_1c || 'N/A'}`
            }
          });
        }
      }

      // Генерируем PDF для Счета
      const pdfBuffer = await generatePDF({
        type: 'invoice',
        documentNumber,
        client,
        items: await Promise.all(items.map(async (item, i) => {
          // Ищем товар в БД для получения SKU поставщика
          let supplierSku = 'N/A';
          
          if (item.type === 'door') {
            // Для дверей ищем по конфигурации
            const product = await prisma.product.findFirst({
              where: {
                catalog_category: {
                  name: 'Межкомнатные двери'
                },
                name: item.model
              },
              select: {
                properties_data: true
              }
            });
            
            if (product) {
              supplierSku = extractSupplierSku(product.properties_data);
            }
          } else if (item.type === 'handle') {
            // Для ручек ищем по ID
            const product = await prisma.product.findFirst({
              where: {
                catalog_category: {
                  name: 'Ручки'
                },
                id: item.handleId
              },
              select: {
                properties_data: true
              }
            });
            
            if (product) {
              supplierSku = extractSupplierSku(product.properties_data);
            }
          }
          
          return {
            rowNumber: i + 1,
            sku: supplierSku,
            name: buildProductName(item),
            unitPrice: item.unitPrice || 0,
            quantity: item.qty || item.quantity || 1,
            total: (item.qty || item.quantity || 1) * (item.unitPrice || 0)
          };
        })),
        totalAmount
      });

      return new NextResponse(pdfBuffer, {
      headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Invoice-${documentNumber}.pdf"`
        }
      });

    } else if (type === 'order') {
      let order;
      
      if (existingDocument) {
        // Используем существующий заказ
        order = existingDocument;
      } else {
        // Создаем новый заказ
        order = await prisma.order.create({
          data: {
            number: documentNumber,
            cart_session_id: cartSessionId,
            client_id: clientId,
            created_by: 'system', // TODO: Получить из токена
            status: 'PENDING',
            subtotal: totalAmount,
            total_amount: totalAmount,
            currency: 'RUB',
            notes: 'Сгенерировано из конфигуратора дверей',
            cart_data: JSON.stringify(items)
          }
        });

        // Создаем позиции заказа только для нового документа
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const productName = buildProductName(item);
          
          await prisma.orderItem.create({
            data: {
              order_id: order.id,
              product_id: item.id || `temp_${i}`,
              quantity: item.qty || item.quantity || 1,
              unit_price: item.unitPrice || 0,
              total_price: (item.qty || item.quantity || 1) * (item.unitPrice || 0),
              notes: `${productName} | Артикул: ${item.sku_1c || 'N/A'}`
            }
          });
        }
      }

      // Получаем полные данные товаров из БД по точной конфигурации
      const enrichedItems = await Promise.all(items.map(async (item, i) => {
        // Ищем товар в БД по точной конфигурации (стиль, модель, покрытие, цвет, размеры)
        let productData = null;
        
        if (item.sku_1c) {
          // Сначала пробуем найти по SKU
          productData = await prisma.product.findFirst({
            where: {
              sku: item.sku_1c
            },
            select: {
              properties_data: true,
              name: true,
              sku: true
            }
          });
        }
        
        // Если не нашли по SKU, ищем по точной конфигурации
        if (!productData) {
          console.log('🔍 Поиск по конфигурации:', {
            style: item.style,
            model: item.model,
            finish: item.finish,
            color: item.color,
            width: item.width,
            height: item.height
          });
          
          // Получаем все товары и фильтруем по конфигурации
          const allProducts = await prisma.product.findMany({
            where: {
              catalog_category: {
                name: "Межкомнатные двери"
              }
            },
            select: {
              properties_data: true,
              name: true,
              sku: true
            }
          });
          
          
          // Ищем товар с точной конфигурацией
          for (const product of allProducts) {
            if (product.properties_data) {
              try {
                const props = typeof product.properties_data === 'string' 
                  ? JSON.parse(product.properties_data) 
                  : product.properties_data;
                
                // Проверяем соответствие конфигурации
                const styleMatch = !item.style || props['Domeo_Стиль Web'] === item.style;
                const modelMatch = !item.model || props['Domeo_Название модели для Web'] === item.model;
                const finishMatch = !item.finish || props['Тип покрытия'] === item.finish;
                const colorMatch = !item.color || props['Общее_Цвет'] === item.color;
                const widthMatch = !item.width || props['Общее_Ширина'] === item.width;
                const heightMatch = !item.height || props['Общее_Высота'] === item.height;
                
                // Логируем первые несколько товаров для отладки
                if (allProducts.indexOf(product) < 3) {
                  console.log('🔍 Товар из БД:', {
                    style: props['Domeo_Стиль Web'],
                    model: props['Domeo_Название модели для Web'],
                    finish: props['Тип покрытия'],
                    color: props['Общее_Цвет'],
                    width: props['Общее_Ширина'],
                    height: props['Общее_Высота'],
                    matches: { styleMatch, modelMatch, finishMatch, colorMatch, widthMatch, heightMatch }
                  });
                }
                
                if (styleMatch && modelMatch && finishMatch && colorMatch && widthMatch && heightMatch) {
                  productData = product;
                  console.log('✅ Найден товар по конфигурации:', {
                    sku: product.sku,
                    name: product.name,
                    propertiesCount: Object.keys(props).length,
                    sampleProperties: Object.keys(props).slice(0, 10)
                  });
                  break;
                }
              } catch (e) {
                console.warn('Failed to parse properties_data:', e);
              }
            }
          }
          
          if (!productData) {
            
            // Fallback: ищем товар с частичным совпадением
            for (const product of allProducts) {
              if (product.properties_data) {
                try {
                  const props = typeof product.properties_data === 'string' 
                    ? JSON.parse(product.properties_data) 
                    : product.properties_data;
                  
                  // Ищем по стилю и модели
                  const styleMatch = !item.style || props['Domeo_Стиль Web'] === item.style;
                  const modelMatch = !item.model || props['Domeo_Название модели для Web'] === item.model;
                  
                  if (styleMatch && modelMatch) {
                    productData = product;
                    console.log('✅ Найден товар по стилю и модели:', {
                      sku: product.sku,
                      name: product.name,
                      style: props['Domeo_Стиль Web'],
                      model: props['Domeo_Название модели для Web'],
                      propertiesCount: Object.keys(props).length
                    });
                    break;
                  }
                } catch (e) {
                  console.warn('Failed to parse properties_data:', e);
                }
              }
            }
            
            if (!productData) {
              // Последний fallback: берем первый товар
              if (allProducts.length > 0) {
                productData = allProducts[0];
                console.log('⚠️ Fallback: используем первый товар:', {
                  sku: productData.sku,
                  name: productData.name
                });
              }
            }
          }
        }
        
        return {
          rowNumber: i + 1,
          sku: item.sku_1c || 'N/A',
          name: buildProductName(item),
          finish: item.finish,
          color: item.color,
          width: item.width,
          height: item.height,
          quantity: item.qty || item.quantity || 1,
          hardwareKitName: item.hardwareKitName,
          unitPrice: item.unitPrice || 0,
          total: (item.qty || item.quantity || 1) * (item.unitPrice || 0),
          properties_data: productData?.properties_data || null,
          // Добавляем конфигурацию для фильтрации свойств
          configuration: {
            style: item.style,
            model: item.model,
            finish: item.finish,
            color: item.color,
            width: item.width,
            height: item.height
          }
        };
      }));

      // Генерируем Excel для Заказа
      const excelBuffer = await generateExcel({
        type: 'order',
        documentNumber,
        client,
        items: enrichedItems,
        totalAmount
      });

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Order-${documentNumber}.xlsx"`
        }
      });
    }

    return NextResponse.json({ error: 'Неизвестный тип документа' }, { status: 400 });

  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json({ error: 'Ошибка при создании документа' }, { status: 500 });
  }
}