
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function monitorDatabase() {
  console.log('🗄️ Мониторинг базы данных...');
  
  try {
    // Проверяем размеры таблиц
    const tableStats = await prisma.$queryRaw`
      SELECT 
        name,
        (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as row_count
      FROM sqlite_master m 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `;
    
    console.log('📊 Статистика таблиц:');
    tableStats.forEach(table => {
      console.log(`   - ${table.name}: ${table.row_count} записей`);
    });
    
    // Проверяем индексы
    const indexes = await prisma.$queryRaw`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
    `;
    
    console.log(`📇 Индексов: ${indexes.length}`);
    
    // Проверяем размер БД
    const dbSize = await prisma.$queryRaw`
      SELECT page_count * page_size as size_bytes
      FROM pragma_page_count(), pragma_page_size()
    `;
    
    const sizeMB = (dbSize[0].size_bytes / 1024 / 1024).toFixed(2);
    console.log(`💾 Размер БД: ${sizeMB} MB`);
    
  } catch (error) {
    console.error('❌ Ошибка мониторинга БД:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем мониторинг
if (require.main === module) {
  monitorDatabase();
}

module.exports = { monitorDatabase };
