const XLSX = require('xlsx');
const path = require('path');

async function extractExcelHeaders() {
  try {
    console.log('🔍 Извлекаем заголовки из Excel файла...\n');
    
    // Путь к Excel файлу
    const excelPath = path.join(__dirname, '..', 'прайс', 'Прайс Двери 01.xlsx');
    
    console.log('📁 Путь к файлу:', excelPath);
    
    // Читаем Excel файл
    const workbook = XLSX.readFile(excelPath);
    
    console.log('📋 Доступные листы:', workbook.SheetNames);
    
    // Берем первый лист (обычно "Каталог" или первый лист)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`📄 Работаем с листом: "${sheetName}"\n`);
    
    // Получаем диапазон данных
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`📊 Диапазон данных: ${worksheet['!ref']}`);
    console.log(`📊 Строк: ${range.e.r + 1}, Колонок: ${range.e.c + 1}\n`);
    
    // Извлекаем заголовки из первой строки
    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      const header = cell ? cell.v : '';
      headers.push(header);
    }
    
    console.log('🏷️ ЗАГОЛОВКИ КОЛОНОК:');
    console.log('='.repeat(50));
    
    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index); // A, B, C, ...
      console.log(`${columnLetter.padEnd(3)}: "${header}"`);
    });
    
    console.log('='.repeat(50));
    console.log(`📊 Всего заголовков: ${headers.length}\n`);
    
    // Группируем заголовки по типам
    console.log('📋 ГРУППИРОВКА ЗАГОЛОВКОВ:');
    console.log('='.repeat(50));
    
    const grouped = {
      'Идентификация': [],
      'Основные параметры': [],
      'Размеры': [],
      'Ценообразование': [],
      'Дополнительные': [],
      'Пустые': []
    };
    
    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      const headerStr = String(header).trim();
      
      if (!headerStr) {
        grouped['Пустые'].push(`${columnLetter}: "${headerStr}"`);
      } else if (headerStr.toLowerCase().includes('артикул') || 
                 headerStr.toLowerCase().includes('номер') ||
                 headerStr.toLowerCase().includes('код')) {
        grouped['Идентификация'].push(`${columnLetter}: "${headerStr}"`);
      } else if (headerStr.toLowerCase().includes('модель') ||
                 headerStr.toLowerCase().includes('стиль') ||
                 headerStr.toLowerCase().includes('покрытие') ||
                 headerStr.toLowerCase().includes('цвет') ||
                 headerStr.toLowerCase().includes('тип') ||
                 headerStr.toLowerCase().includes('конструкция') ||
                 headerStr.toLowerCase().includes('фабрика') ||
                 headerStr.toLowerCase().includes('коллекция')) {
        grouped['Основные параметры'].push(`${columnLetter}: "${headerStr}"`);
      } else if (headerStr.toLowerCase().includes('ширина') ||
                 headerStr.toLowerCase().includes('высота') ||
                 headerStr.toLowerCase().includes('толщина') ||
                 headerStr.toLowerCase().includes('/мм')) {
        grouped['Размеры'].push(`${columnLetter}: "${headerStr}"`);
      } else if (headerStr.toLowerCase().includes('цена') ||
                 headerStr.toLowerCase().includes('стоимость') ||
                 headerStr.toLowerCase().includes('ррц')) {
        grouped['Ценообразование'].push(`${columnLetter}: "${headerStr}"`);
      } else {
        grouped['Дополнительные'].push(`${columnLetter}: "${headerStr}"`);
      }
    });
    
    Object.entries(grouped).forEach(([category, items]) => {
      if (items.length > 0) {
        console.log(`\n${category}:`);
        items.forEach(item => console.log(`  ${item}`));
      }
    });
    
    console.log('\n' + '='.repeat(50));
    
    // Создаем маппинг для API
    console.log('\n🔧 МАППИНГ ДЛЯ API:');
    console.log('='.repeat(50));
    
    const apiMapping = {};
    headers.forEach((header, index) => {
      const headerStr = String(header).trim();
      if (headerStr) {
        // Создаем ключ для API
        const key = headerStr
          .toLowerCase()
          .replace(/[^a-zа-я0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        
        apiMapping[key] = headerStr;
      }
    });
    
    console.log('export const EXCEL_HEADERS = {');
    Object.entries(apiMapping).forEach(([key, value]) => {
      console.log(`  ${key.toUpperCase()}: '${value}',`);
    });
    console.log('} as const;\n');
    
    // Показываем первые несколько строк данных для понимания
    console.log('📊 ПЕРВЫЕ СТРОКИ ДАННЫХ:');
    console.log('='.repeat(50));
    
    for (let row = 1; row <= Math.min(3, range.e.r); row++) {
      console.log(`\nСтрока ${row + 1}:`);
      for (let col = range.s.c; col <= Math.min(range.s.c + 5, range.e.c); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        const value = cell ? cell.v : '';
        const columnLetter = String.fromCharCode(65 + col);
        console.log(`  ${columnLetter}: "${value}"`);
      }
      if (range.e.c > range.s.c + 5) {
        console.log(`  ... (еще ${range.e.c - range.s.c - 5} колонок)`);
      }
    }
    
    console.log('\n✅ Анализ завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка при извлечении заголовков:', error);
  }
}

extractExcelHeaders();

