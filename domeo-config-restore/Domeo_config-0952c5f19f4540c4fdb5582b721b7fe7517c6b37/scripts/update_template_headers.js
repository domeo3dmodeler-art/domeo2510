const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTemplateWithCorrectHeaders() {
  try {
    console.log('🔧 Обновляем шаблон с правильными заголовками...');
    
    const categoryId = 'cmg50xcgs001cv7mn0tdyk1wo';
    
    // Заголовки, соответствующие названиям свойств в БД
    const correctHeaders = [
      'SKU',                    // Системное поле
      'Name',                   // Системное поле  
      'Price',                  // Системное поле
      'StockQuantity',          // Системное поле
      'Артикул поставщика',     // Основной артикул
      'Domeo_Название модели для Web',  // Модель
      'Ширина/мм',             // Размер
      'Высота/мм',             // Размер
      'Толщина/мм',            // Размер
      'Общее_Тип покрытия',     // Покрытие
      'Domeo_Цвет',            // Цвет
      'Domeo_Стиль Web',       // Стиль
      'Тип конструкции',       // Дополнительно
      'Тип открывания',         // Дополнительно
      'Поставщик',             // Дополнительно
      'Ед.изм.',               // Единица измерения
      'Склад/заказ',           // Наличие
      'Цена опт',              // Цена
      'Кромка',                // Дополнительно
      'Стоимость надбавки за кромку', // Дополнительно
      'Молдинг',               // Дополнительно
      'Стекло',                // Дополнительно
      'Фабрика_Коллекция',     // Дополнительно
      'Фабрика_Цвет/Отделка',  // Дополнительно
      'photos'                 // Фото
    ];
    
    const requiredFields = ['SKU', 'Name', 'Price', 'Артикул поставщика', 'Domeo_Название модели для Web'];
    
    const templateConfig = {
      headers: correctHeaders,
      requiredFields: requiredFields,
      fieldMappings: {} // Убираем маппинг - поля должны совпадать
    };
    
    // Обновляем шаблон
    const existingTemplate = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: categoryId }
    });
    
    if (existingTemplate) {
      await prisma.importTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          name: 'Канонический шаблон для Межкомнатные двери (обновленный)',
          description: 'Обновленный шаблон с заголовками, соответствующими названиям свойств в БД',
          required_fields: JSON.stringify(requiredFields),
          calculator_fields: JSON.stringify(correctHeaders),
          export_fields: JSON.stringify(correctHeaders),
          template_config: JSON.stringify(templateConfig),
          field_mappings: JSON.stringify({}), // Очищаем маппинг
          updated_at: new Date()
        }
      });
      console.log('✅ Шаблон обновлен');
    } else {
      await prisma.importTemplate.create({
        data: {
          catalog_category_id: categoryId,
          name: 'Канонический шаблон для Межкомнатные двери',
          description: 'Шаблон с заголовками, соответствующими названиям свойств в БД',
          required_fields: JSON.stringify(requiredFields),
          calculator_fields: JSON.stringify(correctHeaders),
          export_fields: JSON.stringify(correctHeaders),
          template_config: JSON.stringify(templateConfig),
          field_mappings: JSON.stringify({})
        }
      });
      console.log('✅ Шаблон создан');
    }
    
    console.log('\n📋 Обновленные заголовки шаблона:');
    correctHeaders.forEach((header, index) => {
      const isRequired = requiredFields.includes(header);
      console.log(`  ${index + 1}. ${header}${isRequired ? ' (обязательное)' : ''}`);
    });
    
    console.log('\n🎯 Для нового формата SKU:');
    console.log('Формат: [Модель]-[Размер]-[Покрытие]-[Цвет]-[Номер]');
    console.log('Пример: DomeoDoors_Base_1-600x2000-ПВХ-Белый-001');
    console.log('\nПоля для составления SKU:');
    console.log('- Модель: Domeo_Название модели для Web');
    console.log('- Размер: Ширина/мм x Высота/мм');
    console.log('- Покрытие: Общее_Тип покрытия');
    console.log('- Цвет: Domeo_Цвет');
    console.log('- Номер: нужно добавить поле "Номер варианта" или использовать существующее');
    
    console.log('\n💡 Рекомендации:');
    console.log('1. ✅ Теперь заголовки шаблона соответствуют названиям свойств в БД');
    console.log('2. ✅ Маппинг убран - поля должны точно совпадать');
    console.log('3. ⚠️ Для уникальности SKU нужно добавить поле "Номер варианта"');
    console.log('4. 📝 Или использовать существующие поля для создания уникальных комбинаций');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplateWithCorrectHeaders();
