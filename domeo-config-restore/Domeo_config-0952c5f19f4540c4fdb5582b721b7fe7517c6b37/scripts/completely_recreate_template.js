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

async function completelyRecreateTemplate() {
  try {
    console.log('=== КАРДИНАЛЬНОЕ ПЕРЕСОЗДАНИЕ ШАБЛОНА ===');
    
    // 1. Удаляем ВСЕ старые шаблоны для этой категории
    console.log('🗑️ Удаляем все старые шаблоны...');
    const deleted = await prisma.importTemplate.deleteMany({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    console.log(`Удалено шаблонов: ${deleted.count}`);
    
    // 2. Создаем новый шаблон с правильными данными
    console.log('🆕 Создаем новый шаблон...');
    const newTemplate = await prisma.importTemplate.create({
      data: {
        catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo',
        name: 'Шаблон для Межкомнатные двери',
        description: 'Канонический шаблон для импорта межкомнатных дверей',
        required_fields: JSON.stringify(correctFields),
        calculator_fields: JSON.stringify([]),
        export_fields: JSON.stringify([]),
        template_config: JSON.stringify({
          headers: correctFields,
          requiredFields: correctFields,
          fieldMappings: {}
        }),
        field_mappings: JSON.stringify({})
      }
    });
    
    console.log(`✅ Создан новый шаблон: ${newTemplate.id}`);
    
    // 3. Проверяем результат
    console.log('\n🔍 ПРОВЕРКА РЕЗУЛЬТАТА:');
    const verificationTemplate = await prisma.importTemplate.findUnique({
      where: { id: newTemplate.id }
    });
    
    const parsedFields = JSON.parse(verificationTemplate.required_fields);
    console.log(`Количество полей: ${parsedFields.length}`);
    
    // Проверяем каждое поле на кодировку
    let corruptedCount = 0;
    parsedFields.forEach((field, i) => {
      const hasCorrupted = field.includes('?');
      if (hasCorrupted) {
        corruptedCount++;
        console.log(`❌ Поле ${i + 1}: "${field}" - ПОВРЕЖДЕНО`);
      } else {
        console.log(`✅ Поле ${i + 1}: "${field}" - OK`);
      }
    });
    
    if (corruptedCount === 0) {
      console.log('\n🎉 ВСЕ ПОЛЯ ИМЕЮТ ПРАВИЛЬНУЮ КОДИРОВКУ!');
    } else {
      console.log(`\n❌ НАЙДЕНО ${corruptedCount} ПОВРЕЖДЕННЫХ ПОЛЕЙ`);
    }
    
    // 4. Тестируем API
    console.log('\n🌐 ТЕСТИРУЕМ API...');
    try {
      const response = await fetch('http://localhost:3000/api/admin/templates?catalogCategoryId=cmg50xcgs001cv7mn0tdyk1wo');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.template) {
          console.log('✅ API возвращает данные');
          console.log(`Количество полей в API: ${data.template.requiredFields.length}`);
          
          // Проверяем кодировку в API
          const apiCorruptedFields = data.template.requiredFields.filter(field => field.includes('?'));
          if (apiCorruptedFields.length === 0) {
            console.log('✅ API возвращает поля с правильной кодировкой');
          } else {
            console.log(`❌ API возвращает ${apiCorruptedFields.length} поврежденных полей`);
            apiCorruptedFields.forEach(field => {
              console.log(`  - "${field}"`);
            });
          }
        }
      }
    } catch (apiError) {
      console.log('❌ Ошибка при тестировании API:', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при пересоздании шаблона:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completelyRecreateTemplate();
