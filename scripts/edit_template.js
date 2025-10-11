const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function editTemplate() {
  try {
    const templateId = 'cmg6u3kis0cg7mej2z6nnuezp';
    
    // Загружаем текущий шаблон
    const template = await prisma.importTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      console.log('❌ Шаблон не найден');
      return;
    }
    
    console.log('📋 Текущий шаблон:', template.name);
    
    // Парсим текущие поля
    const requiredFields = JSON.parse(template.required_fields || '[]');
    const templateConfig = JSON.parse(template.template_config || '{}');
    
    console.log('✅ Текущие обязательные поля:');
    requiredFields.forEach((field, i) => console.log(`   ${i+1}. ${field}`));
    
    // Пример редактирования - добавляем новое поле
    const newRequiredFields = [
      ...requiredFields,
      'Новое поле' // Добавляем новое поле
    ];
    
    // Обновляем шаблон
    const updatedTemplate = await prisma.importTemplate.update({
      where: { id: templateId },
      data: {
        required_fields: JSON.stringify(newRequiredFields),
        updated_at: new Date()
      }
    });
    
    console.log('✅ Шаблон обновлен!');
    console.log('📅 Обновлен:', updatedTemplate.updated_at);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

editTemplate();
