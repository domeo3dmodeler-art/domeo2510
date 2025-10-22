import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Получаем заказ у поставщика
    const supplierOrder = await prisma.supplierOrder.findUnique({
      where: { id },
      select: {
        id: true,
        order_id: true,
        supplier_name: true,
        supplier_email: true,
        supplier_phone: true,
        expected_date: true,
        notes: true,
        cart_data: true
      }
    });

    if (!supplierOrder) {
      return NextResponse.json({ error: 'Supplier order not found' }, { status: 404 });
    }

    // Получаем связанный заказ и клиента
    const order = await prisma.order.findUnique({
      where: { id: supplierOrder.order_id },
      select: {
        id: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            address: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Related order not found' }, { status: 404 });
    }

    // Получаем данные корзины
    let cartData = null;
    if (supplierOrder.cart_data) {
      try {
        const parsedData = JSON.parse(supplierOrder.cart_data);
        
        // Проверяем, является ли это массивом товаров или объектом с items
        if (Array.isArray(parsedData)) {
          // Если это массив товаров, оборачиваем в объект с items
          cartData = { items: parsedData };
        } else if (parsedData.items) {
          // Если это уже объект с items, используем как есть
          cartData = parsedData;
        } else {
          // Если это объект без items, оборачиваем в items
          cartData = { items: [parsedData] };
        }
      } catch (error) {
        console.error('Error parsing cart_data:', error);
      }
    }

    if (!cartData || !cartData.items || cartData.items.length === 0) {
      return NextResponse.json({ error: 'No cart data found for this supplier order' }, { status: 400 });
    }

    // Подготавливаем данные для генерации Excel
    const excelData = {
      items: cartData.items.map((item: any) => ({
        sku: item.id || 'N/A',
        name: item.type === 'handle' 
          ? (item.handleName || item.name || 'Ручка')
          : (item.name || `Дверь ${item.model?.replace(/DomeoDoors_/g, 'DomeoDoors ').replace(/_/g, ' ')} (${item.finish}, ${item.color}, ${item.width} × ${item.height} мм, Комплект фурнитуры - ${(item.hardwareKitName || item.hardware || 'Базовый').replace(/^Комплект фурнитуры — /, '')})` || 'Товар'),
        quantity: item.quantity || item.qty || 1,
        unitPrice: item.unitPrice || 0,
        total: (item.quantity || item.qty || 1) * (item.unitPrice || 0),
        // Добавляем поля конфигурации для поиска в БД
        model: item.model,
        finish: item.finish,
        color: item.color,
        width: item.width,
        height: item.height,
        // КРИТИЧНО: передаем тип товара для правильной логики
        type: item.type,
        handleId: item.handleId,
        handleName: item.handleName,
        // Добавляем информацию о комплекте фурнитуры
        hardwareKitName: item.hardwareKitName,
        hardware: item.hardware
      }))
    };

    // Генерируем Excel файл с дополнительной информацией
    const buffer = await generateExcel({
      ...excelData,
      client: order.client,
      supplier: {
        name: supplierOrder.supplier_name,
        email: supplierOrder.supplier_email,
        phone: supplierOrder.supplier_phone
      },
      supplierOrderId: supplierOrder.id,
      orderDate: supplierOrder.created_at || new Date(),
      expectedDate: supplierOrder.expected_date,
      notes: supplierOrder.notes
    });

    // Возвращаем файл с безопасным именем
    const safeFilename = `Supplier_Order_${supplierOrder.id.slice(-6)}.xlsx`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating Excel for supplier order:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    );
  }
}

