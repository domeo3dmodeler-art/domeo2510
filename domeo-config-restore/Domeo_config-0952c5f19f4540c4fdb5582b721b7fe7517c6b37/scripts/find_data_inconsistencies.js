const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findDataInconsistencies() {
  try {
    console.log('🔍 Поиск несоответствий в данных товаров...\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    // Получаем больше товаров для анализа
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      },
      take: 500 // Анализируем 500 товаров
    });

    console.log(`📦 Анализируем ${products.length} товаров\n`);

    // Собираем все уникальные значения для каждого поля
    const fieldValues = {};
    const productSamples = [];

    products.forEach((product, index) => {
      if (!product.properties_data) return;

      let properties;
      try {
        properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
      } catch (e) {
        return;
      }

      // Сохраняем примеры товаров
      if (index < 5) {
        productSamples.push({
          id: product.id,
          sku: product.sku,
          name: product.name,
          properties: properties
        });
      }

      // Собираем значения полей
      Object.keys(properties).forEach(field => {
        if (!fieldValues[field]) {
          fieldValues[field] = new Set();
        }
        fieldValues[field].add(String(properties[field]));
      });
    });

    console.log('📋 ПРИМЕРЫ ТОВАРОВ:');
    console.log('='.repeat(80));
    
    productSamples.forEach((product, index) => {
      console.log(`\n${index + 1}. Товар ID: ${product.id}`);
      console.log(`   SKU: ${product.sku || 'НЕТ'}`);
      console.log(`   Название: ${product.name || 'НЕТ'}`);
      console.log(`   Свойства:`);
      Object.keys(product.properties).forEach(field => {
        console.log(`     ${field}: "${product.properties[field]}"`);
      });
    });

    console.log('\n\n🔍 АНАЛИЗ НЕСООТВЕТСТВИЙ:');
    console.log('='.repeat(80));

    // Анализируем каждое поле
    Object.keys(fieldValues).forEach(field => {
      const values = Array.from(fieldValues[field]);
      console.log(`\n📊 ${field}:`);
      console.log(`   Всего уникальных значений: ${values.length}`);
      
      if (values.length <= 10) {
        console.log(`   Значения:`);
        values.forEach(value => {
          console.log(`     - "${value}"`);
        });
      } else {
        console.log(`   Первые 10 значений:`);
        values.slice(0, 10).forEach(value => {
          console.log(`     - "${value}"`);
        });
        console.log(`   ... и еще ${values.length - 10} значений`);
      }

      // Проверяем на подозрительные значения
      const suspiciousValues = values.filter(value => {
        return value.includes('?') || 
               value.includes('�') || 
               value.length > 200 ||
               value.trim() === '' ||
               value === 'null' ||
               value === 'undefined';
      });

      if (suspiciousValues.length > 0) {
        console.log(`   ⚠️  Подозрительные значения (${suspiciousValues.length}):`);
        suspiciousValues.forEach(value => {
          console.log(`     - "${value}"`);
        });
      }

      // Проверяем на числовые значения
      const numericValues = values.filter(value => !isNaN(Number(value)) && value.trim() !== '');
      if (numericValues.length > 0) {
        const numbers = numericValues.map(v => Number(v));
        console.log(`   🔢 Числовые значения: ${numericValues.length}`);
        console.log(`     Диапазон: ${Math.min(...numbers)} - ${Math.max(...numbers)}`);
        
        // Проверяем на странные числа
        const strangeNumbers = numbers.filter(n => n < 0 || n > 1000000);
        if (strangeNumbers.length > 0) {
          console.log(`     ⚠️  Подозрительные числа: ${strangeNumbers.join(', ')}`);
        }
      }
    });

    // Поиск дубликатов по комбинациям полей
    console.log('\n\n🔄 АНАЛИЗ ДУБЛИКАТОВ:');
    console.log('='.repeat(80));

    const duplicates = {};
    products.forEach(product => {
      if (!product.properties_data) return;

      let properties;
      try {
        properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
      } catch (e) {
        return;
      }

      // Создаем ключ из основных полей
      const key = [
        properties['Артикул поставщика'],
        properties['Ширина/мм'],
        properties['Высота/мм'],
        properties['Domeo_Цвет']
      ].join('|');

      if (!duplicates[key]) {
        duplicates[key] = [];
      }
      duplicates[key].push({
        id: product.id,
        sku: product.sku,
        name: product.name
      });
    });

    const duplicateGroups = Object.entries(duplicates).filter(([key, products]) => products.length > 1);
    
    if (duplicateGroups.length > 0) {
      console.log(`Найдено ${duplicateGroups.length} групп дубликатов:`);
      duplicateGroups.slice(0, 5).forEach(([key, products]) => {
        console.log(`\nГруппа: ${key}`);
        products.forEach(product => {
          console.log(`  - ID: ${product.id}, SKU: ${product.sku}, Название: ${product.name}`);
        });
      });
    } else {
      console.log('✅ Дубликатов не найдено');
    }

    // Анализ отсутствующих полей
    console.log('\n\n❌ АНАЛИЗ ОТСУТСТВУЮЩИХ ПОЛЕЙ:');
    console.log('='.repeat(80));

    const allFields = new Set();
    products.forEach(product => {
      if (!product.properties_data) return;
      
      let properties;
      try {
        properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
      } catch (e) {
        return;
      }

      Object.keys(properties).forEach(field => {
        allFields.add(field);
      });
    });

    const expectedFields = [
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
      'Поставщик'
    ];

    console.log('Ожидаемые поля:');
    expectedFields.forEach(field => {
      const exists = allFields.has(field);
      console.log(`  ${exists ? '✅' : '❌'} ${field}`);
    });

    console.log('\nДополнительные поля в данных:');
    Array.from(allFields).filter(field => !expectedFields.includes(field)).forEach(field => {
      console.log(`  ➕ ${field}`);
    });

  } catch (error) {
    console.error('❌ Ошибка при анализе:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findDataInconsistencies();
