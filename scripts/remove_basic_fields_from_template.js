const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeBasicFieldsFromTemplate() {
  const categoryId = 'cmg50xcgs001cv7mn0tdyk1wo'; // ID для "Межкомнатные двери"

  try {
    const existingTemplate = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: categoryId },
    });

    if (!existingTemplate) {
      console.log('❌ Шаблон не найден для категории:', categoryId);
      return;
    }

    let requiredFields = JSON.parse(existingTemplate.required_fields || '[]');
    let templateConfig = JSON.parse(existingTemplate.template_config || '{}');

    console.log('📋 Текущие поля:', requiredFields);

    // Удаляем базовые поля, которые не загружаются
    const fieldsToRemove = ['SKU', 'Name', 'Price', 'StockQuantity'];
    requiredFields = requiredFields.filter(field => !fieldsToRemove.includes(field));

    // Удаляем базовые поля из templateConfig.headers
    if (templateConfig.headers && Array.isArray(templateConfig.headers)) {
      templateConfig.headers = templateConfig.headers.filter(header => !fieldsToRemove.includes(header));
    }

    // Обновляем шаблон
    await prisma.importTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        required_fields: JSON.stringify(requiredFields),
        template_config: JSON.stringify(templateConfig),
        updated_at: new Date(),
      },
    });

    console.log(`✅ Базовые поля (SKU, Name, Price, StockQuantity) удалены из шаблона для категории "${categoryId}".`);
    console.log('📋 Новые обязательные поля:', requiredFields);
    console.log('📋 Новые заголовки шаблона:', templateConfig.headers);

  } catch (error) {
    console.error('❌ Ошибка при удалении базовых полей из шаблона:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeBasicFieldsFromTemplate();
