const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeSkuComponents() {
  try {
    console.log('🔍 Анализируем компоненты для SKU [Модель] - [Размер] - [Цвет]...');
    
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
      }
    });
    
    console.log(`📦 Найдено ${products.length} товаров для анализа`);
    
    // Собираем уникальные значения
    const models = new Set();
    const sizes = new Set();
    const colors = new Set();
    const combinations = new Map();
    
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
            continue;
          }
        }
        
        // Извлекаем компоненты
        const model = properties['Domeo_Название модели для Web'] || 'UNKNOWN_MODEL';
        const width = properties['Ширина/мм'] || 'UNKNOWN_WIDTH';
        const height = properties['Высота/мм'] || 'UNKNOWN_HEIGHT';
        const color = properties['Domeo_Цвет'] || 'UNKNOWN_COLOR';
        
        const size = `${width}x${height}`;
        
        // Добавляем в множества
        models.add(model);
        sizes.add(size);
        colors.add(color);
        
        // Создаем комбинацию
        const combination = `${model}-${size}-${color}`;
        combinations.set(combination, (combinations.get(combination) || 0) + 1);
        
      } catch (error) {
        console.log(`⚠️ Ошибка обработки товара ${product.id}: ${error.message}`);
      }
    }
    
    console.log('\n📊 Анализ компонентов SKU:');
    
    console.log(`\n🏷️ Уникальные модели (${models.size}):`);
    Array.from(models).sort().forEach((model, index) => {
      console.log(`  ${index + 1}. ${model}`);
    });
    
    console.log(`\n📏 Уникальные размеры (${sizes.size}):`);
    Array.from(sizes).sort().forEach((size, index) => {
      console.log(`  ${index + 1}. ${size}`);
    });
    
    console.log(`\n🎨 Уникальные цвета (${colors.size}):`);
    Array.from(colors).sort().forEach((color, index) => {
      console.log(`  ${index + 1}. ${color}`);
    });
    
    console.log(`\n🔗 Уникальные комбинации [Модель]-[Размер]-[Цвет] (${combinations.size}):`);
    
    // Группируем по количеству дубликатов
    const duplicates = new Map();
    combinations.forEach((count, combination) => {
      if (!duplicates.has(count)) {
        duplicates.set(count, []);
      }
      duplicates.get(count).push(combination);
    });
    
    // Показываем статистику дубликатов
    Array.from(duplicates.keys()).sort((a, b) => b - a).forEach(count => {
      const combos = duplicates.get(count);
      console.log(`\n  📊 Комбинаций с ${count} товарами: ${combos.length}`);
      
      if (count > 1) {
        console.log(`    Примеры дубликатов:`);
        combos.slice(0, 5).forEach(combo => {
          console.log(`      - ${combo}`);
        });
        if (combos.length > 5) {
          console.log(`      ... и еще ${combos.length - 5} комбинаций`);
        }
      }
    });
    
    // Проверяем возможность создания уникальных SKU
    const totalCombinations = combinations.size;
    const totalProducts = products.length;
    const uniqueCombinations = Array.from(combinations.entries()).filter(([combo, count]) => count === 1).length;
    const duplicateCombinations = totalCombinations - uniqueCombinations;
    
    console.log('\n🎯 Оценка возможности создания уникальных SKU:');
    console.log(`📊 Всего товаров: ${totalProducts}`);
    console.log(`📊 Всего комбинаций: ${totalCombinations}`);
    console.log(`📊 Уникальных комбинаций: ${uniqueCombinations}`);
    console.log(`📊 Дублирующихся комбинаций: ${duplicateCombinations}`);
    
    if (duplicateCombinations === 0) {
      console.log('✅ ОТЛИЧНО! Все комбинации уникальны - можно использовать формат [Модель]-[Размер]-[Цвет]');
    } else {
      console.log(`⚠️ ПРОБЛЕМА! ${duplicateCombinations} комбинаций дублируются`);
      console.log('💡 Нужно добавить дополнительный компонент для уникальности');
    }
    
    // Предлагаем решения
    console.log('\n💡 Рекомендации:');
    
    if (duplicateCombinations > 0) {
      console.log('1. Добавить дополнительный компонент:');
      console.log('   - [Модель]-[Размер]-[Цвет]-[Покрытие]');
      console.log('   - [Модель]-[Размер]-[Цвет]-[Стиль]');
      console.log('   - [Модель]-[Размер]-[Цвет]-[Артикул]');
      
      console.log('\n2. Или использовать числовой суффикс:');
      console.log('   - [Модель]-[Размер]-[Цвет]-001');
      console.log('   - [Модель]-[Размер]-[Цвет]-002');
    } else {
      console.log('1. ✅ Формат [Модель]-[Размер]-[Цвет] подходит идеально!');
      console.log('2. Все SKU будут уникальными');
      console.log('3. Легко читаются и понимаются');
    }
    
    // Примеры SKU
    console.log('\n📝 Примеры SKU:');
    const exampleCombinations = Array.from(combinations.keys()).slice(0, 10);
    exampleCombinations.forEach(combo => {
      const sku = combo.replace(/[^a-zA-Z0-9-]/g, '_').toUpperCase();
      console.log(`  ${combo} → ${sku}`);
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSkuComponents();
