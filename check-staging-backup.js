const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function checkStagingBackup() {
  try {
    console.log('🔍 Проверяем staging-db-backup.db...\n');
    
    // Проверяем размер файла
    const stats = fs.statSync('staging-db-backup.db');
    console.log(`📁 Размер файла: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📅 Дата изменения: ${stats.mtime}\n`);
    
    // Подключаемся к staging резервной копии
    const stagingPrisma = new PrismaClient({
      datasources: {
        db: {
          url: "file:./staging-db-backup.db?mode=rwc&cache=shared&_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=cache_size(1000)&_pragma=temp_store(MEMORY)&_pragma=mmap_size(268435456)&_pragma=encoding(UTF8)"
        }
      }
    });
    
    // Получаем список всех таблиц
    const tables = await stagingPrisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;
    
    console.log('📋 Таблицы в staging резервной копии:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Проверяем количество записей в каждой таблице
    console.log('\n📊 Количество записей:');
    for (const table of tables) {
      try {
        const count = await stagingPrisma.$queryRaw`SELECT COUNT(*) as count FROM ${table.name}`;
        console.log(`  ${table.name}: ${count[0].count} записей`);
      } catch (error) {
        console.log(`  ${table.name}: ошибка при подсчете`);
      }
    }
    
    await stagingPrisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Ошибка при проверке staging резервной копии:', error);
  }
}

checkStagingBackup();
