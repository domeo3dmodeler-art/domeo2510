const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function addDatabaseMonitoring() {
  try {
    console.log('🔧 ДОБАВЛЕНИЕ МОНИТОРИНГА БАЗЫ ДАННЫХ\n');

    // 1. Создание функции мониторинга производительности
    console.log('1. Создание функции мониторинга производительности...');
    
    const monitorPerformance = async () => {
      const startTime = Date.now();
      
      // Тестируем различные запросы
      const tests = [
        {
          name: 'Поиск товаров по категории',
          query: async () => {
            return await prisma.product.findMany({
              where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' },
              take: 100
            });
          }
        },
        {
          name: 'Подсчет товаров в категории',
          query: async () => {
            return await prisma.product.count({
              where: { catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo' }
            });
          }
        },
        {
          name: 'Поиск товаров по цене',
          query: async () => {
            return await prisma.product.findMany({
              where: { 
                base_price: { gte: 1000, lte: 5000 }
              },
              take: 50
            });
          }
        },
        {
          name: 'Поиск товаров по количеству на складе',
          query: async () => {
            return await prisma.product.findMany({
              where: { 
                stock_quantity: { gt: 0 }
              },
              take: 50
            });
          }
        }
      ];
      
      const results = [];
      
      for (const test of tests) {
        const testStart = Date.now();
        try {
          await test.query();
          const testTime = Date.now() - testStart;
          results.push({
            name: test.name,
            time: testTime,
            status: 'success'
          });
        } catch (error) {
          const testTime = Date.now() - testStart;
          results.push({
            name: test.name,
            time: testTime,
            status: 'error',
            error: error.message
          });
        }
      }
      
      const totalTime = Date.now() - startTime;
      
      return {
        timestamp: new Date().toISOString(),
        totalTime,
        tests: results
      };
    };

    // 2. Создание функции мониторинга размера базы данных
    console.log('\n2. Создание функции мониторинга размера базы данных...');
    
    const monitorDatabaseSize = async () => {
      const dbPath = path.join(process.cwd(), 'prisma', 'database', 'dev.db');
      
      let dbSize = 0;
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSize = stats.size;
      }
      
      // Получаем статистику по таблицам
      const tableStats = await prisma.$queryRaw`
        SELECT 
          name,
          (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=t.name) as row_count
        FROM sqlite_master t
        WHERE type='table' AND name IN ('products', 'catalog_categories', 'product_images', 'import_templates')
      `;
      
      const stats = {};
      for (const table of tableStats) {
        try {
          const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ${table.name}`;
          stats[table.name] = count[0].count;
        } catch (error) {
          stats[table.name] = 0;
        }
      }
      
      return {
        timestamp: new Date().toISOString(),
        databaseSize: dbSize,
        tableStats: stats
      };
    };

    // 3. Создание функции мониторинга индексов
    console.log('\n3. Создание функции мониторинга индексов...');
    
    const monitorIndexes = async () => {
      const indexes = await prisma.$queryRaw`
        SELECT 
          name,
          sql
        FROM sqlite_master
        WHERE type='index' AND sql IS NOT NULL
        ORDER BY name
      `;
      
      const indexStats = {
        total: indexes.length,
        byTable: {},
        unused: []
      };
      
      // Группируем индексы по таблицам
      for (const index of indexes) {
        const tableName = index.sql.match(/ON\s+(\w+)/i)?.[1] || 'unknown';
        if (!indexStats.byTable[tableName]) {
          indexStats.byTable[tableName] = 0;
        }
        indexStats.byTable[tableName]++;
      }
      
      return {
        timestamp: new Date().toISOString(),
        indexStats
      };
    };

    // 4. Создание функции логирования ошибок
    console.log('\n4. Создание функции логирования ошибок...');
    
    const logError = async (error, context = {}) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: error.message,
        stack: error.stack,
        context
      };
      
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, `database_errors_${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
      
      console.log(`   📝 Ошибка записана в лог: ${logFile}`);
    };

    // 5. Создание функции генерации отчета о состоянии
    console.log('\n5. Создание функции генерации отчета о состоянии...');
    
    const generateStatusReport = async () => {
      const report = {
        timestamp: new Date().toISOString(),
        performance: await monitorPerformance(),
        databaseSize: await monitorDatabaseSize(),
        indexes: await monitorIndexes(),
        summary: {
          status: 'healthy',
          issues: []
        }
      };
      
      // Анализируем производительность
      const slowQueries = report.performance.tests.filter(test => test.time > 1000);
      if (slowQueries.length > 0) {
        report.summary.status = 'warning';
        report.summary.issues.push(`Медленные запросы: ${slowQueries.length}`);
      }
      
      // Анализируем размер базы данных
      if (report.databaseSize.databaseSize > 100 * 1024 * 1024) { // 100MB
        report.summary.status = 'warning';
        report.summary.issues.push('Большой размер базы данных');
      }
      
      // Анализируем индексы
      if (report.indexes.indexStats.total < 10) {
        report.summary.status = 'warning';
        report.summary.issues.push('Мало индексов для оптимизации');
      }
      
      return report;
    };

    // 6. Тестирование функций мониторинга
    console.log('\n6. Тестирование функций мониторинга...');
    
    // Тестируем мониторинг производительности
    const performanceResult = await monitorPerformance();
    console.log(`   ⚡ Тест производительности: ${performanceResult.totalTime}ms`);
    performanceResult.tests.forEach(test => {
      const status = test.status === 'success' ? '✅' : '❌';
      console.log(`     ${status} ${test.name}: ${test.time}ms`);
    });
    
    // Тестируем мониторинг размера базы данных
    const sizeResult = await monitorDatabaseSize();
    console.log(`   💾 Размер базы данных: ${(sizeResult.databaseSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📊 Статистика таблиц:`);
    Object.entries(sizeResult.tableStats).forEach(([table, count]) => {
      console.log(`     * ${table}: ${count} записей`);
    });
    
    // Тестируем мониторинг индексов
    const indexResult = await monitorIndexes();
    console.log(`   📈 Всего индексов: ${indexResult.indexStats.total}`);
    console.log(`   📋 Индексы по таблицам:`);
    Object.entries(indexResult.indexStats.byTable).forEach(([table, count]) => {
      console.log(`     * ${table}: ${count} индексов`);
    });
    
    // Генерируем полный отчет
    const fullReport = await generateStatusReport();
    console.log(`   📋 Статус системы: ${fullReport.summary.status}`);
    if (fullReport.summary.issues.length > 0) {
      console.log(`   ⚠️  Проблемы:`);
      fullReport.summary.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
    
    // Сохраняем отчет
    const reportDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = path.join(reportDir, `database_status_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(fullReport, null, 2));
    console.log(`   📄 Отчет сохранен: ${reportFile}`);

    console.log('\n🎉 ДОБАВЛЕНИЕ МОНИТОРИНГА БАЗЫ ДАННЫХ ЗАВЕРШЕНО!');
    console.log('\n📊 СОЗДАННЫЕ ФУНКЦИИ:');
    console.log('   ✅ monitorPerformance - мониторинг производительности');
    console.log('   ✅ monitorDatabaseSize - мониторинг размера базы данных');
    console.log('   ✅ monitorIndexes - мониторинг индексов');
    console.log('   ✅ logError - логирование ошибок');
    console.log('   ✅ generateStatusReport - генерация отчета о состоянии');
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Настроить автоматический мониторинг каждые 5 минут');
    console.log('   2. Добавить алерты при критических проблемах');
    console.log('   3. Реализовать дашборд для визуализации метрик');
    console.log('   4. Добавить мониторинг использования памяти');
    console.log('   5. Настроить уведомления по email/SMS');

  } catch (error) {
    console.error('❌ Ошибка при добавлении мониторинга базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDatabaseMonitoring();
