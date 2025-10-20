const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCategories() {
  try {
    console.log('🔍 Проверяем категории в базе данных...');
    
    const categories = await prisma.catalogCategory.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    
    console.log(`📊 Найдено ${categories.length} категорий:`);
    
    categories.forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat.id}, товаров: ${cat._count.products})`);
    });
    
    // Проверяем конкретно категорию "Межкомнатные двери"
    const doorCategory = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });
    
    if (doorCategory) {
      console.log(`✅ Категория "Межкомнатные двери" найдена (ID: ${doorCategory.id})`);
    } else {
      console.log(`❌ Категория "Межкомнатные двери" НЕ найдена`);
      
      // Ищем похожие категории
      const similarCategories = await prisma.catalogCategory.findMany({
        where: {
          name: {
            contains: 'двер'
          }
        }
      });
      
      if (similarCategories.length > 0) {
        console.log('🔍 Найдены похожие категории:');
        similarCategories.forEach(cat => {
          console.log(`- ${cat.name} (ID: ${cat.id})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();