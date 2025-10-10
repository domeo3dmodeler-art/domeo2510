const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findCategories() {
  try {
    console.log('🔍 Ищем все категории в базе данных...\n');
    
    // Получим все категории
    const categories = await prisma.catalogCategory.findMany({
      select: {
        id: true,
        name: true,
        is_active: true,
        products_count: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📁 Найдено категорий: ${categories.length}\n`);

    if (categories.length === 0) {
      console.log('❌ Категории не найдены');
      return;
    }

    console.log('📋 ВСЕ КАТЕГОРИИ:');
    console.log('='.repeat(60));

    categories.forEach((category, index) => {
      const status = category.is_active ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${category.name} (ID: ${category.id})`);
      console.log(`   Товаров: ${category.products_count}`);
    });

    // Ищем категории со словом "двер"
    console.log('\n' + '='.repeat(60));
    console.log('🚪 КАТЕГОРИИ СО СЛОВОМ "ДВЕР":');
    console.log('='.repeat(60));

    const doorCategories = categories.filter(cat => 
      cat.name.toLowerCase().includes('двер')
    );

    if (doorCategories.length > 0) {
      doorCategories.forEach((category, index) => {
        const status = category.is_active ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${category.name} (ID: ${category.id})`);
      });
    } else {
      console.log('❌ Категории со словом "двер" не найдены');
    }

    // Проверим товары в каждой категории
    console.log('\n' + '='.repeat(60));
    console.log('📦 КОЛИЧЕСТВО ТОВАРОВ В КАТЕГОРИЯХ:');
    console.log('='.repeat(60));

    for (const category of categories) {
      const productCount = await prisma.product.count({
        where: {
          catalog_category_id: category.id
        }
      });
      
      const status = category.is_active ? '✅' : '❌';
      console.log(`${status} ${category.name}: ${productCount} товаров`);
    }

    console.log('\n✅ Поиск завершен!');

  } catch (error) {
    console.error('❌ Ошибка при поиске категорий:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findCategories();
