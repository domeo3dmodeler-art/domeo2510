const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCanonicalTemplate() {
  try {
    console.log('🚀 Создаем канонический шаблон для межкомнатных дверей...');
    
    const categoryId = 'cmg50xcgs001cv7mn0tdyk1wo';
    
    // Проверяем существующий шаблон
    const existingTemplate = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: categoryId }
    });
    
    if (existingTemplate) {
      console.log('⚠️ Шаблон уже существует, обновляем...');
      
      // Обновляем существующий шаблон
      const updatedTemplate = await prisma.importTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          name: 'Канонический шаблон межкомнатных дверей',
          description: 'Единый шаблон для импорта межкомнатных дверей без маппинга',
          required_fields: JSON.stringify([
            'Артикул поставщика',
            'Название',
            'Цена ррц (включая цену полотна, короба, наличников, доборов)',
            'Domeo_Название модели для Web',
            'Domeo_Стиль Web',
            'Общее_Тип покрытия',
            'Domeo_Цвет',
            'Ширина/мм',
            'Высота/мм'
          ]),
          calculator_fields: JSON.stringify([
            'Domeo_Название модели для Web',
            'Domeo_Стиль Web',
            'Общее_Тип покрытия',
            'Domeo_Цвет',
            'Ширина/мм',
            'Высота/мм',
            'Тип открывания',
            'Кромка',
            'Молдинг',
            'Стекло'
          ]),
          export_fields: JSON.stringify([
            'Артикул поставщика',
            'Название',
            'Цена ррц (включая цену полотна, короба, наличников, доборов)',
            'Domeo_Название модели для Web',
            'Domeo_Стиль Web',
            'Общее_Тип покрытия',
            'Domeo_Цвет',
            'Ширина/мм',
            'Высота/мм',
            'Толщина/мм',
            'Ед.изм.',
            'Склад/заказ',
            'Наименование поставщика',
            'Поставщик',
            'Тип открывания',
            'Кромка',
            'Стоимость надбавки за кромку',
            'Молдинг',
            'Стекло',
            'Domeo_наименование фурнитуры_1С',
            'Наименование для Web',
            'Описание комплекта для Web',
            'Ценовая группа',
            'photos'
          ]),
          template_config: JSON.stringify({
            version: '2.0',
            type: 'canonical',
            mapping_required: false,
            strict_field_matching: true,
            description: 'Канонический шаблон для межкомнатных дверей. Поля в Excel файле должны точно совпадать с полями шаблона.'
          }),
          field_mappings: JSON.stringify({}), // Пустой маппинг - поля должны совпадать
          validation_rules: JSON.stringify({
            required_fields: [
              'Артикул поставщика',
              'Название',
              'Цена ррц (включая цену полотна, короба, наличников, доборов)'
            ],
            price_fields: [
              'Цена ррц (включая цену полотна, короба, наличников, доборов)'
            ],
            dimension_fields: [
              'Ширина/мм',
              'Высота/мм',
              'Толщина/мм'
            ],
            photo_fields: [
              'photos'
            ]
          }),
          updated_at: new Date()
        }
      });
      
      console.log('✅ Шаблон обновлен:', updatedTemplate.id);
      
    } else {
      console.log('📝 Создаем новый шаблон...');
      
      // Создаем новый шаблон
      const newTemplate = await prisma.importTemplate.create({
        data: {
          catalog_category_id: categoryId,
          name: 'Канонический шаблон межкомнатных дверей',
          description: 'Единый шаблон для импорта межкомнатных дверей без маппинга',
          required_fields: JSON.stringify([
            'Артикул поставщика',
            'Название',
            'Цена ррц (включая цену полотна, короба, наличников, доборов)',
            'Domeo_Название модели для Web',
            'Domeo_Стиль Web',
            'Общее_Тип покрытия',
            'Domeo_Цвет',
            'Ширина/мм',
            'Высота/мм'
          ]),
          calculator_fields: JSON.stringify([
            'Domeo_Название модели для Web',
            'Domeo_Стиль Web',
            'Общее_Тип покрытия',
            'Domeo_Цвет',
            'Ширина/мм',
            'Высота/мм',
            'Тип открывания',
            'Кромка',
            'Молдинг',
            'Стекло'
          ]),
          export_fields: JSON.stringify([
            'Артикул поставщика',
            'Название',
            'Цена ррц (включая цену полотна, короба, наличников, доборов)',
            'Domeo_Название модели для Web',
            'Domeo_Стиль Web',
            'Общее_Тип покрытия',
            'Domeo_Цвет',
            'Ширина/мм',
            'Высота/мм',
            'Толщина/мм',
            'Ед.изм.',
            'Склад/заказ',
            'Наименование поставщика',
            'Поставщик',
            'Тип открывания',
            'Кромка',
            'Стоимость надбавки за кромку',
            'Молдинг',
            'Стекло',
            'Domeo_наименование фурнитуры_1С',
            'Наименование для Web',
            'Описание комплекта для Web',
            'Ценовая группа',
            'photos'
          ]),
          template_config: JSON.stringify({
            version: '2.0',
            type: 'canonical',
            mapping_required: false,
            strict_field_matching: true,
            description: 'Канонический шаблон для межкомнатных дверей. Поля в Excel файле должны точно совпадать с полями шаблона.'
          }),
          field_mappings: JSON.stringify({}), // Пустой маппинг - поля должны совпадать
          validation_rules: JSON.stringify({
            required_fields: [
              'Артикул поставщика',
              'Название',
              'Цена ррц (включая цену полотна, короба, наличников, доборов)'
            ],
            price_fields: [
              'Цена ррц (включая цену полотна, короба, наличников, доборов)'
            ],
            dimension_fields: [
              'Ширина/мм',
              'Высота/мм',
              'Толщина/мм'
            ],
            photo_fields: [
              'photos'
            ]
          }),
          is_active: true
        }
      });
      
      console.log('✅ Новый шаблон создан:', newTemplate.id);
    }
    
    // Проверяем результат
    const finalTemplate = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: categoryId },
      include: {
        catalog_category: {
          select: { name: true }
        }
      }
    });
    
    console.log('📋 Финальный шаблон:');
    console.log('  ID:', finalTemplate?.id);
    console.log('  Название:', finalTemplate?.name);
    console.log('  Категория:', finalTemplate?.catalog_category?.name);
    console.log('  Обязательные поля:', JSON.parse(finalTemplate?.required_fields || '[]'));
    console.log('  Поля калькулятора:', JSON.parse(finalTemplate?.calculator_fields || '[]'));
    console.log('  Поля экспорта:', JSON.parse(finalTemplate?.export_fields || '[]'));
    
    console.log('🎉 Канонический шаблон успешно создан/обновлен!');
    
  } catch (error) {
    console.error('❌ Ошибка создания шаблона:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCanonicalTemplate();
