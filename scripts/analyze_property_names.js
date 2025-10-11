const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzePropertyNames() {
  try {
    console.log('🔍 Анализируем названия свойств в базе товаров...');
    
    // Получаем все товары из категории "Межкомнатные двери"
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        }
      },
      select: {
        id: true,
        sku: true,
        properties_data: true
      },
      take: 10 // Берем только первые 10 для анализа
    });
    
    console.log(`📦 Анализируем ${products.length} товаров`);
    
    // Собираем все уникальные названия свойств
    const allPropertyNames = new Set();
    const propertyExamples = new Map();
    
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
        
        // Собираем названия свойств
        Object.keys(properties).forEach(propName => {
          allPropertyNames.add(propName);
          
          // Сохраняем примеры значений
          if (!propertyExamples.has(propName)) {
            propertyExamples.set(propName, new Set());
          }
          propertyExamples.get(propName).add(properties[propName]);
        });
        
      } catch (error) {
        console.log(`⚠️ Ошибка обработки товара ${product.id}: ${error.message}`);
      }
    }
    
    console.log('\n📊 Названия свойств в базе товаров:');
    console.log(`Всего уникальных свойств: ${allPropertyNames.size}`);
    
    // Группируем свойства по категориям
    const categories = {
      'Основные': [],
      'Domeo_': [],
      'Общее_': [],
      'Фурнитура_': [],
      'Прочие': []
    };
    
    Array.from(allPropertyNames).sort().forEach(propName => {
      if (propName.startsWith('Domeo_')) {
        categories['Domeo_'].push(propName);
      } else if (propName.startsWith('Общее_')) {
        categories['Общее_'].push(propName);
      } else if (propName.startsWith('Фурнитура_')) {
        categories['Фурнитура_'].push(propName);
      } else if (['SKU', 'Name', 'Price', 'StockQuantity', 'Артикул поставщика', 'Ширина/мм', 'Высота/мм', 'Толщина/мм'].includes(propName)) {
        categories['Основные'].push(propName);
      } else {
        categories['Прочие'].push(propName);
      }
    });
    
    // Выводим свойства по категориям
    Object.entries(categories).forEach(([category, props]) => {
      if (props.length > 0) {
        console.log(`\n🏷️ ${category} (${props.length}):`);
        props.forEach(prop => {
          const examples = Array.from(propertyExamples.get(prop)).slice(0, 3);
          console.log(`  - ${prop}: ${examples.join(', ')}`);
        });
      }
    });
    
    // Теперь посмотрим на шаблон
    console.log('\n🔍 Анализируем шаблон импорта...');
    
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    if (template) {
      console.log('✅ Шаблон найден');
      
      const templateConfig = template.template_config ? JSON.parse(template.template_config) : {};
      const templateHeaders = templateConfig.headers || [];
      
      console.log(`\n📋 Заголовки в шаблоне (${templateHeaders.length}):`);
      templateHeaders.forEach((header, index) => {
        console.log(`  ${index + 1}. ${header}`);
      });
      
      // Сравниваем заголовки шаблона с названиями свойств в БД
      console.log('\n🔍 Сравнение заголовков шаблона с названиями свойств в БД:');
      
      const templateSet = new Set(templateHeaders);
      const dbSet = allPropertyNames;
      
      const inTemplateNotInDB = Array.from(templateSet).filter(header => !dbSet.has(header));
      const inDBNotInTemplate = Array.from(dbSet).filter(prop => !templateSet.has(prop));
      const common = Array.from(templateSet).filter(header => dbSet.has(header));
      
      console.log(`\n✅ Общие свойства (${common.length}):`);
      common.forEach(prop => {
        console.log(`  - ${prop}`);
      });
      
      if (inTemplateNotInDB.length > 0) {
        console.log(`\n⚠️ В шаблоне, но НЕТ в БД (${inTemplateNotInDB.length}):`);
        inTemplateNotInDB.forEach(prop => {
          console.log(`  - ${prop}`);
        });
      }
      
      if (inDBNotInTemplate.length > 0) {
        console.log(`\n⚠️ В БД, но НЕТ в шаблоне (${inDBNotInTemplate.length}):`);
        inDBNotInTemplate.forEach(prop => {
          console.log(`  - ${prop}`);
        });
      }
      
      // Проверяем соответствие
      const matchPercentage = Math.round((common.length / templateHeaders.length) * 100);
      console.log(`\n📊 Соответствие: ${matchPercentage}% (${common.length}/${templateHeaders.length})`);
      
      if (matchPercentage === 100) {
        console.log('✅ ОТЛИЧНО! Все заголовки шаблона соответствуют названиям свойств в БД');
      } else if (matchPercentage >= 80) {
        console.log('⚠️ ХОРОШО! Большинство заголовков соответствуют, но есть расхождения');
      } else {
        console.log('❌ ПЛОХО! Много расхождений между шаблоном и БД');
      }
      
    } else {
      console.log('❌ Шаблон не найден');
    }
    
    // Рекомендации
    console.log('\n💡 Рекомендации:');
    console.log('1. Убедитесь, что заголовки в Excel файле точно соответствуют названиям свойств в БД');
    console.log('2. Если есть расхождения, нужно либо:');
    console.log('   - Обновить шаблон, чтобы он соответствовал БД');
    console.log('   - Или обновить названия свойств в БД');
    console.log('3. Для нового формата SKU нужно добавить поле "Номер варианта" или использовать существующие поля');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePropertyNames();
