const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Расширенный маппинг неправильной кодировки на правильную
const encodingMap = {
  // Стили
  'Ð¡Ð¾Ð²ÑÐµÐ¼ÐµÐ½Ð½Ð°Ñ': 'Современная',
  'ÐÐµÐ¾ÐºÐ»Ð°ÑÑÐ¸ÐºÐ°': 'Неоклассика', 
  'ÐÐ»Ð°ÑÑÐ¸ÐºÐ°': 'Классика',
  'Ð¡ÐºÑÑÑÐ°Ñ': 'Скрытая',
  
  // Категории
  'ÐÐµÐ¶ÐºÐ¾Ð¼Ð½Ð°ÑÐ½ÑÐµ Ð´Ð²ÐµÑÐ¸': 'Межкомнатные двери',
  'ÐÐ²ÐµÑÐ¸ Ð²Ñ ÐºÐ²Ð°ÑÑÐ¸ÑÑ': 'Двери в квартиру',
  'ÐÐ²ÐµÑÐ¸ Ð² Ð´Ð¾Ð¼': 'Двери в дом',
  
  // Материалы
  'ÐÐÐ¥': 'ПВХ',
  'ÐÐÐ¢': 'ПЭТ',
  'ÐÐ½Ð°Ð¼ÐµÐ»Ñ': 'Эмаль',
  'ÐÐ°Ð½Ð¾ÑÐµÐºÑ': 'Нанотекс',
  'ÐÐµÐ»ÐµÐ½Ð¸Ð½': 'Меламин',
  'ÐÐ¸ÑÐ¾Ð²Ð°Ð½Ð¸Ðµ': 'Ламинирование',
  
  // Цвета
  'ÐÐµÐ»ÑÐ¹': 'Белый',
  'ÐÐµÐ¶ÐµÐ²ÑÐ¹': 'Бежевый',
  'Ð¡ÐµÑÑÐ¹': 'Серый',
  'Ð§ÐµÑÐ½ÑÐ¹': 'Черный',
  'ÐÐ¾ÑÐ¸ÑÐ½ÐµÐ²ÑÐ¹': 'Коричневый',
  'ÐÐ¸Ð½Ð¸Ð¹': 'Синий',
  'ÐÐ°Ð»Ð°ÑÑÐ¸Ð½Ð¾Ð²ÑÐ¹': 'Малахитовый',
  'ÐÐ¾Ð»Ð¾ÑÑÐ¾Ð¹': 'Золотой',
  'Ð¡ÐµÑÐµÐ±ÑÑÐ½ÑÐ¹': 'Серебряный',
  
  // Типы конструкций
  'Ð Ð°ÑÐ¿Ð°ÑÐ½Ð°Ñ': 'Распашная',
  'Ð¡ÐºÐ»Ð°Ð´Ð½Ð°Ñ': 'Складная',
  'ÐÐ²ÐµÑÐ½Ð°Ñ': 'Дверная',
  
  // Производители
  'ÐÐµÑÑÑÑÐ°Ð¹Ð»': 'ВестСтайл',
  'ÐÐ¾Ð¼ÐµÐ¾': 'Domeo',
  
  // Другие термины
  'ÐÐ°ÐºÐ°Ð·Ð½Ð¾Ðµ': 'Заказное',
  'ÐÐ½Ð°Ð»Ð¸ÑÐµÐ½Ð¸Ðµ': 'Наличие',
  'ÐÐ¾Ð»Ð¾ÑÐºÐ°': 'Кромка',
  'ÐÐ¾Ð»Ð´Ð¸Ð½Ð³': 'Молдинг',
  'Ð¡ÑÐµÐºÐ»Ð¾': 'Стекло',
  'Ð¤ÑÐ½Ð¸ÑÑÑÐ°': 'Фурнитура',
  'ÐÐ¾Ð¼Ð¿Ð»ÐµÐºÑ': 'Комплект',
  'ÐÐ°Ð³Ð½Ð¸ÑÐ½ÑÐ¹': 'Магнитный',
  'ÐÐµÑÐ°Ð½Ð¸ÑÐµÑÐºÐ¸Ð¹': 'Механический',
  'Ð¡ÑÐ°Ð»Ñ': 'Сталь',
  'ÐÐ¸ÐºÐµÐ»Ñ': 'Никель',
  'ÐÐ°ÑÑÑÐ½Ñ': 'Латунь',
  'ÐÐµÑÐ¶Ð°Ð²ÐµÑÑÐ°Ñ ÑÑÐ°Ð»Ñ': 'Нержавеющая сталь'
};

