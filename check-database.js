const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Проверяем состояние базы данных...\n');
    
    // Проверяем количество записей в основных таблицах
    const products = await prisma.product.count();
    const categories = await prisma.catalogCategory.count();
    const frontendCategories = await prisma.frontendCategory.count();
    const users = await prisma.user.count();
    
    console.log('📊 Статистика базы данных:');
    console.log(`  Товары: ${products}`);
    console.log(`  Категории каталога: ${categories}`);
    console.log(`  Фронтенд категории: ${frontendCategories}`);
    console.log(`  Пользователи: ${users}\n`);
    
    // Проверяем наличие товаров с определенными свойствами
    const doorsProducts = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: 'дверь' } },
          { name: { contains: 'door' } },
          { sku: { contains: 'door' } }
        ]
      },
      take: 5
    });
    
    console.log('🚪 Найденные товары дверей:');
    doorsProducts.forEach(product => {
      console.log(`  - ${product.sku}: ${product.name}`);
    });
    
    if (doorsProducts.length === 0) {
      console.log('  ❌ Товары дверей не найдены!');
    }
    
    // Проверяем категории
    const doorCategories = await prisma.catalogCategory.findMany({
      where: {
        OR: [
          { name: { contains: 'дверь', mode: 'insensitive' } },
          { name: { contains: 'door', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log('\n📁 Категории дверей:');
    doorCategories.forEach(category => {
      console.log(`  - ${category.name} (ID: ${category.id})`);
    });
    
    if (doorCategories.length === 0) {
      console.log('  ❌ Категории дверей не найдены!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();