// Генерация Excel файла с использованием шаблона категории
async function generateExcel(data: any): Promise<Buffer> {
  const startTime = Date.now();
  console.log('🚀 Начинаем генерацию Excel заказа у поставщика с полными свойствами...');

  try {
    // Получаем шаблон для дверей
    const template = await getDoorTemplate();
    console.log('📋 Поля шаблона:', template.exportFields.length);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Заказ у поставщика');
    
    // Заголовок документа (объединяем ячейки A1:Z1)
    worksheet.mergeCells('A1:Z1');
    worksheet.getCell('A1').value = 'ЗАКАЗ У ПОСТАВЩИКА';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Информация о клиенте
    worksheet.getCell('A3').value = 'Клиент:';
    worksheet.getCell('B3').value = `${data.client.lastName} ${data.client.firstName} ${data.client.middleName || ''}`.trim();
    worksheet.getCell('A4').value = 'Телефон:';
    worksheet.getCell('B4').value = data.client.phone || 'N/A';
    worksheet.getCell('A5').value = 'Адрес:';
    worksheet.getCell('B5').value = data.client.address || 'N/A';

    // Информация о поставщике
    worksheet.getCell('A7').value = 'Поставщик:';
    worksheet.getCell('B7').value = data.supplier.name || 'N/A';
    worksheet.getCell('A8').value = 'Email:';
    worksheet.getCell('B8').value = data.supplier.email || 'N/A';
    worksheet.getCell('A9').value = 'Телефон:';
    worksheet.getCell('B9').value = data.supplier.phone || 'N/A';

    // Номер документа и дата
    worksheet.getCell('A11').value = 'Номер документа:';
    worksheet.getCell('B11').value = `SUPPLIER-ORDER-${data.supplierOrderId?.slice(-6) || 'UNKNOWN'}`;
    worksheet.getCell('A12').value = 'Дата:';
    worksheet.getCell('B12').value = new Date().toLocaleDateString('ru-RU');

    // Базовые заголовки + поля из БД в нужном порядке
    const baseHeaders = ['№', 'Наименование', 'Количество', 'Цена', 'Сумма'];
    
    // Определяем нужные поля из БД в правильном порядке (как в оригинале)
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
    
    // Устанавливаем заголовки (строка 10, как в оригинале!)
    worksheet.getRow(10).values = allHeaders;
    worksheet.getRow(10).font = { bold: true };
    
    // Цветовая схема: данные из корзины - голубой, данные из БД - бежевый (как в оригинале!)
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

    // Добавляем границы для заголовков (как в оригинале!)
    // Первая ячейка заголовка - полные границы
    const firstHeaderCell = worksheet.getCell(10, 1);
    firstHeaderCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    
    // Остальные ячейки заголовков - только нижняя граница
    for (let col = 2; col <= allHeaders.length; col++) {
      const headerCell = worksheet.getCell(10, col);
      headerCell.border = {
        bottom: { style: 'thin', color: { argb: 'FF000000' } }
      };
    }

    // Обрабатываем каждый товар из корзины (начинаем со строки 11!)
    let rowIndex = 11;
    let globalRowNumber = 1;
    
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      console.log(`📦 Обрабатываем товар ${i + 1} из корзины:`, item.name);

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
        row.getCell(3).value = item.quantity || item.qty || 1; // Количество
        row.getCell(4).value = item.unitPrice || 0; // Цена
        row.getCell(5).value = (item.quantity || item.qty || 1) * (item.unitPrice || 0); // Сумма
        
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
        for (let col = 1; col <= worksheet.columnCount; col++) {
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
          
          // Границы для всех ячеек (включая данные из шаблона!)
          row.getCell(col).border = {
            bottom: { style: 'thin', color: { argb: 'FF000000' } }
          };
        }
        
        rowIndex++;
      } else {
        // Создаем одну строку корзины с объединенными ячейками для данных из БД (как в оригинале!)
        console.log(`📝 Создаем объединенную строку для товара из корзины с ${matchingProducts.length} вариантами из БД`);
        
        const row = worksheet.getRow(rowIndex);
        
        // Базовые поля (заполняем только один раз)
        row.getCell(1).value = globalRowNumber++; // №
        row.getCell(2).value = item.name; // Наименование из корзины
        row.getCell(3).value = item.quantity || item.qty || 1; // Количество из корзины
        row.getCell(4).value = item.unitPrice || 0; // Цена из корзины
        row.getCell(5).value = (item.quantity || item.qty || 1) * (item.unitPrice || 0); // Сумма
        
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
                
                // Универсальная логика для всех товаров (как в puppeteer-generator.ts)
                if (fieldName === 'Наименование у поставщика') {
                  // Для всех товаров используем правильные поля
                  value = props['Фабрика_наименование'] || props['Наименование двери у поставщика'] || props['Наименование поставщика'] || props['Наименование'] || '';
                  console.log(`🔍 Поле "${fieldName}" заполняем: ${value}`);
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
          
          // Цветовое выделение и выравнивание: строка из БД - светло-серый фон (как в оригинале!)
          for (let col = 1; col <= worksheet.columnCount; col++) {
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
            
            // Границы для всех ячеек (включая данные из шаблона!)
            currentRow.getCell(col).border = {
              bottom: { style: 'thin', color: { argb: 'FF000000' } }
            };
          }
          
          currentRowIndex++;
        }
        
        // Обновляем rowIndex для следующего товара из корзины
        rowIndex = currentRowIndex;
      }
    }

    // Итого
    const totalRow = worksheet.getRow(rowIndex + 1);
    totalRow.getCell(4).value = 'Итого:';
    totalRow.getCell(4).font = { bold: true };
    totalRow.getCell(4).alignment = { horizontal: 'right' };
    totalRow.getCell(5).value = data.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
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

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    
    const endTime = Date.now();
    console.log(`⚡ Excel заказа у поставщика сгенерирован за ${endTime - startTime}ms`);
    
    return buffer;

  } catch (error) {
    console.error('❌ Ошибка генерации Excel заказа у поставщика:', error);
    throw error;
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

// Поиск ВСЕХ товаров в БД по точной конфигурации (как в оригинале)
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
        
        // Проверяем соответствие конфигурации с гибким поиском
        const modelMatch = !item.model || 
          props['Domeo_Название модели для Web'] === item.model ||
          props['Domeo_Название модели для Web']?.includes(item.model) ||
          item.model?.includes(props['Domeo_Название модели для Web']);
        const finishMatch = !item.finish || 
          props['Материал/Покрытие'] === item.finish ||
          props['Тип покрытия'] === item.finish;
        const colorMatch = !item.color || 
          props['Цвет/Отделка'] === item.color ||
          props['Domeo_Цвет'] === item.color;
        // Исправляем сравнение размеров - приводим к строкам для сравнения
        const widthMatch = !item.width || 
          String(props['Ширина/мм']) === String(item.width) ||
          String(props['Размер 1']) === String(item.width);
        const heightMatch = !item.height || 
          String(props['Высота/мм']) === String(item.height) ||
          String(props['Размер 2']) === String(item.height);
        
        if (modelMatch && finishMatch && colorMatch && widthMatch && heightMatch) {
          console.log('✅ Найден подходящий товар:', product.sku);
          console.log('   Совпадения:', { modelMatch, finishMatch, colorMatch, widthMatch, heightMatch });
          matchingProducts.push({
            ...product,
            properties_data: props
          });
        } else {
          // Логируем только первые несколько несовпадений для отладки
          if (matchingProducts.length < 3) {
            console.log('❌ Товар не подходит:', product.sku, {
              modelMatch, finishMatch, colorMatch, widthMatch, heightMatch,
              itemModel: item.model, itemFinish: item.finish, itemColor: item.color,
              itemWidth: item.width, itemHeight: item.height,
              dbModel: props['Domeo_Название модели для Web'],
              dbFinish: props['Материал/Покрытие'],
              dbColor: props['Цвет/Отделка'],
              dbWidth: props['Размер 1'],
              dbHeight: props['Размер 2'],
              // ДОБАВЛЯЕМ ВСЕ ДОСТУПНЫЕ ПОЛЯ ДЛЯ ДИАГНОСТИКИ
              allProps: Object.keys(props).slice(0, 10) // Показываем первые 10 ключей
            });
          }
        }
      } catch (e) {
        console.warn('Ошибка парсинга properties_data:', e);
      }
    }
  }

  console.log(`✅ Найдено ${matchingProducts.length} подходящих товаров`);
  return matchingProducts;
}

// Получение значения поля из properties_data
function getFieldValue(propertiesData: any, fieldName: string): string {
  if (!propertiesData || typeof propertiesData !== 'object') {
    return '';
  }
  
  return propertiesData[fieldName] || '';
}
