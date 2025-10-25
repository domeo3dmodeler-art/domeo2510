const fs = require('fs');
const path = require('path');

function analyzeProductInterface() {
  console.log('🔍 АНАЛИЗ ИНТЕРФЕЙСА УПРАВЛЕНИЯ ТОВАРАМИ\n');

  // Анализируем основные файлы интерфейса
  const interfaceFiles = [
    'app/app/admin/catalog/page.tsx',
    'app/components/admin/TemplateManager.tsx',
    'app/components/admin/PriceListExporter.tsx',
    'app/app/admin/catalog/import/page.tsx'
  ];

  console.log('📁 АНАЛИЗ ФАЙЛОВ ИНТЕРФЕЙСА:');

  interfaceFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').length;
      const size = fs.statSync(file).size;
      
      console.log(`\n📄 ${file}:`);
      console.log(`   - Строк кода: ${lines}`);
      console.log(`   - Размер: ${(size / 1024).toFixed(2)} KB`);
      
      // Анализируем компоненты
      const componentMatches = content.match(/function\s+(\w+)/g) || [];
      const componentNames = componentMatches.map(match => match.replace('function ', ''));
      
      if (componentNames.length > 0) {
        console.log(`   - Компоненты: ${componentNames.join(', ')}`);
      }
      
      // Анализируем проблемы
      const issues = [];
      
      if (content.includes('console.log')) {
        issues.push('Отладочные сообщения');
      }
      
      if (content.includes('TODO') || content.includes('FIXME')) {
        issues.push('TODO комментарии');
      }
      
      if (content.includes('any')) {
        issues.push('Использование типа any');
      }
      
      if (content.includes('useState') && !content.includes('useCallback')) {
        issues.push('Возможные проблемы с производительностью');
      }
      
      if (issues.length > 0) {
        console.log(`   ⚠️  Проблемы: ${issues.join(', ')}`);
      } else {
        console.log(`   ✅ Проблем не найдено`);
      }
    } else {
      console.log(`\n❌ ${file}: файл не найден`);
    }
  });

  console.log('\n📊 СТАТИСТИКА ИНТЕРФЕЙСА:');
  
  // Подсчитываем общую статистику
  let totalLines = 0;
  let totalSize = 0;
  let totalComponents = 0;
  let totalIssues = 0;

  interfaceFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').length;
      const size = fs.statSync(file).size;
      
      totalLines += lines;
      totalSize += size;
      
      const componentMatches = content.match(/function\s+(\w+)/g) || [];
      totalComponents += componentMatches.length;
      
      if (content.includes('console.log') || content.includes('TODO') || content.includes('FIXME') || content.includes('any')) {
        totalIssues++;
      }
    }
  });

  console.log(`   - Всего строк кода: ${totalLines}`);
  console.log(`   - Общий размер: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`   - Компонентов: ${totalComponents}`);
  console.log(`   - Файлов с проблемами: ${totalIssues}`);

  console.log('\n💡 РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ:');
  console.log('   1. Убрать отладочные console.log');
  console.log('   2. Заменить тип any на конкретные типы');
  console.log('   3. Добавить useCallback для оптимизации');
  console.log('   4. Улучшить обработку ошибок');
  console.log('   5. Добавить загрузочные состояния');
  console.log('   6. Оптимизировать ререндеринг компонентов');
  console.log('   7. Добавить валидацию форм');
  console.log('   8. Улучшить мобильную адаптивность');

  console.log('\n🔧 ПЛАН УЛУЧШЕНИЙ:');
  console.log('   1. Рефакторинг компонентов каталога');
  console.log('   2. Добавление новых функций управления');
  console.log('   3. Улучшение UX/UI');
  console.log('   4. Оптимизация производительности');
  console.log('   5. Добавление тестов');
}

analyzeProductInterface();
