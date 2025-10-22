const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function checkBackupTables() {
  try {
    console.log('🔍 Проверяем структуру резервной копии temp_dev.db...\n');
    
    // Подключаемся к резервной копии
    const backupPrisma = new PrismaClient({
      datasources: {
        db: {
          url: "file:./temp_dev.db?mode=rwc&cache=shared&_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=cache_size(1000)&_pragma=temp_store(MEMORY)&_pragma=mmap_size(268435456)&_pragma=encoding(UTF8)"
        }
      }
    });
    
    // Получаем список всех таблиц
    const tables = await backupPrisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;
    
    console.log('📋 Таблицы в резервной копии:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Проверяем количество записей в каждой таблице
    console.log('\n📊 Количество записей:');
    for (const table of tables) {
      try {
        const count = await backupPrisma.$queryRaw`SELECT COUNT(*) as count FROM ${table.name}`;
        console.log(`  ${table.name}: ${count[0].count} записей`);
      } catch (error) {
        console.log(`  ${table.name}: ошибка при подсчете`);
      }
    }
    
    await backupPrisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Ошибка при проверке резервной копии:', error);
  }
}

checkBackupTables();
