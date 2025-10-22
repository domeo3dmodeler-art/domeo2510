const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function checkBackupDatabase() {
  try {
    console.log('🔍 Проверяем резервную копию temp_dev.db...\n');
    
    // Проверяем размер файла
    const stats = fs.statSync('temp_dev.db');
    console.log(`📁 Размер файла: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📅 Дата изменения: ${stats.mtime}\n`);
    
    // Подключаемся к резервной копии
    const backupPrisma = new PrismaClient({
      datasources: {
        db: {
          url: "file:./temp_dev.db?mode=rwc&cache=shared&_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=cache_size(1000)&_pragma=temp_store(MEMORY)&_pragma=mmap_size(268435456)&_pragma=encoding(UTF8)"
        }
      }
    });
    
    // Проверяем количество записей
    const products = await backupPrisma.product.count();
    const categories = await backupPrisma.catalogCategory.count();
    const frontendCategories = await backupPrisma.frontendCategory.count();
    const users = await backupPrisma.user.count();
    
    console.log('📊 Статистика резервной копии:');
    console.log(`  Товары: ${products}`);
    console.log(`  Категории каталога: ${categories}`);
    console.log(`  Фронтенд категории: ${frontendCategories}`);
    console.log(`  Пользователи: ${users}\n`);
    
    if (products > 0) {
      console.log('✅ В резервной копии есть товары!');
      
      // Показываем несколько примеров товаров
      const sampleProducts = await backupPrisma.product.findMany({
        take: 5,
        select: {
          sku: true,
          name: true,
          base_price: true,
          catalog_category_id: true
        }
      });
      
      console.log('\n📦 Примеры товаров:');
      sampleProducts.forEach(product => {
        console.log(`  - ${product.sku}: ${product.name} (${product.base_price} руб)`);
      });
      
      // Показываем категории
      const sampleCategories = await backupPrisma.catalogCategory.findMany({
        take: 5,
        select: {
          name: true,
          level: true,
          products_count: true
        }
      });
      
      console.log('\n📁 Примеры категорий:');
      sampleCategories.forEach(category => {
        console.log(`  - ${category.name} (уровень ${category.level}, товаров: ${category.products_count})`);
      });
      
    } else {
      console.log('❌ В резервной копии тоже нет товаров!');
    }
    
    await backupPrisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Ошибка при проверке резервной копии:', error);
  }
}

checkBackupDatabase();
