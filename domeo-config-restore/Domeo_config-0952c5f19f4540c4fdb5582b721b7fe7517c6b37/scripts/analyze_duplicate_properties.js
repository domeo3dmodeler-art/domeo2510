const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeDuplicateProperties() {
  try {
    console.log('🔍 Анализируем дублирующиеся свойства в каталоге товаров...\n');

    // Получаем все товары категории "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    console.log(`📂 Найдена категория: ${category.name} (ID: ${category.id})\n`);

    // Получаем первые 10 товаров для анализа
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      take: 10,
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    console.log(`📦 Найдено товаров: ${products.length}\n`);

    // Анализируем свойства каждого товара
    const allProperties = new Set();
    const propertyCounts = {};

    products.forEach((product, index) => {
      console.log(`\n🔍 Товар ${index + 1}: ${product.name || product.sku}`);
      
      if (product.properties_data) {
        let properties;
        try {
          properties = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;
        } catch (e) {
          console.log('  ❌ Ошибка парсинга properties_data');
          return;
        }

        console.log('  📋 Свойства:');
        Object.keys(properties).forEach(key => {
          allProperties.add(key);
          propertyCounts[key] = (propertyCounts[key] || 0) + 1;
          console.log(`    - ${key}: ${properties[key]}`);
        });
      } else {
        console.log('  ⚠️ Нет данных о свойствах');
      }
    });

    console.log('\n📊 СТАТИСТИКА СВОЙСТВ:');
    console.log('='.repeat(50));
    
    const sortedProperties = Array.from(allProperties).sort();
    sortedProperties.forEach(prop => {
      const count = propertyCounts[prop];
      const percentage = ((count / products.length) * 100).toFixed(1);
      console.log(`${prop}: ${count}/${products.length} (${percentage}%)`);
    });

    console.log('\n🔍 ПОИСК ДУБЛИКАТОВ:');
    console.log('='.repeat(50));

    // Ищем потенциальные дубликаты по схожим названиям
    const potentialDuplicates = [];
    const processedProps = new Set();

    sortedProperties.forEach(prop1 => {
      if (processedProps.has(prop1)) return;
      
      const duplicates = [prop1];
      
      sortedProperties.forEach(prop2 => {
        if (prop1 !== prop2 && !processedProps.has(prop2)) {
          // Проверяем различные варианты дубликатов
          const similarity = calculateSimilarity(prop1, prop2);
          if (similarity > 0.7) {
            duplicates.push(prop2);
            processedProps.add(prop2);
          }
        }
      });

      if (duplicates.length > 1) {
        potentialDuplicates.push(duplicates);
        processedProps.add(prop1);
      }
    });

    if (potentialDuplicates.length > 0) {
      console.log('🎯 Найдены потенциальные дубликаты:');
      potentialDuplicates.forEach((group, index) => {
        console.log(`\nГруппа ${index + 1}:`);
        group.forEach(prop => {
          const count = propertyCounts[prop];
          console.log(`  - ${prop} (${count} товаров)`);
        });
      });
    } else {
      console.log('✅ Дубликаты не найдены');
    }

  } catch (error) {
    console.error('❌ Ошибка при анализе:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function calculateSimilarity(str1, str2) {
  // Простая функция для расчета схожести строк
  const s1 = str1.toLowerCase().replace(/[_\s-]/g, '');
  const s2 = str2.toLowerCase().replace(/[_\s-]/g, '');
  
  if (s1 === s2) return 1;
  
  // Проверяем, содержит ли одна строка другую
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Проверяем общие слова
  const words1 = s1.split(/[_\s-]/);
  const words2 = s2.split(/[_\s-]/);
  const commonWords = words1.filter(word => words2.includes(word));
  
  if (commonWords.length > 0) {
    return commonWords.length / Math.max(words1.length, words2.length);
  }
  
  return 0;
}

analyzeDuplicateProperties();
