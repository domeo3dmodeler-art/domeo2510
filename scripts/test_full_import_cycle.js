const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFullImportCycle() {
  try {
    console.log('=== ТЕСТИРОВАНИЕ ПОЛНОГО ЦИКЛА ИМПОРТА С ПРАВИЛЬНОЙ КОДИРОВКОЙ ===');
    
    // 1. Проверяем шаблон для "Межкомнатные двери"
    console.log('\n📋 ПРОВЕРКА ШАБЛОНА:');
    const template = await prisma.importTemplate.findFirst({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    if (template) {
      console.log(`  ✅ Шаблон найден: ${template.id}`);
      console.log(`  Название: "${template.name}"`);
      
      const fields = JSON.parse(template.required_fields || '[]');
      console.log(`  Количество полей: ${fields.length}`);
      console.log('  Первые 5 полей:');
      fields.slice(0, 5).forEach((field, i) => {
        console.log(`    ${i + 1}: "${field}"`);
        const hasCorrupted = field.includes('?');
        console.log(`       Повреждено: ${hasCorrupted}`);
      });
      
      // Проверяем, есть ли поврежденные поля
      const corruptedFields = fields.filter(field => field.includes('?'));
      if (corruptedFields.length > 0) {
        console.log(`  ❌ Найдено поврежденных полей: ${corruptedFields.length}`);
        corruptedFields.forEach(field => {
          console.log(`    - "${field}"`);
        });
      } else {
        console.log('  ✅ Все поля имеют правильную кодировку');
      }
    } else {
      console.log('  ❌ Шаблон не найден');
    }
    
    // 2. Тестируем API endpoint
    console.log('\n🌐 ТЕСТИРОВАНИЕ API:');
    try {
      const response = await fetch('http://localhost:3000/api/admin/templates?catalogCategoryId=cmg50xcgs001cv7mn0tdyk1wo');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.template) {
          console.log('  ✅ API возвращает данные');
          console.log(`  Количество полей в API: ${data.template.requiredFields.length}`);
          
          // Проверяем кодировку в API ответе
          const apiCorruptedFields = data.template.requiredFields.filter(field => field.includes('?'));
          if (apiCorruptedFields.length > 0) {
            console.log(`  ❌ API возвращает поврежденные поля: ${apiCorruptedFields.length}`);
          } else {
            console.log('  ✅ API возвращает поля с правильной кодировкой');
          }
        } else {
          console.log('  ❌ API возвращает ошибку:', data.error);
        }
      } else {
        console.log(`  ❌ API возвращает статус: ${response.status}`);
      }
    } catch (error) {
      console.log('  ❌ Ошибка при тестировании API:', error.message);
    }
    
    // 3. Тестируем скачивание шаблона
    console.log('\n📥 ТЕСТИРОВАНИЕ СКАЧИВАНИЯ ШАБЛОНА:');
    try {
      const response = await fetch('http://localhost:3000/api/admin/templates/download?catalogCategoryId=cmg50xcgs001cv7mn0tdyk1wo');
      if (response.ok) {
        console.log('  ✅ Шаблон успешно скачивается');
        console.log(`  Размер файла: ${response.headers.get('content-length')} байт`);
        console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      } else {
        console.log(`  ❌ Ошибка скачивания: ${response.status}`);
      }
    } catch (error) {
      console.log('  ❌ Ошибка при скачивании шаблона:', error.message);
    }
    
    console.log('\n✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullImportCycle();
