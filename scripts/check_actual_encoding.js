const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkActualEncoding() {
  try {
    console.log('🔍 ПРОВЕРЯЕМ РЕАЛЬНУЮ КОДИРОВКУ В БАЗЕ ДАННЫХ\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    // Получаем первые 3 товара для анализа
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      },
      take: 3
    });

    console.log(`📦 Анализируем первые ${products.length} товаров:\n`);

    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ТОВАР: ${product.sku}`);
      
      if (!product.properties_data) {
        console.log('   ❌ Нет данных о свойствах');
        return;
      }

      let properties;
      try {
        properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
      } catch (e) {
        console.log('   ❌ Ошибка парсинга properties_data');
        return;
      }

      console.log('   📋 Свойства:');
      Object.keys(properties).forEach(field => {
        const value = properties[field];
        console.log(`     "${field}": "${value}"`);
        
        // Проверяем на проблемные символы
        if (field.includes('?') || value.includes('?')) {
          console.log(`       ⚠️  СОДЕРЖИТ ВОПРОСИТЕЛЬНЫЕ ЗНАКИ!`);
        }
        if (field.includes('') || value.includes('')) {
          console.log(`       ⚠️  СОДЕРЖИТ ПУСТЫЕ СИМВОЛЫ!`);
        }
      });
    });

    // Также проверим шаблон
    console.log('\n🔧 ПРОВЕРЯЕМ ШАБЛОН ИМПОРТА:');
    
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: category.id }
    });

    if (template) {
      console.log(`   Название: "${template.name}"`);
      console.log(`   Описание: "${template.description}"`);
      
      let requiredFields = JSON.parse(template.required_fields || '[]');
      console.log(`   Поля шаблона:`);
      requiredFields.forEach((field, index) => {
        console.log(`     ${index + 1}. "${field}"`);
        if (field.includes('?') || field.includes('')) {
          console.log(`       ⚠️  СОДЕРЖИТ ПРОБЛЕМНЫЕ СИМВОЛЫ!`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualEncoding();
