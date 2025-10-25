const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzePropertyIssues() {
  try {
    console.log('🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПРОБЛЕМ В СВОЙСТВАХ ТОВАРОВ\n');
    console.log('⚠️  ВНИМАНИЕ: Данные НЕ БУДУТ изменены, только анализ!\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    // Получаем все товары для полного анализа
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    console.log(`📦 Анализируем ВСЕ ${products.length} товаров категории\n`);

    // Собираем все значения для каждого свойства
    const propertyAnalysis = {};
    const allProperties = new Set();

    products.forEach((product, index) => {
      if (!product.properties_data) return;

      let properties;
      try {
        properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
      } catch (e) {
        console.log(`❌ Ошибка парсинга для товара ${product.id}`);
        return;
      }

      // Собираем все свойства
      Object.keys(properties).forEach(propertyName => {
        allProperties.add(propertyName);
        
        if (!propertyAnalysis[propertyName]) {
          propertyAnalysis[propertyName] = {
            values: new Set(),
            valueCounts: {},
            totalProducts: 0,
            emptyCount: 0,
            issues: []
          };
        }

        const value = String(properties[propertyName]);
        propertyAnalysis[propertyName].values.add(value);
        propertyAnalysis[propertyName].valueCounts[value] = (propertyAnalysis[propertyName].valueCounts[value] || 0) + 1;
        propertyAnalysis[propertyName].totalProducts++;

        if (!value || value.trim() === '' || value === 'null' || value === 'undefined') {
          propertyAnalysis[propertyName].emptyCount++;
        }
      });
    });

    // Анализируем каждое свойство
    console.log('📊 АНАЛИЗ КАЖДОГО СВОЙСТВА:');
    console.log('='.repeat(100));

    Array.from(allProperties).sort().forEach((propertyName, index) => {
      const analysis = propertyAnalysis[propertyName];
      const values = Array.from(analysis.values);
      const fillRate = ((analysis.totalProducts - analysis.emptyCount) / analysis.totalProducts * 100).toFixed(1);

      console.log(`\n${index + 1}. СВОЙСТВО: "${propertyName}"`);
      console.log(`   📈 Заполненность: ${analysis.totalProducts - analysis.emptyCount}/${analysis.totalProducts} (${fillRate}%)`);
      console.log(`   🔢 Уникальных значений: ${values.length}`);

      // Анализируем проблемы
      const issues = [];

      // 1. Проблемы с заполненностью
      if (analysis.emptyCount > 0) {
        issues.push(`❌ Пустые значения: ${analysis.emptyCount} товаров`);
      }

      // 2. Проблемы с кодировкой
      const encodingIssues = values.filter(v => v.includes('?') || v.includes(''));
      if (encodingIssues.length > 0) {
        issues.push(`⚠️  Проблемы кодировки: ${encodingIssues.length} значений`);
        encodingIssues.slice(0, 3).forEach(value => {
          console.log(`      Пример: "${value}"`);
        });
      }

      // 3. Проблемы с длиной значений
      const longValues = values.filter(v => v.length > 100);
      if (longValues.length > 0) {
        issues.push(`📏 Слишком длинные значения: ${longValues.length} значений`);
        longValues.slice(0, 2).forEach(value => {
          console.log(`      Пример: "${value.substring(0, 50)}..."`);
        });
      }

      // 4. Проблемы с числовыми значениями
      const numericValues = values.filter(v => !isNaN(Number(v)) && v.trim() !== '');
      if (numericValues.length > 0) {
        const numbers = numericValues.map(v => Number(v));
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        
        // Проверяем на подозрительные числа
        const negativeNumbers = numbers.filter(n => n < 0);
        const veryLargeNumbers = numbers.filter(n => n > 1000000);
        const decimalNumbers = numbers.filter(n => n % 1 !== 0);
        
        if (negativeNumbers.length > 0) {
          issues.push(`🔢 Отрицательные числа: ${negativeNumbers.length} значений`);
        }
        if (veryLargeNumbers.length > 0) {
          issues.push(`🔢 Слишком большие числа: ${veryLargeNumbers.length} значений (max: ${max})`);
        }
        if (decimalNumbers.length > 0 && propertyName.includes('мм')) {
          issues.push(`🔢 Десятичные числа в размерах: ${decimalNumbers.length} значений`);
        }
      }

      // 5. Проблемы с дубликатами
      const duplicateValues = Object.entries(analysis.valueCounts)
        .filter(([value, count]) => count > 1)
        .sort((a, b) => b[1] - a[1]);
      
      if (duplicateValues.length > 0) {
        const topDuplicates = duplicateValues.slice(0, 3);
        issues.push(`🔄 Много дубликатов: ${duplicateValues.length} значений повторяются`);
        topDuplicates.forEach(([value, count]) => {
          console.log(`      "${value}": ${count} раз`);
        });
      }

      // 6. Проблемы с разнообразием
      if (values.length === 1 && analysis.totalProducts > 10) {
        issues.push(`🎯 Слишком мало разнообразия: только 1 значение для ${analysis.totalProducts} товаров`);
      }

      // 7. Проблемы с форматом
      if (propertyName.includes('мм') && numericValues.length < values.length * 0.8) {
        issues.push(`📏 Нечисловые значения в размерах: ${values.length - numericValues.length} значений`);
      }

      // 8. Проблемы с ценами
      if (propertyName.toLowerCase().includes('цена')) {
        const priceValues = values.filter(v => !isNaN(Number(v)) && Number(v) > 0);
        if (priceValues.length < values.length * 0.9) {
          issues.push(`💰 Некорректные цены: ${values.length - priceValues.length} значений`);
        }
      }

      // Выводим все найденные проблемы
      if (issues.length > 0) {
        console.log(`   🚨 НАЙДЕННЫЕ ПРОБЛЕМЫ:`);
        issues.forEach(issue => {
          console.log(`      ${issue}`);
        });
      } else {
        console.log(`   ✅ Проблем не найдено`);
      }

      // Показываем все значения (если их немного)
      if (values.length <= 20) {
        console.log(`   📝 Все значения:`);
        values.sort().forEach(value => {
          const count = analysis.valueCounts[value];
          console.log(`      - "${value}" (${count} раз)`);
        });
      } else {
        console.log(`   📝 Первые 10 значений:`);
        values.sort().slice(0, 10).forEach(value => {
          const count = analysis.valueCounts[value];
          console.log(`      - "${value}" (${count} раз)`);
        });
        console.log(`      ... и еще ${values.length - 10} значений`);
      }
    });

    // Общая статистика проблем
    console.log('\n\n📈 ОБЩАЯ СТАТИСТИКА ПРОБЛЕМ:');
    console.log('='.repeat(100));

    let totalIssues = 0;
    let propertiesWithIssues = 0;

    Object.keys(propertyAnalysis).forEach(propertyName => {
      const analysis = propertyAnalysis[propertyName];
      const values = Array.from(analysis.values);
      
      let hasIssues = false;
      
      // Подсчитываем проблемы
      if (analysis.emptyCount > 0) hasIssues = true;
      if (values.some(v => v.includes('?') || v.includes(''))) hasIssues = true;
      if (values.some(v => v.length > 100)) hasIssues = true;
      if (values.length === 1 && analysis.totalProducts > 10) hasIssues = true;
      
      if (hasIssues) {
        propertiesWithIssues++;
        totalIssues++;
      }
    });

    console.log(`📊 Всего свойств: ${Object.keys(propertyAnalysis).length}`);
    console.log(`⚠️  Свойств с проблемами: ${propertiesWithIssues}`);
    console.log(`🚨 Всего проблем: ${totalIssues}`);

    // Топ проблемных свойств
    console.log('\n🔥 ТОП ПРОБЛЕМНЫХ СВОЙСТВ:');
    const problematicProperties = [];

    Object.keys(propertyAnalysis).forEach(propertyName => {
      const analysis = propertyAnalysis[propertyName];
      const values = Array.from(analysis.values);
      let problemScore = 0;

      // Оценка проблем
      if (analysis.emptyCount > 0) problemScore += analysis.emptyCount;
      if (values.some(v => v.includes('?') || v.includes(''))) problemScore += 10;
      if (values.some(v => v.length > 100)) problemScore += 5;
      if (values.length === 1 && analysis.totalProducts > 10) problemScore += 3;

      if (problemScore > 0) {
        problematicProperties.push({ name: propertyName, score: problemScore });
      }
    });

    problematicProperties.sort((a, b) => b.score - a.score).slice(0, 5).forEach((prop, index) => {
      console.log(`${index + 1}. "${prop.name}" - оценка проблем: ${prop.score}`);
    });

  } catch (error) {
    console.error('❌ Ошибка при анализе:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePropertyIssues();
