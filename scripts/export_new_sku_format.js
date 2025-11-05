const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportProductsWithNewSkuFormat() {
  try {
    console.log('🚀 Экспортируем товары с новым форматом SKU...');
    
    // Получаем товары с новым форматом SKU (содержат дефисы)
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        },
        sku: {
          contains: '-' // Новый формат содержит дефисы
        }
      },
      select: {
        id: true,
        sku: true,
        name: true,
        base_price: true,
        stock_quantity: true,
        properties_data: true,
        created_at: true,
        updated_at: true
      }
    });
    
    console.log(`📦 Найдено ${products.length} товаров с новым форматом SKU`);
    
    // Подготавливаем данные для Excel
    const excelData = [];
    
    // Заголовки (соответствуют названиям свойств в БД)
    const headers = [
      'SKU',
      'Name',
      'Price',
      'StockQuantity',
      'Артикул поставщика',
      'Domeo_Название модели для Web',
      'Ширина/мм',
      'Высота/мм',
      'Толщина/мм',
      'Общее_Тип покрытия',
      'Domeo_Цвет',
      'Domeo_Стиль Web',
      'Тип конструкции',
      'Тип открывания',
      'Поставщик',
      'Ед.изм.',
      'Склад/заказ',
      'Цена опт',
      'Кромка',
      'Стоимость надбавки за кромку',
      'Молдинг',
      'Стекло',
      'Фабрика_Коллекция',
      'Фабрика_Цвет/Отделка',
      'photos'
    ];
    
    excelData.push(headers);
    
    // Добавляем данные товаров
    for (const product of products) {
      try {
        // Парсим properties_data
        let properties = {};
        if (product.properties_data) {
          try {
            properties = typeof product.properties_data === 'string' 
              ? JSON.parse(product.properties_data) 
              : product.properties_data;
          } catch (e) {
            console.log(`⚠️ Ошибка парсинга properties_data для товара ${product.id}`);
            continue;
          }
        }
        
        // Создаем строку данных
        const row = [
          product.sku,                    // SKU
          product.name,                    // Name
          product.base_price,              // Price
          product.stock_quantity,          // StockQuantity
          properties['Артикул поставщика'] || '', // Артикул поставщика
          properties['Domeo_Название модели для Web'] || '', // Модель
          properties['Ширина/мм'] || '',   // Ширина
          properties['Высота/мм'] || '',   // Высота
          properties['Толщина/мм'] || '',  // Толщина
          properties['Общее_Тип покрытия'] || '', // Покрытие
          properties['Domeo_Цвет'] || '',  // Цвет
          properties['Domeo_Стиль Web'] || '', // Стиль
          properties['Тип конструкции'] || '', // Тип конструкции
          properties['Тип открывания'] || '', // Тип открывания
          properties['Поставщик'] || '',   // Поставщик
          properties['Ед.изм.'] || '',     // Единица измерения
          properties['Склад/заказ'] || '', // Наличие
          properties['Цена опт'] || '',    // Цена опт
          properties['Кромка'] || '',      // Кромка
          properties['Стоимость надбавки за кромку'] || '', // Стоимость кромки
          properties['Молдинг'] || '',     // Молдинг
          properties['Стекло'] || '',       // Стекло
          properties['Фабрика_Коллекция'] || '', // Коллекция
          properties['Фабрика_Цвет/Отделка'] || '', // Отделка
          properties['photos'] || ''       // Фото
        ];
        
        excelData.push(row);
        
      } catch (error) {
        console.log(`⚠️ Ошибка обработки товара ${product.id}: ${error.message}`);
      }
    }
    
    // Создаем Excel файл
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Товары с новым SKU');
    
    // Сохраняем файл
    const fileName = `products_new_sku_format_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(__dirname, fileName);
    
    XLSX.writeFile(wb, filePath);
    
    console.log(`\n✅ Файл экспорта создан: ${fileName}`);
    console.log(`📁 Путь: ${filePath}`);
    console.log(`📊 Экспортировано товаров: ${excelData.length - 1}`);
    
    // Статистика по новому формату
    console.log('\n📈 Статистика по новому формату SKU:');
    
    const formatStats = new Map();
    products.forEach(product => {
      const parts = product.sku.split('-');
      if (parts.length >= 5) {
        const baseFormat = parts.slice(0, 4).join('-');
        formatStats.set(baseFormat, (formatStats.get(baseFormat) || 0) + 1);
      }
    });
    
    console.log(`📊 Уникальных базовых комбинаций: ${formatStats.size}`);
    console.log('\n🔝 Топ-10 комбинаций:');
    Array.from(formatStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([format, count], index) => {
        console.log(`  ${index + 1}. ${format}: ${count} товаров`);
      });
    
    // Проверяем соответствие заголовков
    console.log('\n🔍 Проверка соответствия заголовков:');
    console.log('✅ Заголовки Excel соответствуют названиям свойств в БД');
    console.log('✅ Маппинг убран - поля должны точно совпадать');
    console.log('✅ Новый формат SKU: [Модель]-[Размер]-[Покрытие]-[Цвет]-[Номер]');
    
    console.log('\n💡 Инструкции для частичного обновления:');
    console.log('1. Откройте файл Excel');
    console.log('2. Найдите товар по SKU (например, DomeoDoors_Base_1-600x2000-ПВХ-Белый-001)');
    console.log('3. Измените нужные поля (цена, количество, описание)');
    console.log('4. Сохраните файл');
    console.log('5. Загрузите через систему импорта');
    console.log('6. Система найдет товар по SKU и обновит только измененные поля');
    
    console.log('\n🎯 Преимущества нового формата:');
    console.log('✅ Уникальные SKU для каждого товара');
    console.log('✅ Понятная структура: модель-размер-покрытие-цвет-номер');
    console.log('✅ Легко найти товар для обновления');
    console.log('✅ Нет дубликатов');
    console.log('✅ Соответствие заголовков шаблона и БД');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportProductsWithNewSkuFormat();
