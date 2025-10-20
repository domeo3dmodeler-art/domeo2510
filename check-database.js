const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Проверяем состояние базы данных...');
    
    // Проверяем все основные таблицы
    const tables = [
      'catalogCategory',
      'product', 
      'importTemplate',
      'client',
      'quote',
      'invoice',
      'order',
      'supplierOrder'
    ];
    
    for (const table of tables) {
      try {
        const count = await prisma[table].count();
        console.log(`📊 ${table}: ${count} записей`);
      } catch (error) {
        console.log(`❌ ${table}: ошибка - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
