const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Правильные поля для шаблона "Межкомнатные двери" с правильной кодировкой
const correctFields = [
  "Domeo Артикул 1C (Проставляется атоматически)",
  "Артикул поставщика", 
  "Domeo_Название модели для Web",
  "Ширина/мм",
  "Высота/мм", 
  "Толщина/мм",
  "Общее_Тип покрытия",
  "Domeo_Цвет",
  "Domeo_Стиль Web",
  "Тип конструкции",
  "Тип открывания",
  "Поставщик",
  "Ед.изм.",
  "Склад/заказ",
  "Цена ррц (включая цену полотна, короба, наличников, доборов)",
  "Цена опт",
  "Кромка",
  "Стоимость надбавки за кромку",
  "Молдинг",
  "Стекло",
  "Фабрика_Коллекция",
  "Фабрика_Цвет/Отделка"
];

async function recreateTemplateWithCorrectEncoding() {
  try {
    console.log('=== КАРДИНАЛЬНОЕ ПЕРЕСОЗДАНИЕ ШАБЛОНА С ПРАВИЛЬНОЙ КОДИРОВКОЙ ===');
    
    // Удаляем старый шаблон
    const deletedTemplate = await prisma.importTemplate.deleteMany({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    console.log('🗑️ Удалено старых шаблонов:', deletedTemplate.count);
    
    // Создаем конфигурацию шаблона с правильной кодировкой
    const templateConfig = {
      headers: correctFields,
      requiredFields: correctFields,
      fieldMappings: {}
    };
    
    // Создаем новый шаблон с правильной кодировкой
    const newTemplate = await prisma.importTemplate.create({
      data: {
        catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo',
        name: 'Шаблон для Межкомнатные двери',
        description: 'Канонический шаблон для импорта межкомнатных дверей',
        required_fields: JSON.stringify(correctFields),
        calculator_fields: JSON.stringify([]),
        export_fields: JSON.stringify([]),
        template_config: JSON.stringify(templateConfig),
        field_mappings: JSON.stringify({})
      }
    });
    
    console.log('✅ Новый шаблон создан с правильной кодировкой');
    console.log('📊 Данные нового шаблона:', {
      id: newTemplate.id,
      name: newTemplate.name,
      required_fields_count: correctFields.length,
      created_at: newTemplate.created_at
    });
    
    // Проверяем результат
    const verificationTemplate = await prisma.importTemplate.findUnique({
      where: { id: newTemplate.id }
    });
    
    const parsedFields = JSON.parse(verificationTemplate.required_fields);
    console.log('\n🔍 ПРОВЕРКА РЕЗУЛЬТАТА:');
    console.log('Количество полей:', parsedFields.length);
    console.log('Первые 5 полей:');
    parsedFields.slice(0, 5).forEach((field, i) => {
      console.log(`  ${i + 1}: "${field}"`);
      console.log(`     Длина: ${field.length}, Кодировка: ${Buffer.from(field, 'utf8').toString('hex')}`);
    });
    
    // Проверяем кодировку каждого поля
    console.log('\n🔍 ПРОВЕРКА КОДИРОВКИ ВСЕХ ПОЛЕЙ:');
    parsedFields.forEach((field, i) => {
      const hasCyrillic = /[а-яё]/i.test(field);
      const hasQuestionMarks = field.includes('?');
      console.log(`  ${i + 1}: "${field}" - Кириллица: ${hasCyrillic}, Знаки вопроса: ${hasQuestionMarks}`);
    });
    
    console.log('\n✅ Шаблон пересоздан с правильной кодировкой!');
    
  } catch (error) {
    console.error('❌ Ошибка при пересоздании шаблона:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recreateTemplateWithCorrectEncoding();
