const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplateNameAndDescription() {
  try {
    console.log('=== ИСПРАВЛЕНИЕ НАЗВАНИЯ И ОПИСАНИЯ ШАБЛОНА ===');
    
    // Находим шаблон для "Межкомнатные двери"
    const template = await prisma.importTemplate.findFirst({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    if (!template) {
      console.log('❌ Шаблон не найден');
      return;
    }
    
    console.log(`📋 Найден шаблон: ${template.id}`);
    console.log(`Текущее название: "${template.name}"`);
    console.log(`Текущее описание: "${template.description}"`);
    
    // Исправляем название и описание
    const updatedTemplate = await prisma.importTemplate.update({
      where: { id: template.id },
      data: {
        name: 'Шаблон для Межкомнатные двери',
        description: 'Канонический шаблон для импорта межкомнатных дверей',
        updated_at: new Date()
      }
    });
    
    console.log('✅ Шаблон обновлен');
    console.log(`Новое название: "${updatedTemplate.name}"`);
    console.log(`Новое описание: "${updatedTemplate.description}"`);
    
    // Проверяем результат
    const verificationTemplate = await prisma.importTemplate.findUnique({
      where: { id: template.id }
    });
    
    console.log('\n🔍 ПРОВЕРКА РЕЗУЛЬТАТА:');
    console.log(`Название содержит знаки вопроса: ${verificationTemplate.name.includes('?')}`);
    console.log(`Описание содержит знаки вопроса: ${verificationTemplate.description.includes('?')}`);
    
    if (!verificationTemplate.name.includes('?') && !verificationTemplate.description.includes('?')) {
      console.log('🎉 Название и описание исправлены!');
    } else {
      console.log('❌ Проблема с кодировкой все еще есть');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении шаблона:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplateNameAndDescription();
