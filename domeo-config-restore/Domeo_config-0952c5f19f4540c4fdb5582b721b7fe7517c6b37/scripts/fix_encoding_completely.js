const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Правильные поля для шаблона "Межкомнатные двери"
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

async function fixEncodingCompletely() {
  try {
    console.log('=== КАРДИНАЛЬНОЕ ИСПРАВЛЕНИЕ КОДИРОВКИ ===');
    
    // Находим шаблон
    const template = await prisma.importTemplate.findFirst({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    if (!template) {
      console.log('❌ Шаблон не найден');
      return;
    }
    
    console.log('📋 Найденный шаблон:', {
      id: template.id,
      name: template.name,
      required_fields_length: template.required_fields?.length || 0
    });
    
    // Создаем правильную конфигурацию шаблона
    const templateConfig = {
      headers: correctFields,
      requiredFields: correctFields,
      fieldMappings: {}
    };
    
    // Обновляем шаблон с правильными данными
    const updatedTemplate = await prisma.importTemplate.update({
      where: { id: template.id },
      data: {
        name: 'Шаблон для Межкомнатные двери',
        description: 'Канонический шаблон для импорта межкомнатных дверей',
        required_fields: JSON.stringify(correctFields),
        calculator_fields: JSON.stringify([]),
        export_fields: JSON.stringify([]),
        template_config: JSON.stringify(templateConfig),
        field_mappings: JSON.stringify({}),
        updated_at: new Date()
      }
    });
    
    console.log('✅ Шаблон обновлен с правильной кодировкой');
    console.log('📊 Обновленные данные:', {
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      required_fields_count: correctFields.length,
      updated_at: updatedTemplate.updated_at
    });
    
    // Проверяем результат
    const verificationTemplate = await prisma.importTemplate.findUnique({
      where: { id: template.id }
    });
    
    const parsedFields = JSON.parse(verificationTemplate.required_fields);
    console.log('\n🔍 ПРОВЕРКА РЕЗУЛЬТАТА:');
    console.log('Количество полей:', parsedFields.length);
    console.log('Первые 5 полей:');
    parsedFields.slice(0, 5).forEach((field, i) => {
      console.log(`  ${i + 1}: "${field}"`);
    });
    
    console.log('\n✅ Кодировка исправлена!');
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении кодировки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEncodingCompletely();
