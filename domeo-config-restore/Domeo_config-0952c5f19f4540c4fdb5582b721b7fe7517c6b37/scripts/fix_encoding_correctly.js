const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixEncodingCorrectly() {
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
        
        // Исправляем название поля - убираем невидимые символы
        let fixedField = originalField;
        
        // Убираем невидимые символы и исправляем кодировку
        fixedField = fixedField.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Убираем невидимые символы
        fixedField = fixedField.replace(/\u00A0/g, ' '); // Заменяем неразрывные пробелы
        
        // Исправляем значение - убираем невидимые символы
        let fixedValue = originalValue;
        if (typeof fixedValue === 'string') {
          fixedValue = fixedValue.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Убираем невидимые символы
          fixedValue = fixedValue.replace(/\u00A0/g, ' '); // Заменяем неразрывные пробелы
        }
        
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
      
      // Исправляем поля в шаблоне - убираем невидимые символы
      requiredFields = requiredFields.map(field => {
        let fixedField = field;
        fixedField = fixedField.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Убираем невидимые символы
        fixedField = fixedField.replace(/\u00A0/g, ' '); // Заменяем неразрывные пробелы
        return fixedField;
      });
      
      // Исправляем название и описание шаблона
      let fixedName = template.name;
      if (typeof fixedName === 'string') {
        fixedName = fixedName.replace(/[\u200B-\u200D\uFEFF]/g, '');
        fixedName = fixedName.replace(/\u00A0/g, ' ');
      }
      
      let fixedDescription = template.description || '';
      if (typeof fixedDescription === 'string') {
        fixedDescription = fixedDescription.replace(/[\u200B-\u200D\uFEFF]/g, '');
        fixedDescription = fixedDescription.replace(/\u00A0/g, ' ');
      }
      
      if (JSON.stringify(originalFields) !== JSON.stringify(requiredFields) || 
          template.name !== fixedName || 
          template.description !== fixedDescription) {
        await prisma.importTemplate.update({
          where: { id: template.id },
          data: {
            required_fields: JSON.stringify(requiredFields),
            name: fixedName,
            description: fixedDescription
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

fixEncodingCorrectly();
