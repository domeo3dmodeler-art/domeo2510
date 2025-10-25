const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Правильные поля для шаблона "Межкомнатные двери" БЕЗ ДУБЛИРОВАНИЯ
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

async function fixTemplateFields() {
  try {
    console.log('=== ИСПРАВЛЕНИЕ ДУБЛИРОВАНИЯ ПОЛЕЙ В ШАБЛОНЕ ===');
    
    // Находим шаблон для "Межкомнатные двери"
    const template = await prisma.importTemplate.findFirst({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    if (!template) {
      console.log('❌ Шаблон не найден');
      return;
    }
    
    console.log(`📋 Найден шаблон: ${template.id}`);
    
    // Проверяем текущие поля
    const currentFields = JSON.parse(template.required_fields || '[]');
    console.log(`📊 Текущее количество полей: ${currentFields.length}`);
    
    // Находим дубликаты
    const duplicates = currentFields.filter((field, index) => currentFields.indexOf(field) !== index);
    if (duplicates.length > 0) {
      console.log('🔄 Найдены дубликаты:');
      duplicates.forEach(dup => console.log(`  - "${dup}"`));
    }
    
    // Создаем конфигурацию шаблона
    const templateConfig = {
      headers: correctFields,
      requiredFields: correctFields,
      fieldMappings: {}
    };
    
    // Обновляем шаблон с правильными полями
    const updatedTemplate = await prisma.importTemplate.update({
      where: { id: template.id },
      data: {
        required_fields: JSON.stringify(correctFields),
        calculator_fields: JSON.stringify([]),
        export_fields: JSON.stringify([]),
        template_config: JSON.stringify(templateConfig),
        field_mappings: JSON.stringify({}),
        updated_at: new Date()
      }
    });
    
    console.log('✅ Шаблон обновлен');
    console.log(`📊 Новое количество полей: ${correctFields.length}`);
    
    // Проверяем результат
    const verificationTemplate = await prisma.importTemplate.findUnique({
      where: { id: template.id }
    });
    
    const parsedFields = JSON.parse(verificationTemplate.required_fields);
    console.log('\n🔍 ПРОВЕРКА РЕЗУЛЬТАТА:');
    console.log('Все поля:');
    parsedFields.forEach((field, i) => {
      console.log(`  ${i + 1}: "${field}"`);
    });
    
    // Проверяем на дубликаты
    const uniqueFields = [...new Set(parsedFields)];
    if (uniqueFields.length === parsedFields.length) {
      console.log('✅ Дубликатов нет');
    } else {
      console.log(`❌ Найдены дубликаты: ${parsedFields.length - uniqueFields.length}`);
    }
    
    console.log('\n✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО');
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении шаблона:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplateFields();