async function fixEncodingComprehensive() {
  console.log('🔧 Начинаем комплексное исправление кодировки...');
  
  try {
    // Получаем ВСЕ товары
    const products = await prisma.product.findMany({
      select: {
        id: true,
        properties_data: true,
        specifications: true,
        name: true,
        description: true
      }
    });

    console.log(`📦 Найдено ${products.length} товаров для проверки`);

    let fixedCount = 0;
    let totalFieldsFixed = 0;

    for (const product of products) {
      let hasChanges = false;
      const updates = {};

      // Проверяем каждое поле на кодировку
      const fieldsToCheck = [
        'properties_data',
        'specifications', 
        'name',
        'description'
      ];

      for (const field of fieldsToCheck) {
        if (product[field] && typeof product[field] === 'string') {
          let fixedValue = product[field];
          let fieldFixed = false;

          // Применяем все исправления кодировки
          for (const [wrong, correct] of Object.entries(encodingMap)) {
            if (fixedValue.includes(wrong)) {
              fixedValue = fixedValue.replace(new RegExp(wrong, 'g'), correct);
              fieldFixed = true;
            }
          }

          // Если поле изменилось, добавляем в обновления
          if (fieldFixed) {
            updates[field] = fixedValue;
            hasChanges = true;
            totalFieldsFixed++;
          }
        }
      }

      // Если есть изменения, обновляем товар
      if (hasChanges) {
        await prisma.product.update({
          where: { id: product.id },
          data: updates
        });
        fixedCount++;
        
        if (fixedCount % 100 === 0) {
          console.log(`✅ Обработано ${fixedCount} товаров...`);
        }
      }
    }

    console.log(`✅ Исправлено ${fixedCount} товаров, ${totalFieldsFixed} полей`);
    
    // Проверяем результат - ищем товары с правильной кодировкой
    const testProducts = await prisma.product.findMany({
      where: {
        OR: [
          { properties_data: { contains: 'Современная' } },
          { properties_data: { contains: 'Неоклассика' } },
          { properties_data: { contains: 'Классика' } },
          { properties_data: { contains: 'ПВХ' } },
          { properties_data: { contains: 'Белый' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        properties_data: true,
        name: true
      }
    });

    console.log('🔍 Проверка результата:');
    testProducts.forEach(product => {
      try {
        const props = JSON.parse(product.properties_data);
        console.log(`  - Товар ${product.id}:`);
        console.log(`    Название: "${product.name}"`);
        console.log(`    Стиль: "${props['Domeo_Стиль Web'] || 'не найден'}"`);
        console.log(`    Категория: "${props['Категория'] || 'не найдена'}"`);
        console.log(`    Материал: "${props['Общее_Тип покрытия'] || 'не найден'}"`);
        console.log(`    Цвет: "${props['Domeo_Цвет'] || 'не найден'}"`);
        console.log('    ---');
      } catch (e) {
        console.log(`  - Товар ${product.id}: ошибка парсинга JSON`);
      }
    });

    // Статистика по исправленным значениям
    console.log('\n📊 Статистика исправлений:');
    for (const [wrong, correct] of Object.entries(encodingMap)) {
      const count = await prisma.product.count({
        where: {
          OR: [
            { properties_data: { contains: correct } },
            { specifications: { contains: correct } },
            { name: { contains: correct } },
            { description: { contains: correct } }
          ]
        }
      });
      console.log(`  ${correct}: ${count} товаров`);
    }

  } catch (error) {
    console.error('❌ Ошибка при исправлении кодировки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEncodingComprehensive();
