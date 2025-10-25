const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEncodingInDatabase() {
  const categoryId = 'cmg50xcgs001cv7mn0tdyk1wo';

  try {
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: categoryId },
    });

    if (!template) {
      console.log('❌ Шаблон не найден');
      return;
    }

    console.log('📋 Проверка кодировки в базе данных:');
    console.log('📋 Название шаблона:', template.name);
    console.log('📋 Required fields (raw):', template.required_fields);
    
    const requiredFields = JSON.parse(template.required_fields || '[]');
    console.log('📋 Required fields (parsed):', requiredFields);
    
    // Проверяем кодировку каждого поля
    console.log('\n📋 Проверка кодировки полей:');
    requiredFields.forEach((field, index) => {
      console.log(`${index + 1}. "${field}" (длина: ${field.length})`);
      
      // Проверяем есть ли проблемы с кодировкой
      const hasEncodingIssues = field.includes('?') || field.includes('�');
      if (hasEncodingIssues) {
        console.log(`   ❌ Проблемы с кодировкой обнаружены`);
      } else {
        console.log(`   ✅ Кодировка в порядке`);
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке кодировки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEncodingInDatabase();
