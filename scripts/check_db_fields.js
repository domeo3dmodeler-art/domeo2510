const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDB() {
  try {
    const template = await prisma.importTemplate.findFirst({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    if (template) {
      const fields = JSON.parse(template.required_fields);
      console.log('Поля в БД:');
      fields.forEach((field, i) => {
        console.log(`  ${i + 1}: "${field}"`);
      });
      
      // Проверяем дубликаты
      const uniqueFields = [...new Set(fields)];
      console.log(`\nВсего полей: ${fields.length}`);
      console.log(`Уникальных полей: ${uniqueFields.length}`);
      console.log(`Дубликатов: ${fields.length - uniqueFields.length}`);
      
      if (fields.length !== uniqueFields.length) {
        console.log('\nДубликаты:');
        const duplicates = fields.filter((field, index) => fields.indexOf(field) !== index);
        [...new Set(duplicates)].forEach(dup => {
          console.log(`  - "${dup}"`);
        });
      }
    } else {
      console.log('Шаблон не найден');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Ошибка:', error);
    await prisma.$disconnect();
  }
}

checkDB();
