const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTemplate() {
  try {
    const categoryId = 'cmg50xcgs001cv7mn0tdyk1wo'; // ID для "Межкомнатные двери"
    
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
    
    const templateConfig = {
      headers: fullCalculatorFields,
      requiredFields: fullRequiredFields,
      calculatorFields: fullCalculatorFields,
      exportFields: fullExportFields,
      fieldMappings: {}
    };
    
    const updatedTemplate = await prisma.importTemplate.update({
      where: { catalog_category_id: categoryId },
      data: {
        name: 'Полный шаблон для Межкомнатные двери',
        description: 'Обновленный шаблон с полным набором полей для межкомнатных дверей',
        required_fields: JSON.stringify(fullRequiredFields),
        calculator_fields: JSON.stringify(fullCalculatorFields),
        export_fields: JSON.stringify(fullExportFields),
        template_config: JSON.stringify(templateConfig),
        updated_at: new Date(),
      },
    });
    
    console.log('✅ Шаблон успешно обновлен!');
    console.log('ID:', updatedTemplate.id);
    console.log('Название:', updatedTemplate.name);
    console.log('Обязательные поля:', fullRequiredFields.length);
    console.log('Поля калькулятора:', fullCalculatorFields.length);
    console.log('Поля экспорта:', fullExportFields.length);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplate();
