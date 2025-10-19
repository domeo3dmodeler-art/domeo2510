const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findPETBeigeCombinations() {
  console.log('🔍 ПОИСК КОМБИНАЦИЙ ПЭТ + БЕЖЕВЫЙ');
  console.log('='.repeat(50));
  
  // Получаем все товары категории двери
  const allProducts = await prisma.product.findMany({
    where: {
      catalog_category: {
        name: 'Межкомнатные двери'
      }
    },
    select: {
      id: true,
      sku: true,
      name: true,
      properties_data: true
    }
  });
  
  console.log(`📊 Всего товаров в категории: ${allProducts.length}`);
  
  // Ищем товары с комбинацией ПЭТ + Бежевый
  const petBeigeProducts = allProducts.filter(product => {
    const properties = product.properties_data ?
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
    
    const finish = properties['Тип покрытия'];
    const color = properties['Domeo_Цвет'];
    
    return finish === 'ПЭТ' && color === 'Бежевый';
  });
  
  console.log(`\n🎯 Найдено товаров с ПЭТ + Бежевый: ${petBeigeProducts.length}`);
  
  if (petBeigeProducts.length === 0) {
    console.log('❌ Товары с комбинацией ПЭТ + Бежевый не найдены!');
    await prisma.$disconnect();
    return;
  }
  
  // Группируем по моделям
  const modelGroups = {};
  
  petBeigeProducts.forEach(product => {
    const properties = product.properties_data ?
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
    
    const model = properties['Domeo_Название модели для Web'];
    const style = properties['Domeo_Стиль Web'];
    const width = properties['Ширина/мм'];
    const height = properties['Высота/мм'];
    const price = properties['Цена РРЦ'];
    
    const key = `${style}|${model}`;
    
    if (!modelGroups[key]) {
      modelGroups[key] = {
        style,
        model,
        sizes: new Set(),
        products: []
      };
    }
    
    modelGroups[key].sizes.add(`${width}×${height}`);
    modelGroups[key].products.push({
      sku: product.sku,
      width,
      height,
      price
    });
  });
  
  console.log('\n📋 МОДЕЛИ С КОМБИНАЦИЕЙ ПЭТ + БЕЖЕВЫЙ:');
  console.log('-'.repeat(60));
  
  Object.values(modelGroups).forEach((group, index) => {
    console.log(`${index + 1}. ${group.style} | ${group.model}`);
    console.log(`   Размеры: ${Array.from(group.sizes).sort().join(', ')}`);
    console.log(`   Товаров: ${group.products.length}`);
    
    // Проверяем есть ли размер 700×2100
    const has700x2100 = group.sizes.has('700×2100');
    console.log(`   Есть 700×2100: ${has700x2100 ? '✅' : '❌'}`);
    
    if (has700x2100) {
      const product700x2100 = group.products.find(p => p.width === '700' && p.height === '2100');
      console.log(`   Цена 700×2100: ${product700x2100?.price || 'N/A'}`);
    }
    
    console.log('');
  });
  
  // Проверяем есть ли модель с ПЭТ + Бежевый + 700×2100
  const hasTargetCombination = Object.values(modelGroups).some(group => 
    group.sizes.has('700×2100')
  );
  
  console.log('🎯 РЕЗУЛЬТАТ ПОИСКА:');
  console.log('-'.repeat(30));
  console.log(`Комбинация ПЭТ + Бежевый + 700×2100: ${hasTargetCombination ? '✅ НАЙДЕНА' : '❌ НЕ НАЙДЕНА'}`);
  
  if (!hasTargetCombination) {
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('1. Добавить товар с комбинацией ПЭТ + Бежевый + 700×2100 в базу данных');
    console.log('2. Или изменить логику калькулятора для обработки отсутствующих комбинаций');
    console.log('3. Или предложить пользователю альтернативные варианты');
  }
  
  await prisma.$disconnect();
}

findPETBeigeCombinations().catch(console.error);
