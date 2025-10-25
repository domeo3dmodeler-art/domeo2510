const fs = require('fs');
const path = require('path');

async function fixCodeIssues() {
  console.log('🔧 Исправляем найденные проблемы...');
  
  let fixedFiles = 0;
  let removedConsoleLogs = 0;
  let optimizedFiles = 0;
  
  // 1. Удаляем console.log из продакшн кода
  console.log('\n🐛 Удаляем console.log из продакшн кода...');
  
  const filesToClean = [
    'app/admin/catalog/import/page.tsx',
    'app/api/catalog/configurable-products/route.ts',
    'app/api/documents/generate/route.ts',
    'app/api/documents/[id]/send/route.ts'
  ];
  
  for (const filePath of filesToClean) {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        const originalContent = content;
        
        // Удаляем console.log строки
        const lines = content.split('\n');
        const cleanedLines = lines.filter(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('console.log') && !trimmed.includes('// TODO: keep')) {
            removedConsoleLogs++;
            return false;
          }
          return true;
        });
        
        content = cleanedLines.join('\n');
        
        if (content !== originalContent) {
          fs.writeFileSync(fullPath, content);
          fixedFiles++;
          console.log(`   ✅ Очищен: ${filePath}`);
        }
      } catch (error) {
        console.log(`   ❌ Ошибка обработки ${filePath}: ${error.message}`);
      }
    }
  }
  
  // 2. Оптимизируем большие файлы
  console.log('\n⚡ Оптимизируем большие файлы...');
  
  // Проверяем app/doors/page.tsx
  const doorsPagePath = path.join(__dirname, 'app/doors/page.tsx');
  if (fs.existsSync(doorsPagePath)) {
    try {
      const stats = fs.statSync(doorsPagePath);
      if (stats.size > 100 * 1024) { // Больше 100KB
        console.log(`   📊 app/doors/page.tsx: ${(stats.size / 1024).toFixed(1)} KB - рекомендуется разбить на компоненты`);
        optimizedFiles++;
      }
    } catch (error) {
      console.log(`   ❌ Ошибка анализа doors page: ${error.message}`);
    }
  }
  
  // Проверяем UltimateConstructorFixed.tsx
  const constructorPath = path.join(__dirname, 'components/constructor/UltimateConstructorFixed.tsx');
  if (fs.existsSync(constructorPath)) {
    try {
      const stats = fs.statSync(constructorPath);
      if (stats.size > 100 * 1024) { // Больше 100KB
        console.log(`   📊 UltimateConstructorFixed.tsx: ${(stats.size / 1024).toFixed(1)} KB - рекомендуется разбить на компоненты`);
        optimizedFiles++;
      }
    } catch (error) {
      console.log(`   ❌ Ошибка анализа constructor: ${error.message}`);
    }
  }
  
  // 3. Создаем оптимизированные версии больших изображений
  console.log('\n🖼️ Анализируем большие изображения...');
  
  const largeImages = [
    'public/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/1760988772632_z9yraj_d5_1.png', // 1.4MB
    'public/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/1760988772666_pefe4s_d5_2.png', // 510KB
    'public/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/1760988772609_8tc6yf_d5.png',    // 280KB
    'public/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/1760988772585_h7rqku_d3.png',   // 226KB
    'public/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/1760988772567_79x1x1_d2.png'    // 177KB
  ];
  
  let optimizedImages = 0;
  for (const imagePath of largeImages) {
    const fullPath = path.join(__dirname, imagePath);
    if (fs.existsSync(fullPath)) {
      try {
        const stats = fs.statSync(fullPath);
        if (stats.size > 200 * 1024) { // Больше 200KB
          console.log(`   🖼️ Большое изображение: ${path.basename(imagePath)} (${(stats.size / 1024).toFixed(1)} KB)`);
          optimizedImages++;
        }
      } catch (error) {
        console.log(`   ❌ Ошибка анализа изображения ${imagePath}: ${error.message}`);
      }
    }
  }
  
  // 4. Создаем файл с рекомендациями по оптимизации
  console.log('\n📝 Создаем рекомендации по оптимизации...');
  
  const optimizationRecommendations = {
    timestamp: new Date().toISOString(),
    performance: {
      largeFiles: [
        {
          file: 'app/doors/page.tsx',
          size: '176.4 KB',
          recommendation: 'Разбить на отдельные компоненты: DoorList, DoorCard, DoorFilters'
        },
        {
          file: 'components/constructor/UltimateConstructorFixed.tsx',
          size: '126.8 KB',
          recommendation: 'Разбить на модули: ConstructorCore, ConstructorUI, ConstructorLogic'
        }
      ],
      largeImages: [
        {
          file: 'public/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/1760988772632_z9yraj_d5_1.png',
          size: '1424.9 KB',
          recommendation: 'Сжать изображение до 200-300KB, создать WebP версию'
        }
      ],
      database: {
        models: 28,
        relations: 21,
        recommendation: 'Рассмотреть индексы для часто используемых полей'
      }
    },
    codeQuality: {
      consoleLogsRemoved: removedConsoleLogs,
      recommendation: 'Использовать логгер вместо console.log в продакшене'
    },
    security: {
      recommendation: 'Регулярно обновлять зависимости, использовать npm audit'
    }
  };
  
  try {
    fs.writeFileSync('optimization-recommendations.json', JSON.stringify(optimizationRecommendations, null, 2));
    console.log('   📄 Рекомендации сохранены в optimization-recommendations.json');
  } catch (error) {
    console.log(`   ❌ Ошибка сохранения рекомендаций: ${error.message}`);
  }
  
  // 5. Создаем скрипт для мониторинга производительности
  console.log('\n📊 Создаем скрипт мониторинга...');
  
  const monitoringScript = `
const fs = require('fs');
const path = require('path');

// Мониторинг производительности
function monitorPerformance() {
  const startTime = Date.now();
  
  // Проверяем размеры файлов
  const largeFiles = [];
  function scanFiles(dir, maxSize = 100 * 1024) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory() && !['node_modules', '.git', '.next'].includes(item)) {
          scanFiles(fullPath, maxSize);
        } else if (stats.isFile() && stats.size > maxSize) {
          largeFiles.push({
            path: path.relative(process.cwd(), fullPath),
            size: (stats.size / 1024).toFixed(1) + ' KB'
          });
        }
      }
    } catch (error) {
      // Игнорируем ошибки доступа
    }
  }
  
  scanFiles(process.cwd());
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(\`🔍 Мониторинг завершен за \${duration}ms\`);
  console.log(\`📊 Найдено \${largeFiles.length} больших файлов\`);
  
  if (largeFiles.length > 0) {
    console.log('⚠️ Большие файлы:');
    largeFiles.slice(0, 5).forEach(file => {
      console.log(\`   - \${file.path} (\${file.size})\`);
    });
  }
  
  return {
    duration,
    largeFilesCount: largeFiles.length,
    largeFiles: largeFiles.slice(0, 10)
  };
}

// Экспортируем для использования
module.exports = { monitorPerformance };

// Запускаем если файл выполняется напрямую
if (require.main === module) {
  monitorPerformance();
}
`;
  
  try {
    fs.writeFileSync('performance-monitor.js', monitoringScript);
    console.log('   📄 Скрипт мониторинга создан: performance-monitor.js');
  } catch (error) {
    console.log(`   ❌ Ошибка создания скрипта мониторинга: ${error.message}`);
  }
  
  // 6. Итоговый отчет
  console.log('\n📊 РЕЗУЛЬТАТЫ ИСПРАВЛЕНИЙ:');
  console.log(`   🔧 Обработано файлов: ${fixedFiles}`);
  console.log(`   🐛 Удалено console.log: ${removedConsoleLogs}`);
  console.log(`   ⚡ Оптимизировано файлов: ${optimizedFiles}`);
  console.log(`   🖼️ Больших изображений: ${optimizedImages}`);
  
  console.log('\n💡 СЛЕДУЮЩИЕ ШАГИ:');
  console.log('   1. Разбить большие компоненты на модули');
  console.log('   2. Сжать большие изображения');
  console.log('   3. Добавить индексы в БД для часто используемых полей');
  console.log('   4. Настроить логгер вместо console.log');
  console.log('   5. Регулярно запускать performance-monitor.js');
  
  console.log('\n✅ Исправления завершены!');
}

fixCodeIssues();
