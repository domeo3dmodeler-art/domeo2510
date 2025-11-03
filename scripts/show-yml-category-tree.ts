// Скрипт вывода дерева категорий из YML файла
// Использование: npm run show:yml-category-tree

import * as fs from 'fs';
import * as path from 'path';

const YML_FILE = path.join(process.cwd(), 'app', 'light', 'all.yml');

// Функция для чтения и парсинга YML файла (XML) - простое регулярное выражение
function parseYMLCategories(filePath: string): Array<{ id: string; name: string }> {
  const xmlContent = fs.readFileSync(filePath, 'utf-8');
  const categories: Array<{ id: string; name: string }> = [];
  
  // Ищем все теги <category id="...">...</category>
  const categoryRegex = /<category\s+id="([^"]+)">([^<]+)<\/category>/g;
  let match;
  
  while ((match = categoryRegex.exec(xmlContent)) !== null) {
    categories.push({
      id: match[1],
      name: match[2].trim()
    });
  }
  
  return categories;
}

// Функция для построения дерева категорий из YML
function buildCategoryTreeFromYML(categories: Array<{ id: string; name: string }>): void {
  console.log('\n🌳 ДЕРЕВО КАТЕГОРИЙ ИЗ YML ФАЙЛА\n');
  console.log('='.repeat(80));
  
  if (categories.length === 0) {
    console.log('❌ Категории не найдены в YML файле');
    return;
  }

  console.log(`\n📊 Всего категорий в YML: ${categories.length}\n`);
  console.log('='.repeat(80));
  console.log('\n📋 КАТЕГОРИИ ИЗ YML:\n');

  // Выводим все категории с их ID
  categories.forEach((cat, index: number) => {
    const categoryId = cat.id || '';
    const categoryName = cat.name || '';
    const idStr = categoryId.padStart(3, ' ');
    
    // Проверяем на дубликаты ID
    const duplicates = categories.filter((c) => {
      return c.id === categoryId && c !== cat;
    });
    
    const duplicateMark = duplicates.length > 0 ? ' ⚠️ ДУБЛИКАТ ID' : '';
    
    console.log(`${(index + 1).toString().padStart(3, ' ')}. [ID: ${idStr}] ${categoryName}${duplicateMark}`);
  });

  // Группируем категории по типам
  console.log('\n' + '='.repeat(80));
  console.log('\n📂 ГРУППИРОВКА КАТЕГОРИЙ:\n');

  const basicLighting = categories.filter((cat) => {
    const name = cat.name || '';
    return ['Люстра', 'Подвесной', 'Потолочный', 'Напольный', 'Настольный', 'Настенный', 'Встраиваемый'].some(
      keyword => name.includes(keyword)
    );
  });

  const specialized = categories.filter((cat) => {
    const name = cat.name || '';
    return ['Спот', 'Трековый', 'Прожектор', 'Ландшафтный', 'Садово-парковый', 'Парковый'].some(
      keyword => name.includes(keyword)
    );
  });

  const accessories = categories.filter((cat) => {
    const name = cat.name || '';
    return ['Аксессуар', 'Плафон', 'Комплектующие', 'Крепление'].some(
      keyword => name.includes(keyword)
    );
  });

  const control = categories.filter((cat) => {
    const name = cat.name || '';
    return ['Диммер', 'Выключатель', 'Контроллер', 'Панель управления', 'Пульт'].some(
      keyword => name.includes(keyword)
    );
  });

  const tracks = categories.filter((cat) => {
    const name = cat.name || '';
    return name.includes('Шинопровод');
  });

  const lamps = categories.filter((cat) => {
    const name = cat.name || '';
    return name.includes('Лампочка') || name.includes('Лампа');
  });

  const led = categories.filter((cat) => {
    const name = cat.name || '';
    return name.includes('Светодиодная') || name.includes('Led') || name.includes('LED');
  });

  const lighting = categories.filter((cat) => {
    const name = cat.name || '';
    return name.includes('Подсветка') || name.includes('Подсвет');
  });

  const other = categories.filter((cat) => {
    const name = cat.name || '';
    return !basicLighting.includes(cat) &&
           !specialized.includes(cat) &&
           !accessories.includes(cat) &&
           !control.includes(cat) &&
           !tracks.includes(cat) &&
           !lamps.includes(cat) &&
           !led.includes(cat) &&
           !lighting.includes(cat);
  });

  if (basicLighting.length > 0) {
    console.log(`\n💡 Основные светильники (${basicLighting.length}):`);
    basicLighting.forEach((cat) => {
      console.log(`   [${cat.id}] ${cat.name}`);
    });
  }

  if (specialized.length > 0) {
    console.log(`\n🌟 Специализированные светильники (${specialized.length}):`);
    specialized.forEach((cat) => {
      console.log(`   [${cat.id}] ${cat.name}`);
    });
  }

  if (lamps.length > 0) {
    console.log(`\n💡 Лампы (${lamps.length}):`);
    lamps.forEach((cat) => {
      console.log(`   [${cat.id}] ${cat.name}`);
    });
  }

  if (led.length > 0) {
    console.log(`\n💎 Светодиодные (${led.length}):`);
    led.forEach((cat) => {
      console.log(`   [${cat.id}] ${cat.name}`);
    });
  }

  if (lighting.length > 0) {
    console.log(`\n✨ Подсветка (${lighting.length}):`);
    lighting.forEach((cat) => {
      console.log(`   [${cat.id}] ${cat.name}`);
    });
  }

  if (tracks.length > 0) {
    console.log(`\n🔌 Шинопроводы (${tracks.length}):`);
    tracks.forEach((cat) => {
      console.log(`   [${cat.id}] ${cat.name}`);
    });
  }

  if (accessories.length > 0) {
    console.log(`\n🔧 Комплектующие (${accessories.length}):`);
    accessories.forEach((cat) => {
      console.log(`   [${cat.id}] ${cat.name}`);
    });
  }

  if (control.length > 0) {
    console.log(`\n🎛️ Системы управления (${control.length}):`);
    control.forEach((cat) => {
      console.log(`   [${cat.id}] ${cat.name}`);
    });
  }

  if (other.length > 0) {
    console.log(`\n📦 Прочее (${other.length}):`);
    other.forEach((cat) => {
      console.log(`   [${cat.id}] ${cat.name}`);
    });
  }

  // Проверяем дубликаты ID
  const duplicateIds: Map<string, string[]> = new Map();
  categories.forEach((cat) => {
    const catId = cat.id || '';
    if (catId) {
      if (!duplicateIds.has(catId)) {
        duplicateIds.set(catId, []);
      }
      duplicateIds.get(catId)!.push(cat.name);
    }
  });

  const duplicates = Array.from(duplicateIds.entries()).filter(([id, names]) => names.length > 1);
  
  if (duplicates.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('\n⚠️  ДУБЛИКАТЫ ID В YML:\n');
    duplicates.forEach(([id, names]) => {
      console.log(`   ID "${id}" используется ${names.length} раз:`);
      names.forEach(name => {
        console.log(`      - ${name}`);
      });
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Дерево категорий из YML файла показано!\n');
}

function showYMLCategoryTree() {
  try {
    console.log('\n📄 Чтение YML файла...\n');
    console.log(`📂 Файл: ${YML_FILE}\n`);

    if (!fs.existsSync(YML_FILE)) {
      throw new Error(`Файл не найден: ${YML_FILE}`);
    }

    const categories = parseYMLCategories(YML_FILE);
    buildCategoryTreeFromYML(categories);

  } catch (error) {
    console.error('\n❌ Ошибка при чтении YML файла:');
    console.error(error);
    if (error instanceof Error) {
      console.error(`   Сообщение: ${error.message}`);
    }
    process.exit(1);
  }
}

// Запускаем показ дерева
showYMLCategoryTree();

