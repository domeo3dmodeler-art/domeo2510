const fs = require('fs');
const path = require('path');

async function comprehensiveCodeAudit() {
  console.log('🔍 Комплексный аудит кода, логов и производительности...');
  
  const issues = {
    performance: [],
    codeQuality: [],
    security: [],
    logs: [],
    dependencies: [],
    recommendations: []
  };
  
  // 1. Анализ производительности
  console.log('\n⚡ Анализ производительности...');
  
  // Проверяем размеры файлов
  const largeFiles = [];
  const slowQueries = [];
  
  function scanForLargeFiles(dir, maxSize = 100 * 1024) { // 100KB
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory() && !['node_modules', '.git', '.next'].includes(item)) {
          scanForLargeFiles(fullPath, maxSize);
        } else if (stats.isFile() && stats.size > maxSize) {
          largeFiles.push({
            path: path.relative(__dirname, fullPath),
            size: stats.size,
            sizeKB: (stats.size / 1024).toFixed(1)
          });
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Ошибка сканирования ${dir}: ${error.message}`);
    }
  }
  
  scanForLargeFiles(__dirname);
  
  if (largeFiles.length > 0) {
    console.log(`   📊 Найдено ${largeFiles.length} больших файлов:`);
    largeFiles.slice(0, 10).forEach(file => {
      console.log(`     - ${file.path} (${file.sizeKB} KB)`);
      issues.performance.push(`Большой файл: ${file.path} (${file.sizeKB} KB)`);
    });
  }
  
  // 2. Анализ качества кода
  console.log('\n📝 Анализ качества кода...');
  
  // Проверяем на console.log в продакшене
  const consoleLogs = [];
  const todoComments = [];
  const deprecatedPatterns = [];
  
  function scanCodeQuality(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory() && !['node_modules', '.git', '.next'].includes(item)) {
          scanCodeQuality(fullPath);
        } else if (stats.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              // Проверяем console.log
              if (line.includes('console.log') && !line.includes('// TODO: remove')) {
                consoleLogs.push({
                  file: path.relative(__dirname, fullPath),
                  line: index + 1,
                  content: line.trim()
                });
              }
              
              // Проверяем TODO комментарии
              if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
                todoComments.push({
                  file: path.relative(__dirname, fullPath),
                  line: index + 1,
                  content: line.trim()
                });
              }
              
              // Проверяем устаревшие паттерны
              if (line.includes('componentWillMount') || 
                  line.includes('componentWillReceiveProps') ||
                  line.includes('UNSAFE_')) {
                deprecatedPatterns.push({
                  file: path.relative(__dirname, fullPath),
                  line: index + 1,
                  content: line.trim()
                });
              }
            });
          } catch (error) {
            console.log(`   ⚠️ Ошибка чтения ${fullPath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Ошибка сканирования ${dir}: ${error.message}`);
    }
  }
  
  scanCodeQuality(__dirname);
  
  if (consoleLogs.length > 0) {
    console.log(`   🐛 Найдено ${consoleLogs.length} console.log:`);
    consoleLogs.slice(0, 5).forEach(log => {
      console.log(`     - ${log.file}:${log.line} - ${log.content}`);
      issues.codeQuality.push(`Console.log в ${log.file}:${log.line}`);
    });
  }
  
  if (todoComments.length > 0) {
    console.log(`   📝 Найдено ${todoComments.length} TODO комментариев:`);
    todoComments.slice(0, 5).forEach(todo => {
      console.log(`     - ${todo.file}:${todo.line} - ${todo.content}`);
      issues.codeQuality.push(`TODO в ${todo.file}:${todo.line}`);
    });
  }
  
  if (deprecatedPatterns.length > 0) {
    console.log(`   ⚠️ Найдено ${deprecatedPatterns.length} устаревших паттернов:`);
    deprecatedPatterns.slice(0, 5).forEach(dep => {
      console.log(`     - ${dep.file}:${dep.line} - ${dep.content}`);
      issues.codeQuality.push(`Устаревший паттерн в ${dep.file}:${dep.line}`);
    });
  }
  
  // 3. Анализ безопасности
  console.log('\n🔒 Анализ безопасности...');
  
  // Проверяем package.json на уязвимости
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Проверяем на известные проблемные пакеты
    const problematicPackages = [
      'lodash', 'moment', 'jquery', 'express', 'mongoose'
    ];
    
    problematicPackages.forEach(pkg => {
      if (dependencies[pkg]) {
        issues.security.push(`Потенциально проблемный пакет: ${pkg}`);
      }
    });
    
    console.log(`   📦 Проанализировано ${Object.keys(dependencies).length} зависимостей`);
  } catch (error) {
    console.log(`   ❌ Ошибка анализа package.json: ${error.message}`);
  }
  
  // 4. Анализ логов
  console.log('\n📋 Анализ логов...');
  
  // Проверяем наличие логов
  const logFiles = [];
  function findLogFiles(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory() && !['node_modules', '.git'].includes(item)) {
          findLogFiles(fullPath);
        } else if (stats.isFile() && /\.(log|txt)$/.test(item)) {
          logFiles.push({
            path: path.relative(__dirname, fullPath),
            size: stats.size
          });
        }
      }
    } catch (error) {
      // Игнорируем ошибки доступа
    }
  }
  
  findLogFiles(__dirname);
  
  if (logFiles.length > 0) {
    console.log(`   📄 Найдено ${logFiles.length} лог файлов:`);
    logFiles.forEach(log => {
      console.log(`     - ${log.path} (${(log.size / 1024).toFixed(1)} KB)`);
    });
  } else {
    console.log(`   ✅ Лог файлы не найдены (хорошо для продакшена)`);
  }
  
  // 5. Анализ API endpoints
  console.log('\n🌐 Анализ API endpoints...');
  
  const apiFiles = [];
  function findApiFiles(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory() && item === 'api') {
          findApiFiles(fullPath);
        } else if (stats.isFile() && item === 'route.ts') {
          apiFiles.push(path.relative(__dirname, fullPath));
        }
      }
    } catch (error) {
      // Игнорируем ошибки доступа
    }
  }
  
  findApiFiles(path.join(__dirname, 'app'));
  
  console.log(`   🔗 Найдено ${apiFiles.length} API endpoints`);
  
  // 6. Анализ производительности базы данных
  console.log('\n🗄️ Анализ производительности БД...');
  
  // Проверяем Prisma схему
  try {
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
    const modelCount = (schemaContent.match(/^model\s+\w+/gm) || []).length;
    const relationCount = (schemaContent.match(/@relation/g) || []).length;
    
    console.log(`   📊 Моделей: ${modelCount}, Связей: ${relationCount}`);
    
    if (modelCount > 20) {
      issues.performance.push(`Много моделей в БД: ${modelCount}`);
    }
    
    if (relationCount > 50) {
      issues.performance.push(`Много связей в БД: ${relationCount}`);
    }
  } catch (error) {
    console.log(`   ❌ Ошибка анализа Prisma схемы: ${error.message}`);
  }
  
  // 7. Генерация рекомендаций
  console.log('\n💡 Генерация рекомендаций...');
  
  if (issues.performance.length > 0) {
    issues.recommendations.push('Оптимизировать производительность:');
    issues.performance.forEach(issue => {
      issues.recommendations.push(`  - ${issue}`);
    });
  }
  
  if (issues.codeQuality.length > 0) {
    issues.recommendations.push('Улучшить качество кода:');
    issues.codeQuality.forEach(issue => {
      issues.recommendations.push(`  - ${issue}`);
    });
  }
  
  if (issues.security.length > 0) {
    issues.recommendations.push('Усилить безопасность:');
    issues.security.forEach(issue => {
      issues.recommendations.push(`  - ${issue}`);
    });
  }
  
  // 8. Итоговый отчет
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');
  console.log(`   ⚡ Проблемы производительности: ${issues.performance.length}`);
  console.log(`   📝 Проблемы качества кода: ${issues.codeQuality.length}`);
  console.log(`   🔒 Проблемы безопасности: ${issues.security.length}`);
  console.log(`   📋 Проблемы логов: ${issues.logs.length}`);
  console.log(`   📦 Проблемы зависимостей: ${issues.dependencies.length}`);
  
  if (issues.recommendations.length > 0) {
    console.log('\n🎯 РЕКОМЕНДАЦИИ:');
    issues.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
  }
  
  // 9. Создаем файл отчета
  const reportContent = {
    timestamp: new Date().toISOString(),
    summary: {
      performanceIssues: issues.performance.length,
      codeQualityIssues: issues.codeQuality.length,
      securityIssues: issues.security.length,
      logIssues: issues.logs.length,
      dependencyIssues: issues.dependencies.length
    },
    details: issues,
    recommendations: issues.recommendations
  };
  
  try {
    fs.writeFileSync('code-audit-report.json', JSON.stringify(reportContent, null, 2));
    console.log('\n📄 Отчет сохранен в code-audit-report.json');
  } catch (error) {
    console.log(`\n❌ Ошибка сохранения отчета: ${error.message}`);
  }
  
  console.log('\n✅ Комплексный аудит завершен!');
}

comprehensiveCodeAudit();
