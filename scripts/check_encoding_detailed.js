const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEncoding() {
  try {
    const template = await prisma.importTemplate.findFirst({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    if (template) {
      console.log('=== ПРОВЕРКА КОДИРОВКИ В БАЗЕ ДАННЫХ ===');
      console.log('ID:', template.id);
      console.log('Name:', template.name);
      console.log('Name length:', template.name.length);
      console.log('Name bytes:', Buffer.from(template.name, 'utf8'));
      console.log('Required fields:', template.required_fields);
      console.log('Required fields length:', template.required_fields.length);
      
      // Проверим первые несколько символов
      const nameChars = template.name.split('');
      console.log('\nFirst 10 characters of name:');
      nameChars.slice(0, 10).forEach((char, i) => {
        console.log(`  ${i}: '${char}' (code: ${char.charCodeAt(0)})`);
      });
      
      // Проверим required_fields
      try {
        const fields = JSON.parse(template.required_fields);
        console.log('\nFirst 5 fields:');
        fields.slice(0, 5).forEach((field, i) => {
          console.log(`  ${i}: '${field}' (length: ${field.length})`);
          const fieldChars = field.split('');
          console.log(`    First 3 chars: ${fieldChars.slice(0, 3).map(c => `'${c}'`).join(', ')}`);
          console.log(`    Char codes: ${fieldChars.slice(0, 3).map(c => c.charCodeAt(0)).join(', ')}`);
        });
      } catch (e) {
        console.log('Error parsing required_fields:', e.message);
      }
    } else {
      console.log('Template not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEncoding();
