const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTemplateFields() {
  const categoryId = 'cmg50xcgs001cv7mn0tdyk1wo'; // ID для "Межкомнатные двери"
  
  const correctFields = [
    'SKU', 'Name', 'Price', 'StockQuantity', 'Артикул поставщика',
    'Domeo_Название модели для Web', 'Ширина/мм', 'Высота/мм', 'Толщина/мм',
    'Общее_Тип покрытия', 'Domeo_Цвет', 'Domeo_Стиль Web', 'Тип конструкции',
    'Тип открывания', 'Поставщик', 'Ед.изм.', 'Склад/заказ', 'Цена опт',
    'Кромка', 'Стоимость надбавки за кромку', 'Молдинг', 'Стекло',
    'Фабрика_Коллекция', 'Фабрика_Цвет/Отделка', 'photos'
  ];

  try {
    // Получаем существующий шаблон
    const existingTemplate = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: categoryId },
    });

    if (!existingTemplate) {
      console.log('❌ Шаблон не найден для категории:', categoryId);
      return;
    }

    console.log('📋 Текущие поля шаблона:', JSON.parse(existingTemplate.required_fields || '[]'));
    console.log('📋 Правильные поля:', correctFields);

    // Обновляем шаблон с правильными полями
    const updatedTemplate = await prisma.importTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        required_fields: JSON.stringify(correctFields),
        calculator_fields: JSON.stringify([]), // Пустой массив
        export_fields: JSON.stringify([]), // Пустой массив
        template_config: JSON.stringify({
          headers: correctFields,
          requiredFields: correctFields,
          fieldMappings: {} // Очищаем маппинг
        }),
        field_mappings: JSON.stringify({}), // Очищаем маппинг
        updated_at: new Date(),
      },
    });

    console.log('✅ Шаблон успешно обновлен!');
    console.log('📋 Новые поля:', JSON.parse(updatedTemplate.required_fields));

  } catch (error) {
    console.error('❌ Ошибка при обновлении шаблона:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplateFields();
