const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNonStandardSizes() {
  try {
    console.log('🔍 ПРОВЕРКА НЕСТАНДАРТНЫХ РАЗМЕРОВ\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    // Получаем все товары категории
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    console.log(`📦 Анализируем ${products.length} товаров\n`);

    // Собираем все размеры
    const widths = new Set();
    const heights = new Set();
    const thicknesses = new Set();
    const nonStandardProducts = [];

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

      const width = properties['Ширина/мм'];
      const height = properties['Высота/мм'];
      const thickness = properties['Толщина/мм'];

      if (width) {
        const widthNum = parseInt(width);
        if (!isNaN(widthNum)) {
          widths.add(widthNum);
          
          // Проверяем на нестандартные значения
          if (widthNum < 600 || widthNum > 900 || widthNum % 50 !== 0) {
            nonStandardProducts.push({
              sku: product.sku,
              field: 'Ширина/мм',
              value: width,
              issue: widthNum < 600 ? 'Слишком узкая' : 
                     widthNum > 900 ? 'Слишком широкая' : 
                     'Не кратно 50мм'
            });
          }
        }
      }

      if (height) {
        const heightNum = parseInt(height);
        if (!isNaN(heightNum)) {
          heights.add(heightNum);
          
          // Проверяем на нестандартные значения
          if (heightNum < 2000 || heightNum > 2300 || heightNum % 100 !== 0) {
            nonStandardProducts.push({
              sku: product.sku,
              field: 'Высота/мм',
              value: height,
              issue: heightNum < 2000 ? 'Слишком низкая' : 
                     heightNum > 2300 ? 'Слишком высокая' : 
                     'Не кратно 100мм'
            });
          }
        }
      }

      if (thickness) {
        const thicknessNum = parseInt(thickness);
        if (!isNaN(thicknessNum)) {
          thicknesses.add(thicknessNum);
          
          // Проверяем на нестандартные значения
          if (thicknessNum < 36 || thicknessNum > 58 || ![36, 38, 39, 40, 42, 58].includes(thicknessNum)) {
            nonStandardProducts.push({
              sku: product.sku,
              field: 'Толщина/мм',
              value: thickness,
              issue: 'Нестандартная толщина'
            });
          }
        }
      }
    });

    // Анализируем результаты
    console.log('📊 АНАЛИЗ РАЗМЕРОВ:');
    console.log('='.repeat(60));

    console.log(`\n🔍 ШИРИНА/ММ:`);
    const sortedWidths = Array.from(widths).sort((a, b) => a - b);
    console.log(`   Всего уникальных значений: ${sortedWidths.length}`);
    console.log(`   Значения: ${sortedWidths.join(', ')}`);
    
    const standardWidths = [600, 700, 800, 900];
    const nonStandardWidths = sortedWidths.filter(w => !standardWidths.includes(w));
    if (nonStandardWidths.length > 0) {
      console.log(`   ⚠️  Нестандартные значения: ${nonStandardWidths.join(', ')}`);
    } else {
      console.log(`   ✅ Все значения стандартные`);
    }

    console.log(`\n🔍 ВЫСОТА/ММ:`);
    const sortedHeights = Array.from(heights).sort((a, b) => a - b);
    console.log(`   Всего уникальных значений: ${sortedHeights.length}`);
    console.log(`   Значения: ${sortedHeights.join(', ')}`);
    
    const standardHeights = [2000, 2100, 2200, 2300];
    const nonStandardHeights = sortedHeights.filter(h => !standardHeights.includes(h));
    if (nonStandardHeights.length > 0) {
      console.log(`   ⚠️  Нестандартные значения: ${nonStandardHeights.join(', ')}`);
    } else {
      console.log(`   ✅ Все значения стандартные`);
    }

    console.log(`\n🔍 ТОЛЩИНА/ММ:`);
    const sortedThicknesses = Array.from(thicknesses).sort((a, b) => a - b);
    console.log(`   Всего уникальных значений: ${sortedThicknesses.length}`);
    console.log(`   Значения: ${sortedThicknesses.join(', ')}`);
    
    const standardThicknesses = [36, 38, 39, 40, 42, 58];
    const nonStandardThicknesses = sortedThicknesses.filter(t => !standardThicknesses.includes(t));
    if (nonStandardThicknesses.length > 0) {
      console.log(`   ⚠️  Нестандартные значения: ${nonStandardThicknesses.join(', ')}`);
    } else {
      console.log(`   ✅ Все значения стандартные`);
    }

    // Показываем проблемные товары
    if (nonStandardProducts.length > 0) {
      console.log(`\n\n🚨 ТОВАРЫ С НЕСТАНДАРТНЫМИ РАЗМЕРАМИ:`);
      console.log('='.repeat(60));
      
      nonStandardProducts.slice(0, 20).forEach((product, index) => {
        console.log(`${index + 1}. ${product.sku}`);
        console.log(`   ${product.field}: ${product.value} (${product.issue})`);
      });

      if (nonStandardProducts.length > 20) {
        console.log(`   ... и еще ${nonStandardProducts.length - 20} товаров`);
      }

      console.log(`\n📊 Статистика проблем:`);
      console.log(`   - Всего товаров с проблемами: ${nonStandardProducts.length}`);
      
      const widthProblems = nonStandardProducts.filter(p => p.field === 'Ширина/мм').length;
      const heightProblems = nonStandardProducts.filter(p => p.field === 'Высота/мм').length;
      const thicknessProblems = nonStandardProducts.filter(p => p.field === 'Толщина/мм').length;
      
      console.log(`   - Проблемы с шириной: ${widthProblems}`);
      console.log(`   - Проблемы с высотой: ${heightProblems}`);
      console.log(`   - Проблемы с толщиной: ${thicknessProblems}`);

    } else {
      console.log(`\n\n🎉 ВСЕ РАЗМЕРЫ СТАНДАРТНЫЕ!`);
    }

    // Рекомендации
    console.log(`\n\n💡 РЕКОМЕНДАЦИИ:`);
    console.log('='.repeat(60));
    
    if (nonStandardWidths.length > 0) {
      console.log(`1. Исправить нестандартные ширины: ${nonStandardWidths.join(', ')}`);
    }
    if (nonStandardHeights.length > 0) {
      console.log(`2. Исправить нестандартные высоты: ${nonStandardHeights.join(', ')}`);
    }
    if (nonStandardThicknesses.length > 0) {
      console.log(`3. Исправить нестандартные толщины: ${nonStandardThicknesses.join(', ')}`);
    }
    
    if (nonStandardProducts.length === 0) {
      console.log(`✅ Все размеры соответствуют стандартам`);
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке размеров:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNonStandardSizes();
