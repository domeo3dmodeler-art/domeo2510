const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTablesEncoding() {
  try {
    console.log('=== ПРОВЕРКА КОДИРОВКИ ВО ВСЕХ ТАБЛИЦАХ ===');
    
    // 1. Проверяем importTemplate
    console.log('\n📋 IMPORT TEMPLATE:');
    const templates = await prisma.importTemplate.findMany({
      take: 3
    });
    
    templates.forEach((template, i) => {
      console.log(`  ${i + 1}. ID: ${template.id}`);
      console.log(`     Name: "${template.name}"`);
      console.log(`     Name has question marks: ${template.name.includes('?')}`);
      
      try {
        const fields = JSON.parse(template.required_fields || '[]');
        const hasCorruptedFields = fields.some(field => field.includes('?'));
        console.log(`     Fields corrupted: ${hasCorruptedFields}`);
        if (hasCorruptedFields) {
          console.log(`     First corrupted field: "${fields.find(f => f.includes('?'))}"`);
        }
      } catch (e) {
        console.log(`     Error parsing fields: ${e.message}`);
      }
    });
    
    // 2. Проверяем catalogCategory
    console.log('\n📂 CATALOG CATEGORY:');
    const categories = await prisma.catalogCategory.findMany({
      take: 5,
      where: {
        name: {
          contains: 'двер'
        }
      }
    });
    
    categories.forEach((category, i) => {
      console.log(`  ${i + 1}. ID: ${category.id}`);
      console.log(`     Name: "${category.name}"`);
      console.log(`     Name has question marks: ${category.name.includes('?')}`);
    });
    
    // 3. Проверяем product
    console.log('\n🛍️ PRODUCT:');
    const products = await prisma.product.findMany({
      take: 3,
      where: {
        OR: [
          { name: { contains: 'двер' } },
          { sku: { contains: 'двер' } }
        ]
      }
    });
    
    products.forEach((product, i) => {
      console.log(`  ${i + 1}. ID: ${product.id}`);
      console.log(`     Name: "${product.name}"`);
      console.log(`     SKU: "${product.sku}"`);
      console.log(`     Name has question marks: ${product.name.includes('?')}`);
      console.log(`     SKU has question marks: ${product.sku.includes('?')}`);
    });
    
    // 4. Проверяем productProperty
    console.log('\n🏷️ PRODUCT PROPERTY:');
    const properties = await prisma.productProperty.findMany({
      take: 5,
      where: {
        OR: [
          { name: { contains: 'двер' } },
          { value: { contains: 'двер' } }
        ]
      }
    });
    
    properties.forEach((property, i) => {
      console.log(`  ${i + 1}. ID: ${property.id}`);
      console.log(`     Name: "${property.name}"`);
      console.log(`     Value: "${property.value}"`);
      console.log(`     Name has question marks: ${property.name.includes('?')}`);
      console.log(`     Value has question marks: ${property.value.includes('?')}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при проверке кодировки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTablesEncoding();
