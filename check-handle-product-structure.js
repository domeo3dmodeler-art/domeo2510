const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== СТРУКТУРА ТОВАРОВ РУЧЕК ===\n');
    
    const handleProducts = await prisma.product.findMany({
      where: {
        catalog_category_id: 'cmg50xchb001wv7mnbzhw5y9r'
      },
      select: {
        sku: true,
        name: true,
        properties_data: true
      },
      take: 3
    });
    
    handleProducts.forEach(p => {
      console.log(`\nSKU: ${p.sku}`);
      console.log(`Имя: ${p.name}`);
      
      try {
        const props = typeof p.properties_data === 'string' 
          ? JSON.parse(p.properties_data) 
          : p.properties_data;
        
        console.log('Свойства:');
        Object.keys(props).forEach(key => {
          console.log(`  ${key}: ${props[key]}`);
        });
      } catch (e) {
        console.log(`  Ошибка парсинга`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
