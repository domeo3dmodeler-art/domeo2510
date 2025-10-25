// Скрипт миграции для стандартизации названий свойств товаров
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Канонические названия свойств (из door-properties.ts)
const CANONICAL_PROPERTIES = {
  // Идентификация
  '№': '№',
  'АРТИКУЛ_DOMEO': 'АРТИКУЛ_DOMEO',
  
  // Основные параметры
  'МОДЕЛЬ': 'МОДЕЛЬ',
  'СТИЛЬ': 'СТИЛЬ',
  'ЦВЕТ_DOMEO': 'ЦВЕТ_DOMEO',
  'ТИП ПОКРЫТИЯ': 'ТИП ПОКРЫТИЯ',
  
  // Размеры
  'Ширина/мм': 'Ширина/мм',
  'Высота/мм': 'Высота/мм',
  'Толщина/мм': 'Толщина/мм',
  
  // Материалы и конструкция
  'ТИП КОНСТРУКЦИИ': 'ТИП КОНСТРУКЦИИ',
  'Тип открывания': 'Тип открывания',
  'ФАБРИКА_КОЛЛЕКЦИЯ': 'ФАБРИКА_КОЛЛЕКЦИЯ',
  'Фабрика_Цвет/Отделка': 'Фабрика_Цвет/Отделка',
  
  // Ценообразование
  'Цена ррц (включая цену полотна, короба, наличников, доборов)': 'Цена ррц (включая цену полотна, короба, наличников, доборов)',
  'Цена опт': 'Цена опт',
  'Стоимость надбавки за кромку': 'Стоимость надбавки за кромку',
  
  // Дополнительные элементы
  'Кромка': 'Кромка',
  'Молдинг': 'Молдинг',
  'Стекло': 'Стекло',
  
  // Поставщик и склад
  'Поставщик': 'Поставщик',
  'Наименование поставщика': 'Наименование поставщика',
  'Артикул поставщика': 'Артикул поставщика',
  'Склад/заказ': 'Склад/заказ',
  
  // Технические
  'photos': 'photos',
  'Категория': 'Категория',
  'Ед.изм.': 'Ед.изм.'
};

// Маппинг старых названий на канонические
const MIGRATION_MAP = {
  // Старые названия из API
  'Domeo_Название модели для Web': 'МОДЕЛЬ',
  'Domeo_Стиль Web': 'СТИЛЬ',
  'Общее_Тип покрытия': 'ТИП ПОКРЫТИЯ',
  'Domeo_Цвет': 'ЦВЕТ_DOMEO',
  'Тип конструкции': 'ТИП КОНСТРУКЦИИ',
  'Фабрика_Коллекция': 'ФАБРИКА_КОЛЛЕКЦИЯ',
  'Фабрика_Цвет/Отделка': 'Фабрика_Цвет/Отделка',
  
  // Другие возможные варианты
  'Название модели': 'МОДЕЛЬ',
  'Стиль': 'СТИЛЬ',
  'Цвет': 'ЦВЕТ_DOMEO',
  'Покрытие': 'ТИП ПОКРЫТИЯ',
  'Тип конструкции': 'ТИП КОНСТРУКЦИИ',
  'Фабрика': 'ФАБРИКА_КОЛЛЕКЦИЯ',
  'Коллекция': 'ФАБРИКА_КОЛЛЕКЦИЯ',
  'Ширина': 'Ширина/мм',
  'Высота': 'Высота/мм',
  'Толщина': 'Толщина/мм',
  'Цена': 'Цена ррц (включая цену полотна, короба, наличников, доборов)',
  'РРЦ': 'Цена ррц (включая цену полотна, короба, наличников, доборов)',
  'Опт': 'Цена опт',
  'Артикул': 'АРТИКУЛ_DOMEO',
  'Номер': '№'
};

// Функция для определения канонического названия
function getCanonicalName(key) {
  // Если уже каноническое название
  if (CANONICAL_PROPERTIES[key]) {
    return key;
  }
  
  // Проверяем маппинг
  if (MIGRATION_MAP[key]) {
    return MIGRATION_MAP[key];
  }
  
  // Fuzzy match для похожих названий
  for (const canonicalKey of Object.keys(CANONICAL_PROPERTIES)) {
    if (key.toLowerCase().includes(canonicalKey.toLowerCase()) || 
        canonicalKey.toLowerCase().includes(key.toLowerCase())) {
      return canonicalKey;
    }
  }
  
  // Если не найдено, возвращаем оригинальное название
  return key;
}

async function migrateProperties() {
  console.log('🔄 МИГРАЦИЯ НАЗВАНИЙ СВОЙСТВ ТОВАРОВ');
  console.log('=====================================\n');

  try {
    // Получаем все товары из категории дверей
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: "Межкомнатные двери"
        }
      },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    console.log(`📦 Найдено товаров: ${products.length}`);

    if (products.length === 0) {
      console.log('❌ Товары не найдены. Сначала импортируйте данные.');
      return;
    }

    let migratedCount = 0;
    let totalChanges = 0;

    for (const product of products) {
      if (!product.properties_data) continue;

      const props = typeof product.properties_data === 'string' 
        ? JSON.parse(product.properties_data) 
        : product.properties_data;

      const newProps = {};
      let hasChanges = false;

      // Обрабатываем каждое свойство
      for (const [key, value] of Object.entries(props)) {
        const canonicalKey = getCanonicalName(key);
        
        if (canonicalKey !== key) {
          hasChanges = true;
          console.log(`   ${product.sku}: "${key}" → "${canonicalKey}"`);
        }
        
        newProps[canonicalKey] = value;
      }

      // Обновляем товар если есть изменения
      if (hasChanges) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            properties_data: JSON.stringify(newProps)
          }
        });
        
        migratedCount++;
        totalChanges += Object.keys(props).length;
        
        console.log(`✅ Обновлен товар: ${product.sku}`);
      }
    }

    console.log(`\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА!`);
    console.log(`   Обновлено товаров: ${migratedCount}`);
    console.log(`   Всего изменений: ${totalChanges}`);

    // Проверяем результат
    console.log(`\n🔍 ПРОВЕРКА РЕЗУЛЬТАТА:`);
    const sampleProduct = await prisma.product.findFirst({
      where: {
        catalog_category: {
          name: "Межкомнатные двери"
        }
      },
      select: {
        sku: true,
        properties_data: true
      }
    });

    if (sampleProduct) {
      const props = JSON.parse(sampleProduct.properties_data);
      console.log(`   Пример товара: ${sampleProduct.sku}`);
      console.log(`   Ключи свойств:`);
      Object.keys(props).forEach(key => {
        const isCanonical = CANONICAL_PROPERTIES[key] ? '✅' : '❌';
        console.log(`     ${isCanonical} ${key}`);
      });
    }

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем миграцию
migrateProperties();
