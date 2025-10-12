const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductNames() {
  try {
    console.log('🔍 ПРОВЕРКА НАЗВАНИЙ ТОВАРОВ\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    console.log(`📂 Категория: ${category.name} (ID: ${category.id})\n`);

    // Получаем первые 10 товаров для анализа
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      },
      take: 10
    });

    console.log(`📦 Примеры названий товаров:\n`);

    products.forEach((product, index) => {
      console.log(`${index + 1}. ID: ${product.id}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Название: "${product.name}"`);
      
      // Парсим свойства товара
      let properties = {};
      if (product.properties_data) {
        try {
          properties = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;
        } catch (e) {
          console.log(`   Ошибка парсинга свойств: ${e.message}`);
        }
      }

      // Показываем ключевые свойства
      console.log(`   Модель: ${properties['Модель поставщика'] || properties['Модель'] || 'нет'}`);
      console.log(`   Размер: ${properties['Ширина/мм'] || ''}x${properties['Высота/мм'] || ''}мм`);
      console.log(`   Цвет: ${properties['Domeo_Цвет'] || properties['Цвет'] || 'нет'}`);
      console.log(`   Стиль: ${properties['Domeo_Стиль Web'] || properties['Стиль'] || 'нет'}`);
      console.log('');
    });

    // Статистика по названиям
    const allProducts = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: { name: true }
    });

    const nameStats = {};
    allProducts.forEach(product => {
      const name = product.name || 'null';
      nameStats[name] = (nameStats[name] || 0) + 1;
    });

    console.log('📊 СТАТИСТИКА НАЗВАНИЙ:');
    Object.entries(nameStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([name, count]) => {
        console.log(`   "${name}": ${count} товаров`);
      });

  } catch (error) {
    console.error('❌ Ошибка при проверке названий товаров:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductNames();
