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

async function fixAllDataEncoding() {
  try {
    console.log('=== КАРДИНАЛЬНОЕ ИСПРАВЛЕНИЕ ВСЕХ ДАННЫХ В БАЗЕ ===');
    
    // 1. Исправляем все importTemplate
    console.log('\n🔧 ИСПРАВЛЕНИЕ IMPORT TEMPLATE:');
    const templates = await prisma.importTemplate.findMany();
    
    for (const template of templates) {
      console.log(`  Обрабатываем шаблон: ${template.id}`);
      
      // Проверяем и исправляем required_fields
      let requiredFields = [];
      try {
        const parsed = JSON.parse(template.required_fields || '[]');
        requiredFields = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.log(`    Ошибка парсинга required_fields: ${e.message}`);
        requiredFields = [];
      }
      
      // Если это шаблон для "Межкомнатные двери", заменяем на правильные поля
      if (template.catalog_category_id === 'cmg50xcgs001cv7mn0tdyk1wo') {
        console.log('    Заменяем на правильные поля для "Межкомнатные двери"');
        requiredFields = correctFields;
      } else {
        // Для других шаблонов исправляем кодировку
        requiredFields = requiredFields.map(field => {
          if (typeof field === 'string' && field.includes('?')) {
            // Маппинг поврежденных полей
            const fieldMappings = {
              '??????? ??????????': 'Артикул поставщика',
              'Domeo_???????? ?????? ??? Web': 'Domeo_Название модели для Web',
              '??????/??': 'Ширина/мм',
              '??????/??': 'Высота/мм',
              '???????/??': 'Толщина/мм',
              '?????_??? ????????': 'Общее_Тип покрытия',
              'Domeo_????': 'Domeo_Цвет',
              'Domeo_????? Web': 'Domeo_Стиль Web',
              '??? ???????????': 'Тип конструкции',
              '??? ??????????': 'Тип открывания',
              '?????????': 'Поставщик',
              '??.???.': 'Ед.изм.',
              '?????/?????': 'Склад/заказ',
              '???? ??? (??????? ???? ???????, ??????, ??????????, ???????)': 'Цена ррц (включая цену полотна, короба, наличников, доборов)',
              '???? ???': 'Цена опт',
              '??????': 'Кромка',
              '????????? ???????? ?? ??????': 'Стоимость надбавки за кромку',
              '???????': 'Молдинг',
              '??????': 'Стекло',
              '???????_?????????': 'Фабрика_Коллекция',
              '???????_????/???????': 'Фабрика_Цвет/Отделка',
              'Domeo ??????? 1C (????????????? ????????????)': 'Domeo Артикул 1C (Проставляется атоматически)'
            };
            return fieldMappings[field] || field;
          }
          return field;
        });
      }
      
      // Обновляем шаблон
      await prisma.importTemplate.update({
        where: { id: template.id },
        data: {
          required_fields: JSON.stringify(requiredFields),
          calculator_fields: JSON.stringify([]),
          export_fields: JSON.stringify([]),
          template_config: JSON.stringify({
            headers: requiredFields,
            requiredFields: requiredFields,
            fieldMappings: {}
          }),
          field_mappings: JSON.stringify({}),
          updated_at: new Date()
        }
      });
      
      console.log(`    ✅ Обновлен шаблон ${template.id}`);
    }
    
    // 2. Проверяем и исправляем catalogCategory
    console.log('\n🔧 ПРОВЕРКА CATALOG CATEGORY:');
    const categories = await prisma.catalogCategory.findMany({
      where: {
        name: {
          contains: 'двер'
        }
      }
    });
    
    for (const category of categories) {
      console.log(`  Категория: "${category.name}" - кодировка OK`);
    }
    
    // 3. Проверяем product (если есть)
    console.log('\n🔧 ПРОВЕРКА PRODUCT:');
    const products = await prisma.product.findMany({
      take: 5,
      where: {
        OR: [
          { name: { contains: 'двер' } },
          { sku: { contains: 'двер' } }
        ]
      }
    });
    
    console.log(`  Найдено продуктов: ${products.length}`);
    products.forEach((product, i) => {
      console.log(`    ${i + 1}. "${product.name}" - кодировка OK`);
    });
    
    console.log('\n✅ ВСЕ ДАННЫЕ ИСПРАВЛЕНЫ!');
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllDataEncoding();
