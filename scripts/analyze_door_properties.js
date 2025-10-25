const { PrismaClient } = require('@prisma/client');

// Простая функция исправления кодировки
function fixFieldsEncoding(fields) {
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
    '???????????': 'Поставщик'
  };

  const fixedFields = [];
  const usedMappings = new Set();

  fields.forEach(field => {
    if (CORRUPTED_FIELD_MAPPINGS[field]) {
      if (Array.isArray(CORRUPTED_FIELD_MAPPINGS[field])) {
        // Для полей с несколькими вариантами (например, размеры)
        CORRUPTED_FIELD_MAPPINGS[field].forEach((mapping, index) => {
          const mappingKey = `${field}_${index}`;
          if (!usedMappings.has(mappingKey)) {
            fixedFields.push(mapping);
            usedMappings.add(mappingKey);
          }
        });
      } else {
        fixedFields.push(CORRUPTED_FIELD_MAPPINGS[field]);
      }
    } else {
      fixedFields.push(field);
    }
  });

  return [...new Set(fixedFields)]; // Убираем дубликаты
}

const prisma = new PrismaClient();

async function analyzeDoorProperties() {
  try {
    console.log('🔍 Анализируем свойства товаров в базе данных...\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    console.log(`📂 Категория: ${category.name} (ID: ${category.id})\n`);

    // Получаем шаблон для этой категории
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: category.id }
    });

    if (!template) {
      console.log('❌ Шаблон для категории не найден');
      return;
    }

    // Получаем поля из шаблона
    let requiredFields = JSON.parse(template.required_fields || '[]');
    requiredFields = fixFieldsEncoding(requiredFields);
    
    console.log('📋 Поля шаблона:');
    requiredFields.forEach((field, index) => {
      console.log(`  ${index + 1}. ${field}`);
    });
    console.log('');

    // Получаем все товары категории
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true
      },
      take: 100 // Анализируем первые 100 товаров
    });

    console.log(`📦 Найдено товаров для анализа: ${products.length}\n`);

    // Анализируем каждое поле шаблона
    const fieldAnalysis = {};

    requiredFields.forEach(field => {
      fieldAnalysis[field] = {
        totalProducts: 0,
        hasValue: 0,
        emptyValue: 0,
        uniqueValues: new Set(),
        sampleValues: [],
        inconsistencies: []
      };
    });

    // Проходим по каждому товару
    products.forEach((product, productIndex) => {
      if (!product.properties_data) return;

      let properties;
      try {
        properties = typeof product.properties_data === 'string' 
          ? JSON.parse(product.properties_data) 
          : product.properties_data;
      } catch (e) {
        console.log(`❌ Ошибка парсинга properties_data для товара ${product.id}`);
        return;
      }

      // Анализируем каждое поле шаблона
      requiredFields.forEach(field => {
        fieldAnalysis[field].totalProducts++;
        
        let value = properties[field];
        
        if (value === undefined || value === null || value === '') {
          fieldAnalysis[field].emptyValue++;
        } else {
          fieldAnalysis[field].hasValue++;
          fieldAnalysis[field].uniqueValues.add(String(value));
          
          // Сохраняем примеры значений (первые 5)
          if (fieldAnalysis[field].sampleValues.length < 5) {
            fieldAnalysis[field].sampleValues.push(String(value));
          }
        }
      });
    });

    // Выводим анализ по каждому полю
    console.log('📊 АНАЛИЗ ПОЛЕЙ:');
    console.log('='.repeat(80));

    requiredFields.forEach((field, index) => {
      const analysis = fieldAnalysis[field];
      const fillRate = ((analysis.hasValue / analysis.totalProducts) * 100).toFixed(1);
      
      console.log(`\n${index + 1}. ${field}`);
      console.log(`   📈 Заполненность: ${analysis.hasValue}/${analysis.totalProducts} (${fillRate}%)`);
      console.log(`   🔢 Уникальных значений: ${analysis.uniqueValues.size}`);
      
      if (analysis.sampleValues.length > 0) {
        console.log(`   📝 Примеры значений:`);
        analysis.sampleValues.forEach(value => {
          console.log(`      - "${value}"`);
        });
      }

      // Анализируем несоответствия
      if (analysis.uniqueValues.size > 0) {
        console.log(`   🔍 Анализ значений:`);
        
        // Проверяем на пустые строки
        const emptyStrings = Array.from(analysis.uniqueValues).filter(v => v.trim() === '');
        if (emptyStrings.length > 0) {
          console.log(`      ⚠️  Найдены пустые строки: ${emptyStrings.length}`);
        }

        // Проверяем на числовые значения
        const numericValues = Array.from(analysis.uniqueValues).filter(v => !isNaN(Number(v)) && v.trim() !== '');
        if (numericValues.length > 0) {
          console.log(`      🔢 Числовые значения: ${numericValues.length}`);
          const numbers = numericValues.map(v => Number(v));
          console.log(`         Минимум: ${Math.min(...numbers)}`);
          console.log(`         Максимум: ${Math.max(...numbers)}`);
        }

        // Проверяем на дубликаты (если много одинаковых значений)
        const valueCounts = {};
        Array.from(analysis.uniqueValues).forEach(value => {
          valueCounts[value] = (valueCounts[value] || 0) + 1;
        });
        
        const duplicates = Object.entries(valueCounts).filter(([value, count]) => count > 1);
        if (duplicates.length > 0) {
          console.log(`      🔄 Дублирующиеся значения:`);
          duplicates.slice(0, 5).forEach(([value, count]) => {
            console.log(`         "${value}": ${count} раз`);
          });
        }

        // Проверяем на странные символы
        const weirdValues = Array.from(analysis.uniqueValues).filter(v => 
          v.includes('?') || v.includes('�') || v.length > 100
        );
        if (weirdValues.length > 0) {
          console.log(`      ⚠️  Подозрительные значения: ${weirdValues.length}`);
          weirdValues.slice(0, 3).forEach(value => {
            console.log(`         "${value}"`);
          });
        }
      }
    });

    // Общий анализ
    console.log('\n\n📈 ОБЩАЯ СТАТИСТИКА:');
    console.log('='.repeat(80));
    
    const totalFields = requiredFields.length;
    const wellFilledFields = requiredFields.filter(field => {
      const analysis = fieldAnalysis[field];
      return (analysis.hasValue / analysis.totalProducts) > 0.8;
    });
    
    const poorlyFilledFields = requiredFields.filter(field => {
      const analysis = fieldAnalysis[field];
      return (analysis.hasValue / analysis.totalProducts) < 0.3;
    });

    console.log(`📊 Всего полей: ${totalFields}`);
    console.log(`✅ Хорошо заполненных (>80%): ${wellFilledFields.length}`);
    console.log(`❌ Плохо заполненных (<30%): ${poorlyFilledFields.length}`);

    if (poorlyFilledFields.length > 0) {
      console.log('\n❌ ПЛОХО ЗАПОЛНЕННЫЕ ПОЛЯ:');
      poorlyFilledFields.forEach(field => {
        const analysis = fieldAnalysis[field];
        const fillRate = ((analysis.hasValue / analysis.totalProducts) * 100).toFixed(1);
        console.log(`   - ${field}: ${fillRate}%`);
      });
    }

    // Рекомендации
    console.log('\n\n💡 РЕКОМЕНДАЦИИ:');
    console.log('='.repeat(80));
    
    if (poorlyFilledFields.length > 0) {
      console.log('1. Проверить импорт данных для плохо заполненных полей');
      console.log('2. Убедиться, что названия полей в файле импорта соответствуют шаблону');
    }
    
    console.log('3. Проверить кодировку данных при импорте');
    console.log('4. Убедиться, что все обязательные поля заполняются');

  } catch (error) {
    console.error('❌ Ошибка при анализе:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDoorProperties();
