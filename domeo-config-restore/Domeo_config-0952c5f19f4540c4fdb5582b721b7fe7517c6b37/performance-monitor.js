
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
  
  console.log(`🔍 Мониторинг завершен за ${duration}ms`);
  console.log(`📊 Найдено ${largeFiles.length} больших файлов`);
  
  if (largeFiles.length > 0) {
    console.log('⚠️ Большие файлы:');
    largeFiles.slice(0, 5).forEach(file => {
      console.log(`   - ${file.path} (${file.size})`);
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
