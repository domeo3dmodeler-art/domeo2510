const fs = require('fs');
const path = require('path');

async function optimizeDatabase() {
  console.log('🗄️ Оптимизация производительности базы данных...');
  
  // 1. Анализируем Prisma схему
  console.log('\n📊 Анализируем Prisma схему...');
  
  try {
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
    const models = [];
    const relations = [];
    const indexes = [];
    
    // Парсим модели
    const modelMatches = schemaContent.match(/^model\s+(\w+)\s*\{[\s\S]*?\n\}/gm);
    if (modelMatches) {
      modelMatches.forEach(match => {
        const modelName = match.match(/^model\s+(\w+)/)[1];
        const fields = match.match(/^\s+(\w+)\s+[\w\[\]!?]+/gm) || [];
        models.push({
          name: modelName,
          fieldCount: fields.length
        });
      });
    }
    
    // Парсим связи
    const relationMatches = schemaContent.match(/@relation\([^)]+\)/g);
    if (relationMatches) {
      relationMatches.forEach(match => {
        relations.push(match);
      });
    }
    
    // Парсим индексы
    const indexMatches = schemaContent.match(/@@index\([^)]+\)/g);
    if (indexMatches) {
      indexMatches.forEach(match => {
        indexes.push(match);
      });
    }
    
    console.log(`   📋 Моделей: ${models.length}`);
    console.log(`   🔗 Связей: ${relations.length}`);
    console.log(`   📇 Индексов: ${indexes.length}`);
    
    // 2. Анализируем большие модели
    console.log('\n🔍 Анализируем большие модели...');
    
    const largeModels = models.filter(model => model.fieldCount > 15);
    if (largeModels.length > 0) {
      console.log(`   ⚠️ Большие модели (${largeModels.length}):`);
      largeModels.forEach(model => {
        console.log(`     - ${model.name}: ${model.fieldCount} полей`);
      });
    }
    
    // 3. Создаем рекомендации по индексам
    console.log('\n📇 Создаем рекомендации по индексам...');
    
    const indexRecommendations = [];
    
    // Рекомендуем индексы для часто используемых полей
    const commonIndexFields = [
      'email', 'phone', 'status', 'created_at', 'updated_at', 
      'client_id', 'user_id', 'product_id', 'category_id'
    ];
    
    models.forEach(model => {
      const modelContent = schemaContent.match(new RegExp(`model\\s+${model.name}\\s*\\{[\\s\\S]*?\\n\\}`, 'm'));
      if (modelContent) {
        const fields = modelContent[0].match(/^\s+(\w+)\s+[\w\[\]!?]+/gm) || [];
        const fieldNames = fields.map(field => field.trim().split(/\s+/)[0]);
        
        commonIndexFields.forEach(indexField => {
          if (fieldNames.includes(indexField)) {
            indexRecommendations.push({
              model: model.name,
              field: indexField,
              reason: 'Часто используемое поле для поиска'
            });
          }
        });
      }
    });
    
    if (indexRecommendations.length > 0) {
      console.log(`   📇 Рекомендуемые индексы (${indexRecommendations.length}):`);
      indexRecommendations.slice(0, 10).forEach(rec => {
        console.log(`     - ${rec.model}.${rec.field}: ${rec.reason}`);
      });
    }
    
    // 4. Создаем SQL скрипт для оптимизации
    console.log('\n🔧 Создаем SQL скрипт оптимизации...');
    
    const optimizationSQL = `
-- Скрипт оптимизации базы данных
-- Создан: ${new Date().toISOString()}

-- 1. Создание индексов для часто используемых полей
${indexRecommendations.map(rec => 
  `CREATE INDEX IF NOT EXISTS idx_${rec.model.toLowerCase()}_${rec.field} ON ${rec.model.toLowerCase()} (${rec.field});`
).join('\n')}

-- 2. Анализ статистики таблиц
${models.map(model => 
  `ANALYZE ${model.name.toLowerCase()};`
).join('\n')}

-- 3. Очистка неиспользуемых данных (если нужно)
-- DELETE FROM notifications WHERE created_at < datetime('now', '-30 days');
-- DELETE FROM document_history WHERE created_at < datetime('now', '-90 days');

-- 4. Оптимизация базы данных
VACUUM;
`;
    
    try {
      fs.writeFileSync('database-optimization.sql', optimizationSQL);
      console.log('   📄 SQL скрипт создан: database-optimization.sql');
    } catch (error) {
      console.log(`   ❌ Ошибка создания SQL скрипта: ${error.message}`);
    }
    
    // 5. Создаем скрипт мониторинга БД
    console.log('\n📊 Создаем скрипт мониторинга БД...');
    
    const dbMonitoringScript = `
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function monitorDatabase() {
  console.log('🗄️ Мониторинг базы данных...');
  
  try {
    // Проверяем размеры таблиц
    const tableStats = await prisma.$queryRaw\`
      SELECT 
        name,
        (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as row_count
      FROM sqlite_master m 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    \`;
    
    console.log('📊 Статистика таблиц:');
    tableStats.forEach(table => {
      console.log(\`   - \${table.name}: \${table.row_count} записей\`);
    });
    
    // Проверяем индексы
    const indexes = await prisma.$queryRaw\`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
    \`;
    
    console.log(\`📇 Индексов: \${indexes.length}\`);
    
    // Проверяем размер БД
    const dbSize = await prisma.$queryRaw\`
      SELECT page_count * page_size as size_bytes
      FROM pragma_page_count(), pragma_page_size()
    \`;
    
    const sizeMB = (dbSize[0].size_bytes / 1024 / 1024).toFixed(2);
    console.log(\`💾 Размер БД: \${sizeMB} MB\`);
    
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
`;
    
    try {
      fs.writeFileSync('database-monitor.js', dbMonitoringScript);
      console.log('   📄 Скрипт мониторинга БД создан: database-monitor.js');
    } catch (error) {
      console.log(`   ❌ Ошибка создания скрипта мониторинга: ${error.message}`);
    }
    
    // 6. Создаем отчет по оптимизации БД
    const dbOptimizationReport = {
      timestamp: new Date().toISOString(),
      analysis: {
        models: models.length,
        relations: relations.length,
        indexes: indexes.length,
        largeModels: largeModels.length
      },
      recommendations: {
        indexes: indexRecommendations.slice(0, 20),
        maintenance: [
          'Регулярно запускать VACUUM для оптимизации',
          'Анализировать статистику таблиц',
          'Удалять старые логи и уведомления',
          'Мониторить размер БД'
        ]
      },
      scripts: [
        'database-optimization.sql - SQL скрипт оптимизации',
        'database-monitor.js - Скрипт мониторинга БД'
      ]
    };
    
    try {
      fs.writeFileSync('database-optimization-report.json', JSON.stringify(dbOptimizationReport, null, 2));
      console.log('   📄 Отчет по БД сохранен: database-optimization-report.json');
    } catch (error) {
      console.log(`   ❌ Ошибка сохранения отчета: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Ошибка анализа Prisma схемы: ${error.message}`);
  }
  
  console.log('\n📊 РЕЗУЛЬТАТЫ ОПТИМИЗАЦИИ БД:');
  console.log('   📋 Проанализированы модели и связи');
  console.log('   📇 Созданы рекомендации по индексам');
  console.log('   🔧 Создан SQL скрипт оптимизации');
  console.log('   📊 Создан скрипт мониторинга БД');
  
  console.log('\n💡 СЛЕДУЮЩИЕ ШАГИ:');
  console.log('   1. Запустить database-optimization.sql');
  console.log('   2. Регулярно запускать database-monitor.js');
  console.log('   3. Настроить автоматическую очистку старых данных');
  console.log('   4. Мониторить производительность запросов');
  
  console.log('\n✅ Оптимизация БД завершена!');
}

optimizeDatabase();
