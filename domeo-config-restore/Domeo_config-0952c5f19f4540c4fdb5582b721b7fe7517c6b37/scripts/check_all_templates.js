const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTemplates() {
  try {
    // Проверяем ВСЕ шаблоны в базе данных
    const allTemplates = await prisma.importTemplate.findMany();

    console.log(`📋 Всего шаблонов в базе данных: ${allTemplates.length}`);
    
    for (const template of allTemplates) {
      console.log(`\n📋 Шаблон ID: ${template.id}`);
      console.log(`📋 Категория ID: ${template.catalog_category_id}`);
      console.log(`📋 Название: ${template.name}`);
      console.log(`📋 Обновлен: ${template.updated_at}`);
      console.log(`📋 Required fields:`, JSON.parse(template.required_fields || '[]'));
    }

    // Проверяем конкретно для категории "Межкомнатные двери"
    const categoryId = 'cmg50xcgs001cv7mn0tdyk1wo';
    const templatesForCategory = await prisma.importTemplate.findMany({
      where: { catalog_category_id: categoryId },
    });

    console.log(`\n📋 Шаблонов для категории ${categoryId}: ${templatesForCategory.length}`);

  } catch (error) {
    console.error('❌ Ошибка при проверке шаблонов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTemplates();
