const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkModelD5AvailableOptions() {
  console.log('🔍 ПРОВЕРКА ДОСТУПНЫХ ОПЦИЙ ДЛЯ МОДЕЛИ d5');
  console.log('='.repeat(60));
  
  // Получаем все товары модели d5
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
  
  // Фильтруем товары модели d5
  const products = allProducts.filter(product => {
    const properties = product.properties_data ?
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
    return properties['Артикул поставщика'] === 'd5';
  });
  
  console.log(`📊 Найдено товаров модели d5: ${products.length}`);
  
  if (products.length === 0) {
    console.log('❌ Товары модели d5 не найдены!');
    await prisma.$disconnect();
    return;
  }
  
  // Анализируем доступные опции
  const availableFinishes = new Set();
  const availableColors = new Set();
  const availableSizes = new Set();
  
  products.forEach(product => {
    const properties = product.properties_data ?
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
    
    if (properties['Тип покрытия']) availableFinishes.add(properties['Тип покрытия']);
    if (properties['Domeo_Цвет']) availableColors.add(properties['Domeo_Цвет']);
    if (properties['Ширина/мм'] && properties['Высота/мм']) {
      availableSizes.add(`${properties['Ширина/мм']}×${properties['Высота/мм']}`);
    }
  });
  
  console.log('\n📋 ДОСТУПНЫЕ ОПЦИИ ДЛЯ МОДЕЛИ d5:');
  console.log('-'.repeat(50));
  console.log(`Покрытия: ${Array.from(availableFinishes).sort().join(', ')}`);
  console.log(`Цвета: ${Array.from(availableColors).sort().join(', ')}`);
  console.log(`Размеры: ${Array.from(availableSizes).sort().join(', ')}`);
  
  // Проверяем конкретную комбинацию
  console.log('\n🎯 ПРОВЕРКА КОНКРЕТНОЙ КОМБИНАЦИИ:');
  console.log('-'.repeat(50));
  console.log('Искомая комбинация: ПЭТ + Бежевый + 700×2100');
  
  const hasPET = availableFinishes.has('ПЭТ');
  const hasBeige = availableColors.has('Бежевый');
  const has700x2100 = availableSizes.has('700×2100');
  
  console.log(`Покрытие ПЭТ: ${hasPET ? '✅ Есть' : '❌ Нет'}`);
  console.log(`Цвет Бежевый: ${hasBeige ? '✅ Есть' : '❌ Нет'}`);
  console.log(`Размер 700×2100: ${has700x2100 ? '✅ Есть' : '❌ Нет'}`);
  
  if (!hasPET || !hasBeige || !has700x2100) {
    console.log('\n❌ ПРОБЛЕМА: Для модели d5 отсутствует:');
    if (!hasPET) console.log('   - Покрытие ПЭТ');
    if (!hasBeige) console.log('   - Цвет Бежевый');
    if (!has700x2100) console.log('   - Размер 700×2100');
  }
  
  // Проверяем есть ли ПЭТ + Бежевый в любых размерах
  console.log('\n🔍 ПРОВЕРКА КОМБИНАЦИИ ПЭТ + БЕЖЕВЫЙ:');
  console.log('-'.repeat(50));
  
  const petBeigeProducts = products.filter(product => {
    const properties = product.properties_data ?
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
    
    return properties['Тип покрытия'] === 'ПЭТ' && properties['Domeo_Цвет'] === 'Бежевый';
  });
  
  if (petBeigeProducts.length > 0) {
    console.log(`✅ Найдено ${petBeigeProducts.length} товаров с ПЭТ + Бежевый:`);
    petBeigeProducts.forEach(product => {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
      
      console.log(`   ${properties['Ширина/мм']}×${properties['Высота/мм']} - ${product.sku}`);
    });
  } else {
    console.log('❌ Товаров с ПЭТ + Бежевый не найдено');
  }
  
  await prisma.$disconnect();
}

checkModelD5AvailableOptions().catch(console.error);
