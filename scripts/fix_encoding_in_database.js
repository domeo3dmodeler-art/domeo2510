const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Функция исправления кодировки полей
function fixFieldEncoding(field) {
  const CORRUPTED_FIELD_MAPPINGS = {
    '??????/??': ['Ширина/мм', 'Высота/мм'],
    '??????': ['Кромка', 'Стекло'],
    '??????? ??????????': 'Артикул поставщика',
    'DOMEO_??????? 1C (????????????? ????????????)': 'Domeo Артикул 1С (Проставляется атоматически)',
    'DOMEO_??????? WEB': 'Domeo_Название модели для Web',
    '????? _??? ????????': 'Общее_Тип покрытия',
    'DOMEO_???? WEB': 'Domeo_Стиль Web',
    '??? ?????????': 'Тип конструкции',
    '??? ???????????': 'Тип открывания',
    '???????????': 'Поставщик',
    '?????': 'Domeo_Цвет',
    '?????': 'Фабрика_Коллекция',
    '?????/?????': 'Фабрика_Цвет/Отделка',
    '??.???.': 'Ед.изм.',
    '?????/?????': 'Склад/заказ',
    '??? ??? (?????????? ??? ??????, ?????, ????????, ???????)': 'Цена ррц (включая цену полотна, короба, наличников, доборов)',
    '??? ???': 'Цена опт',
    '??????? ?????????? ?? ??????': 'Стоимость надбавки за кромку',
    '???????': 'Молдинг',
    '?????': 'Стекло',
    '???????': 'Толщина/мм',
    '?????': '№',
    '????????': 'Категория',
    '????????? ?????????': 'Наименование поставщика',
    '????? ?????????': 'Модель поставщика',
    '?????': 'photos'
  };

  return CORRUPTED_FIELD_MAPPINGS[field] || field;
}

// Функция исправления кодировки значений
function fixValueEncoding(value) {
  if (typeof value !== 'string') return value;
  
  // Исправляем конкретные проблемы с кодировкой
  const valueMappings = {
    '?????': 'Белый',
    '?????': 'Серый', 
    '??????': 'Бежевый',
    '?????': 'Дуб',
    '?????': 'Орех',
    '?????': 'Черный',
    '?????': 'Современная',
    '?????????': 'Неоклассика',
    '???????': 'Классика',
    '???????': 'Классическая',
    '??????': 'Скрытая',
    '????????': 'Распашная',
    '??????': 'прямое',
    '????????': 'Обратное',
    '???': 'нет',
    '??': 'да',
    '?????': 'шт',
    '????????': 'Заказное',
    '?????????': 'Складское',
    '?????????': 'складское',
    '?????': 'ПВХ',
    '???': 'ПЭТ',
    '???????': 'Нанотекс',
    '?? ???????': 'Под отделку',
    '??????': 'Экошпон',
    '?????': 'Эмаль',
    '????????': 'ВестСтайл',
    '???????': 'Портика',
    '????????': 'Triadoors',
    '??????': 'Фрамир',
    '???????': 'Межкомнатные двери'
  };

  return valueMappings[value] || value;
}

async function fixEncodingInDatabase() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ КОДИРОВКИ В БАЗЕ ДАННЫХ\n');
    console.log('⚠️  ВНИМАНИЕ: Будут изменены данные в базе!\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    // Получаем все товары категории
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      }
    });

    console.log(`📦 Найдено товаров для исправления: ${products.length}\n`);

    let totalFixed = 0;
    let productsWithChanges = 0;

    // Обрабатываем каждый товар
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      if (!product.properties_data) continue;

      let properties;
      try {
        properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
      } catch (e) {
        console.log(`❌ Ошибка парсинга для товара ${product.id}`);
        continue;
      }

      let hasChanges = false;
      const fixedProperties = {};

      // Исправляем каждое свойство
      Object.keys(properties).forEach(originalField => {
        const originalValue = properties[originalField];
        
        // Исправляем название поля
        const fixedField = fixFieldEncoding(originalField);
        
        // Исправляем значение
        const fixedValue = fixValueEncoding(originalValue);
        
        fixedProperties[fixedField] = fixedValue;
        
        if (originalField !== fixedField || originalValue !== fixedValue) {
          hasChanges = true;
        }
      });

      // Если есть изменения, обновляем товар
      if (hasChanges) {
        try {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              properties_data: JSON.stringify(fixedProperties)
            }
          });
          
          productsWithChanges++;
          totalFixed++;
          
          if (totalFixed % 100 === 0) {
            console.log(`✅ Исправлено товаров: ${totalFixed}/${products.length}`);
          }
        } catch (error) {
          console.log(`❌ Ошибка обновления товара ${product.id}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!`);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего товаров: ${products.length}`);
    console.log(`   - Товаров с изменениями: ${productsWithChanges}`);
    console.log(`   - Исправлено: ${totalFixed}`);

    // Также исправляем шаблон импорта
    console.log(`\n🔧 Исправляем шаблон импорта...`);
    
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: category.id }
    });

    if (template) {
      let requiredFields = JSON.parse(template.required_fields || '[]');
      const originalFields = [...requiredFields];
      
      // Исправляем поля в шаблоне
      requiredFields = requiredFields.map(field => fixFieldEncoding(field));
      
      if (JSON.stringify(originalFields) !== JSON.stringify(requiredFields)) {
        await prisma.importTemplate.update({
          where: { id: template.id },
          data: {
            required_fields: JSON.stringify(requiredFields),
            name: fixValueEncoding(template.name),
            description: fixValueEncoding(template.description || '')
          }
        });
        console.log(`✅ Шаблон импорта исправлен`);
      } else {
        console.log(`ℹ️  Шаблон импорта не требует изменений`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка при исправлении кодировки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEncodingInDatabase();
