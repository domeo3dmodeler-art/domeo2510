const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    if (template) {
      console.log('=== TEMPLATE DATA ===');
      console.log('ID:', template.id);
      console.log('Name:', template.name);
      console.log('Description:', template.description);
      console.log('');
      console.log('=== REQUIRED FIELDS ===');
      console.log('Raw:', template.required_fields);
      console.log('Parsed:', JSON.parse(template.required_fields || '[]'));
      console.log('');
      console.log('=== CALCULATOR FIELDS ===');
      console.log('Raw:', template.calculator_fields);
      console.log('Parsed:', JSON.parse(template.calculator_fields || '[]'));
      console.log('');
      console.log('=== EXPORT FIELDS ===');
      console.log('Raw:', template.export_fields);
      console.log('Parsed:', JSON.parse(template.export_fields || '[]'));
    } else {
      console.log('Template not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();