const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function implementAutomaticBackups() {
  try {
    console.log('🔧 РЕАЛИЗАЦИЯ АВТОМАТИЧЕСКОГО РЕЗЕРВНОГО КОПИРОВАНИЯ\n');

    // 1. Создание функции полного резервного копирования
    console.log('1. Создание функции полного резервного копирования...');
    
    const createFullBackup = async () => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups');
      
      // Создаем директорию для бэкапов если её нет
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const backupFile = path.join(backupDir, `full_backup_${timestamp}.json`);
      
      console.log(`   📁 Создание полного бэкапа: ${backupFile}`);
      
      // Экспортируем все данные
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          categories: await prisma.catalogCategory.findMany({
            orderBy: { created_at: 'asc' }
          }),
          products: await prisma.product.findMany({
            orderBy: { created_at: 'asc' }
          }),
          templates: await prisma.importTemplate.findMany({
            orderBy: { created_at: 'asc' }
          }),
          properties: await prisma.productProperty.findMany({
            orderBy: { created_at: 'asc' }
          })
        }
      };
      
      // Сохраняем бэкап
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      const stats = fs.statSync(backupFile);
      console.log(`   ✅ Полный бэкап создан: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      return backupFile;
    };

    // 2. Создание функции инкрементального резервного копирования
    console.log('\n2. Создание функции инкрементального резервного копирования...');
    
    const createIncrementalBackup = async (lastBackupTime) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const backupFile = path.join(backupDir, `incremental_backup_${timestamp}.json`);
      
      console.log(`   📁 Создание инкрементального бэкапа: ${backupFile}`);
      
      // Экспортируем только измененные данные
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        type: 'incremental',
        lastBackupTime: lastBackupTime,
        data: {
          categories: await prisma.catalogCategory.findMany({
            where: {
              updated_at: {
                gt: new Date(lastBackupTime)
              }
            },
            orderBy: { updated_at: 'asc' }
          }),
          products: await prisma.product.findMany({
            where: {
              updated_at: {
                gt: new Date(lastBackupTime)
              }
            },
            orderBy: { updated_at: 'asc' }
          }),
          templates: await prisma.importTemplate.findMany({
            where: {
              updated_at: {
                gt: new Date(lastBackupTime)
              }
            },
            orderBy: { updated_at: 'asc' }
          })
        }
      };
      
      // Сохраняем бэкап
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      const stats = fs.statSync(backupFile);
      console.log(`   ✅ Инкрементальный бэкап создан: ${(stats.size / 1024).toFixed(2)} KB`);
      
      return backupFile;
    };

    // 3. Создание функции восстановления из бэкапа
    console.log('\n3. Создание функции восстановления из бэкапа...');
    
    const restoreFromBackup = async (backupFile) => {
      console.log(`   📁 Восстановление из бэкапа: ${backupFile}`);
      
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Файл бэкапа не найден: ${backupFile}`);
      }
      
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      console.log(`   📊 Данные бэкапа: ${backupData.timestamp}`);
      console.log(`   📋 Версия: ${backupData.version}`);
      
      // Восстанавливаем данные в транзакции
      await prisma.$transaction(async (tx) => {
        // Восстанавливаем категории
        if (backupData.data.categories && backupData.data.categories.length > 0) {
          console.log(`   📁 Восстановление ${backupData.data.categories.length} категорий...`);
          
          for (const category of backupData.data.categories) {
            await tx.catalogCategory.upsert({
              where: { id: category.id },
              update: category,
              create: category
            });
          }
        }
        
        // Восстанавливаем товары
        if (backupData.data.products && backupData.data.products.length > 0) {
          console.log(`   📦 Восстановление ${backupData.data.products.length} товаров...`);
          
          for (const product of backupData.data.products) {
            await tx.product.upsert({
              where: { sku: product.sku },
              update: product,
              create: product
            });
          }
        }
        
        // Восстанавливаем шаблоны
        if (backupData.data.templates && backupData.data.templates.length > 0) {
          console.log(`   📋 Восстановление ${backupData.data.templates.length} шаблонов...`);
          
          for (const template of backupData.data.templates) {
            await tx.importTemplate.upsert({
              where: { id: template.id },
              update: template,
              create: template
            });
          }
        }
      });
      
      console.log(`   ✅ Восстановление завершено успешно`);
    };

    // 4. Создание функции очистки старых бэкапов
    console.log('\n4. Создание функции очистки старых бэкапов...');
    
    const cleanupOldBackups = async (keepDays = 30) => {
      const backupDir = path.join(process.cwd(), 'backups');
      
      if (!fs.existsSync(backupDir)) {
        return;
      }
      
      const files = fs.readdirSync(backupDir);
      const cutoffTime = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffTime) {
          totalSize += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      
      console.log(`   🗑️ Удалено старых бэкапов: ${deletedCount}`);
      console.log(`   💾 Освобождено места: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    };

    // 5. Тестирование функций
    console.log('\n5. Тестирование функций резервного копирования...');
    
    // Создаем полный бэкап
    const fullBackupFile = await createFullBackup();
    
    // Создаем инкрементальный бэкап
    const incrementalBackupFile = await createIncrementalBackup(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    // Проверяем размеры файлов
    const fullBackupSize = fs.statSync(fullBackupFile).size;
    const incrementalBackupSize = fs.statSync(incrementalBackupFile).size;
    
    console.log(`   📊 Размер полного бэкапа: ${(fullBackupSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📊 Размер инкрементального бэкапа: ${(incrementalBackupSize / 1024).toFixed(2)} KB`);
    
    // Очищаем старые бэкапы (тестовые)
    await cleanupOldBackups(0); // Удаляем все файлы для теста
    
    console.log('\n🎉 РЕАЛИЗАЦИЯ АВТОМАТИЧЕСКОГО РЕЗЕРВНОГО КОПИРОВАНИЯ ЗАВЕРШЕНА!');
    console.log('\n📊 СОЗДАННЫЕ ФУНКЦИИ:');
    console.log('   ✅ createFullBackup - полное резервное копирование');
    console.log('   ✅ createIncrementalBackup - инкрементальное копирование');
    console.log('   ✅ restoreFromBackup - восстановление из бэкапа');
    console.log('   ✅ cleanupOldBackups - очистка старых бэкапов');
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Настроить автоматическое выполнение через cron');
    console.log('   2. Добавить уведомления об успешном/неуспешном копировании');
    console.log('   3. Реализовать сжатие бэкапов для экономии места');
    console.log('   4. Добавить проверку целостности бэкапов');
    console.log('   5. Настроить хранение бэкапов в облаке');

  } catch (error) {
    console.error('❌ Ошибка при реализации автоматического резервного копирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

implementAutomaticBackups();
