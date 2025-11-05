const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFixTemplate() {
  try {
    const categoryId = 'cmg50xcgs001cv7mn0tdyk1wo'; // ID для "Межкомнатные двери"
    
    // Проверяем текущий шаблон
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: categoryId }
    });
    
    if (template) {
      console.log('=== ТЕКУЩИЙ ШАБЛОН ===');
      console.log('ID:', template.id);
      console.log('Name:', template.name);
      console.log('Description:', template.description);
      console.log('');
      console.log('Required fields:', template.required_fields);
      console.log('Calculator fields:', template.calculator_fields);
      console.log('Export fields:', template.export_fields);
      console.log('');
      
      // Парсим поля
      const requiredFields = JSON.parse(template.required_fields || '[]');
      const calculatorFields = JSON.parse(template.calculator_fields || '[]');
      const exportFields = JSON.parse(template.export_fields || '[]');
      
      console.log('Parsed required fields:', requiredFields);
      console.log('Parsed calculator fields:', calculatorFields);
      console.log('Parsed export fields:', exportFields);
      
      // Если поля пустые или содержат только базовые поля, обновляем шаблон
      if (requiredFields.length <= 4 || calculatorFields.length <= 4) {
        console.log('\n=== ОБНОВЛЯЕМ ШАБЛОН ===');
        
        const fullRequiredFields = [
          'SKU', 'Name', 'Price', 'StockQuantity', 'Артикул поставщика',
          'Domeo_Название модели для Web', 'Domeo_Стиль Web', 'Общее_Тип покрытия', 'Domeo_Цвет'
        ];
        
        const fullCalculatorFields = [
          'SKU', 'Name', 'Price', 'StockQuantity', 'Артикул поставщика',
          'Domeo_Название модели для Web', 'Ширина/мм', 'Высота/мм', 'Толщина/мм',
          'Общее_Тип покрытия', 'Domeo_Цвет', 'Domeo_Стиль Web', 'Тип конструкции',
          'Тип открывания', 'Поставщик', 'Ед.изм.', 'Склад/заказ', 'Цена опт',
          'Кромка', 'Стоимость надбавки за кромку', 'Молдинг', 'Стекло',
          'Фабрика_Коллекция', 'Фабрика_Цвет/Отделка', 'photos'
        ];
        
        const fullExportFields = [
          'SKU', 'Name', 'Price', 'StockQuantity', 'Артикул поставщика',
          'Domeo_Название модели для Web', 'Ширина/мм', 'Высота/мм', 'Толщина/мм',
          'Общее_Тип покрытия', 'Domeo_Цвет', 'Domeo_Стиль Web', 'Тип конструкции',
          'Тип открывания', 'Поставщик', 'Ед.изм.', 'Склад/заказ', 'Цена опт',
          'Кромка', 'Стоимость надбавки за кромку', 'Молдинг', 'Стекло',
          'Фабрика_Коллекция', 'Фабрика_Цвет/Отделка', 'photos'
        ];
        
        const updatedTemplate = await prisma.importTemplate.update({
          where: { id: template.id },
          data: {
            name: 'Полный шаблон для Межкомнатные двери',
            description: 'Обновленный шаблон с полным набором полей для межкомнатных дверей',
            required_fields: JSON.stringify(fullRequiredFields),
            calculator_fields: JSON.stringify(fullCalculatorFields),
            export_fields: JSON.stringify(fullExportFields),
            template_config: JSON.stringify({
              headers: fullCalculatorFields,
              requiredFields: fullRequiredFields,
              fieldMappings: {}
            }),
            updated_at: new Date(),
          },
        });
        
        console.log('✅ Шаблон успешно обновлен!');
        console.log('Новые обязательные поля:', fullRequiredFields.length);
        console.log('Новые поля калькулятора:', fullCalculatorFields.length);
        console.log('Новые поля экспорта:', fullExportFields.length);
      } else {
        console.log('✅ Шаблон уже содержит полный набор полей');
      }
    } else {
      console.log('❌ Шаблон не найден для категории');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixTemplate();
