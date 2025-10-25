const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplateData() {
  const categoryId = 'cmg50xcgs001cv7mn0tdyk1wo';
  
  try {
    // Проверяем все шаблоны для этой категории
    const templates = await prisma.importTemplate.findMany({
      where: { catalog_category_id: categoryId },
    });

    console.log(`📋 Найдено шаблонов для категории: ${templates.length}`);
    
    for (const template of templates) {
      console.log(`\n📋 Шаблон ID: ${template.id}`);
      console.log(`📋 Название: ${template.name}`);
      console.log(`📋 Обновлен: ${template.updated_at}`);
      console.log(`📋 Required fields:`, JSON.parse(template.required_fields || '[]'));
      console.log(`📋 Template config:`, JSON.parse(template.template_config || '{}'));
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке шаблона:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplateData();
