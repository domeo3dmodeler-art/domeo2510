const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBase1Products() {
  console.log('🔍 ПРОВЕРКА ТОВАРОВ МОДЕЛИ DomeoDoors_Base_1');
  console.log('='.repeat(60));
  
  // Получаем все товары модели DomeoDoors_Base_1
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
  
  // Фильтруем товары модели DomeoDoors_Base_1
  const products = allProducts.filter(product => {
    const properties = product.properties_data ?
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
    return properties['Domeo_Название модели для Web'] === 'DomeoDoors_Base_1';
  });
  
  console.log(`📊 Найдено товаров модели DomeoDoors_Base_1: ${products.length}`);
  
  if (products.length === 0) {
    console.log('❌ Товары модели DomeoDoors_Base_1 не найдены!');
    await prisma.$disconnect();
    return;
  }
  
  // Анализируем свойства каждого товара
  const analysis = {};
  
  products.forEach(product => {
    const properties = product.properties_data ?
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
    
    const style = properties['Domeo_Стиль Web'] || 'N/A';
    const model = properties['Domeo_Название модели для Web'] || 'N/A';
    const finish = properties['Тип покрытия'] || 'N/A';
    const color = properties['Domeo_Цвет'] || 'N/A';
    const width = properties['Ширина/мм'] || 'N/A';
    const height = properties['Высота/мм'] || 'N/A';
    const price = properties['Цена РРЦ'] || 'N/A';
    
    const key = `${style}|${model}|${finish}|${color}|${width}|${height}`;
    
    if (!analysis[key]) {
      analysis[key] = {
        count: 0,
        products: [],
        style, model, finish, color, width, height, price
      };
    }
    
    analysis[key].count++;
    analysis[key].products.push({
      sku: product.sku,
      name: product.name,
      price: price
    });
  });
  
  console.log('\n📋 УНИКАЛЬНЫЕ КОМБИНАЦИИ МОДЕЛИ DomeoDoors_Base_1:');
  console.log('-'.repeat(80));
  
  Object.values(analysis).forEach((combo, index) => {
    console.log(`${index + 1}. ${combo.style} | ${combo.model} | ${combo.finish} | ${combo.color} | ${combo.width}×${combo.height}`);
    console.log(`   Товаров: ${combo.count}, Цена: ${combo.price}`);
    console.log(`   SKU: ${combo.products.map(p => p.sku).join(', ')}`);
    console.log('');
  });
  
  // Проверяем конкретную комбинацию из ошибки
  const targetCombo = 'Современная|DomeoDoors_Base_1|ПЭТ|Бежевый|700|2100';
  const targetComboExists = analysis[targetCombo];
  
  console.log('🎯 ПРОВЕРКА ПРОБЛЕМНОЙ КОМБИНАЦИИ:');
  console.log('-'.repeat(50));
  console.log(`Искомая комбинация: ${targetCombo}`);
  
  if (targetComboExists) {
    console.log('✅ Комбинация найдена!');
    console.log(`   Товаров: ${targetComboExists.count}`);
    console.log(`   Цена: ${targetComboExists.price}`);
  } else {
    console.log('❌ Комбинация НЕ найдена!');
    
    // Ищем похожие комбинации
    console.log('\n🔍 ПОХОЖИЕ КОМБИНАЦИИ:');
    Object.values(analysis).forEach(combo => {
      if (combo.model === 'DomeoDoors_Base_1' && combo.style === 'Современная') {
        console.log(`   ${combo.finish} | ${combo.color} | ${combo.width}×${combo.height} (${combo.count} товаров)`);
      }
    });
  }
  
  // Проверяем доступные покрытия и цвета для модели DomeoDoors_Base_1
  const availableFinishes = new Set();
  const availableColors = new Set();
  const availableSizes = new Set();
  
  Object.values(analysis).forEach(combo => {
    if (combo.model === 'DomeoDoors_Base_1' && combo.style === 'Современная') {
      availableFinishes.add(combo.finish);
      availableColors.add(combo.color);
      availableSizes.add(`${combo.width}×${combo.height}`);
    }
  });
  
  console.log('\n📊 ДОСТУПНЫЕ ВАРИАНТЫ ДЛЯ МОДЕЛИ DomeoDoors_Base_1 (Современная):');
  console.log('-'.repeat(50));
  console.log(`Покрытия: ${Array.from(availableFinishes).join(', ')}`);
  console.log(`Цвета: ${Array.from(availableColors).join(', ')}`);
  console.log(`Размеры: ${Array.from(availableSizes).join(', ')}`);
  
  await prisma.$disconnect();
}

checkBase1Products().catch(console.error);
