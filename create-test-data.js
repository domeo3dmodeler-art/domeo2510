const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🔧 Создаем тестовые данные...');
    
    // Создаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.create({
      data: {
        name: 'Межкомнатные двери',
        path: '/doors',
        level: 0,
        sort_order: 1,
        is_active: true,
        products_count: 0
      }
    });
    
    console.log(`✅ Создана категория: ${category.name} (ID: ${category.id})`);
    
    // Создаем шаблон импорта для этой категории
    const template = await prisma.importTemplate.create({
      data: {
        catalog_category_id: category.id,
        name: 'Шаблон для дверей',
        description: 'Тестовый шаблон для экспорта Excel',
        required_fields: JSON.stringify(['Модель', 'Цвет', 'Ширина', 'Высота']),
        calculator_fields: JSON.stringify(['Цена опт', 'Цена РРЦ']),
        export_fields: JSON.stringify([
          'Цена опт',
          'Цена РРЦ', 
          'Поставщик',
          'Наименование двери у поставщика',
          'Тип покрытия',
          'Ширина/мм',
          'Высота/мм', 
          'Толщина/мм',
          'Фабрика_Цвет/Отделка',
          'SKU внутреннее',
          'Артикул поставщика'
        ]),
        is_active: true
      }
    });
    
    console.log(`✅ Создан шаблон: ${template.name} (ID: ${template.id})`);
    
    console.log('🎉 Тестовые данные созданы успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
