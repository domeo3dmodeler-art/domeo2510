const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
    });
    
    if (template) {
      console.log('Template found:');
      console.log('ID:', template.id);
      console.log('Name:', template.name);
      console.log('Required fields (raw):', template.required_fields);
      console.log('Required fields (parsed):', JSON.parse(template.required_fields || '[]'));
      console.log('Calculator fields (raw):', template.calculator_fields);
      console.log('Calculator fields (parsed):', JSON.parse(template.calculator_fields || '[]'));
      console.log('Export fields (raw):', template.export_fields);
      console.log('Export fields (parsed):', JSON.parse(template.export_fields || '[]'));
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
