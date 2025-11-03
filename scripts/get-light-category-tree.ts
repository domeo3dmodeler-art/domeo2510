// Скрипт получения полного дерева категории "Свет" и сравнения с YML
// Использование: npm run get:light-category-tree

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

const API_URL = 'http://130.193.40.35:3001/api/catalog/categories/tree';
const OUTPUT_FILE = path.join(process.cwd(), 'docs', 'LIGHT_CATEGORY_TREE.xlsx');
const JSON_OUTPUT = path.join(process.cwd(), 'docs', 'LIGHT_CATEGORY_TREE.json');

// Категории из YML файла app/light/all.yml
const YML_CATEGORIES = [
  { id: '001', name: 'Люстра' },
  { id: '002', name: 'Подвесной светильник' },
  { id: '003', name: 'Потолочный светильник' },
  { id: '004', name: 'Напольный светильник (торшер)' },
  { id: '005', name: 'Настольный светильник' },
  { id: '006', name: 'Настенный светильник (бра)' },
  { id: '007', name: 'Встраиваемый светильник' },
  { id: '008', name: 'Спот' },
  { id: '009', name: 'Трековый светильник' },
  { id: '010', name: 'Подсветка' },
  { id: '011', name: 'Ландшафтный светильник' },
  { id: '013', name: 'Подсветка для лестниц' },
  { id: '020', name: 'Лампочка' },
  { id: '030', name: 'Аксессуар' },
  { id: '033', name: 'Универсальное крепление' },
  { id: '045', name: 'Аксессуар для встраиваемого светильника' },
  { id: '046', name: 'Плафон' },
  { id: '047', name: 'Пульт для управления освещением' },
  { id: '048', name: 'WIFI модуль' },
  { id: '049', name: 'Светодиодная лента' },
  { id: '050', name: 'Комплектующие к светодиодной ленте с токоведущими элементами' },
  { id: '050_2', name: 'Комплектующие к светодиодной ленте' },
  { id: '051', name: 'Аккумуляторный светильник' },
  { id: '052', name: 'Шинопровод' },
  { id: '054', name: 'Архитектурная подсветка' },
  { id: '055', name: 'Садово-парковый светильник' },
  { id: '056', name: 'Трековый подвесной светильник' },
  { id: '057', name: 'Гибкий неон' },
  { id: '058', name: 'Комплектующие для гибкого неона' },
  { id: '059', name: 'Шинопровод встраиваемый' },
  { id: '060', name: 'Шинопровод встраиваемый для натяжного потолка' },
  { id: '061', name: 'Шинопровод накладной' },
  { id: '062', name: 'Шинопровод накладной/подвесной' },
  { id: '063', name: 'Комплектующие для встраиваемой трековой системы' },
  { id: '064', name: 'Комплектующие для накладной трековой системы' },
  { id: '065', name: 'Комплектующие для светильника' },
  { id: '066', name: 'Комплектующие для трековой системы' },
  { id: '067', name: 'Комплектующие для трекового светильника' },
  { id: '068', name: 'Датчики движения и освещенности' },
  { id: '069', name: 'Уличная розетка' },
  { id: '070', name: 'Токопроводящая текстильная лента' },
  { id: '071', name: 'Комплектующие для текстильной подвесной системы' },
  { id: '073', name: 'Led модуль' },
  { id: '079', name: 'Прожектор' },
  { id: '081', name: 'Светильник' },
  { id: '083', name: 'Токоведущий светильник для уличной трековой системы' },
  { id: '084', name: 'Комплектующие для уличной трековой системы' },
  { id: '085', name: 'Уличный трековый светильник' },
  { id: '086', name: 'Парковый светильник' },
  { id: '087', name: 'Столб для паркового светильника' },
  { id: '089', name: 'Готовая конструкция (набор)' },
  { id: '094', name: 'Профиль' },
  { id: '095', name: 'Диммер' },
  { id: '096', name: 'Выключатель' },
  { id: '097', name: 'Мастер контроллер' },
  { id: '099', name: 'Роторная беспроводная панель управления' },
  { id: '100', name: 'Контроллер' },
  { id: '101', name: 'Роторная панель управления' },
  { id: '103', name: 'Панель управления' },
  { id: '106', name: 'Пульт' },
  { id: '107', name: 'Источник напряжения' },
  { id: '108', name: 'Источник тока' },
  { id: '111', name: 'Усилитель' },
  { id: '114', name: 'Комплектующие для профиля' },
  { id: '125', name: 'Комплектующие для систем освещения с токоведущими элементами' },
  { id: '126', name: 'Комплектующие для уличной трековой системы с токоведущими элементами' },
];

const ROOT_CATEGORY_NAMES = ['Свет', 'Светильники', 'Освещение', 'Light', 'Lights', 'свет', 'светильники', 'освещение', 'light', 'lights'];

// Функция для рекурсивного обхода дерева категорий
function getAllCategoriesFromTree(tree: any[], result: any[] = [], level: number = 0): any[] {
  for (const category of tree) {
    result.push({ ...category, tree_level: level });
    if (category.children && category.children.length > 0) {
      getAllCategoriesFromTree(category.children, result, level + 1);
    }
  }
  return result;
}

// Функция для построения полного дерева (с отступами для отображения)
function buildTreeDisplay(category: any, level: number = 0): any {
  const indent = '  '.repeat(level);
  const display = {
    level,
    indent,
    id: category.id,
    name: category.name,
    products_count: category.products_count || 0,
    level_db: category.level || 0,
    parent_id: category.parent_id || null,
    path: category.path || null,
    yml_match: null as any,
    children: [] as any[]
  };

  // Ищем совпадение в YML
  const ymlCategory = YML_CATEGORIES.find(ymlCat => {
    const ymlNameLower = ymlCat.name.toLowerCase().trim();
    const dbNameLower = category.name.toLowerCase().trim();
    return ymlNameLower === dbNameLower || 
           dbNameLower.includes(ymlNameLower) || 
           ymlNameLower.includes(dbNameLower);
  });

  if (ymlCategory) {
    display.yml_match = {
      yml_id: ymlCategory.id,
      yml_name: ymlCategory.name,
      match_type: category.name.toLowerCase().trim() === ymlCategory.name.toLowerCase().trim() ? 'exact' : 'partial'
    };
  }

  if (category.children && category.children.length > 0) {
    for (const child of category.children) {
      display.children.push(buildTreeDisplay(child, level + 1));
    }
  }

  return display;
}

// Функция для плоского списка дерева (для Excel)
function flattenTree(category: any, parentName: string = '', level: number = 0): any[] {
  const result: any[] = [];
  const indent = '  '.repeat(level);
  
  // Ищем совпадение в YML
  const ymlCategory = YML_CATEGORIES.find(ymlCat => {
    const ymlNameLower = ymlCat.name.toLowerCase().trim();
    const dbNameLower = category.name.toLowerCase().trim();
    return ymlNameLower === dbNameLower || 
           dbNameLower.includes(ymlNameLower) || 
           ymlNameLower.includes(dbNameLower);
  });

  result.push({
    tree_path: indent + category.name,
    level: level,
    id: category.id,
    name: category.name,
    parent_name: parentName,
    parent_id: category.parent_id || '',
    level_db: category.level || 0,
    path: category.path || '',
    products_count: category.products_count || 0,
    yml_id: ymlCategory?.id || '',
    yml_name: ymlCategory?.name || '',
    match_type: ymlCategory 
      ? (category.name.toLowerCase().trim() === ymlCategory.name.toLowerCase().trim() ? 'Точное' : 'Частичное')
      : 'Не найдено',
    in_yml: ymlCategory ? 'Да' : 'Нет'
  });

  if (category.children && category.children.length > 0) {
    for (const child of category.children) {
      result.push(...flattenTree(child, category.name, level + 1));
    }
  }

  return result;
}

async function getLightCategoryTree() {
  console.log('\n🌳 Получение полного дерева категории "Свет"...\n');
  console.log('='.repeat(80));

  try {
    console.log(`📡 Запрос к API: ${API_URL}\n`);

    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.categories) {
      throw new Error('Неверный формат ответа API');
    }

    const tree = data.categories;

    // Находим корневую категорию "Свет"
    const rootCategory = tree.find((cat: any) => 
      !cat.parent_id && ROOT_CATEGORY_NAMES.some(rootName => 
        cat.name.toLowerCase().includes(rootName.toLowerCase())
      )
    );

    if (!rootCategory) {
      throw new Error('Корневая категория "Свет" не найдена');
    }

    console.log(`✅ Найдена корневая категория: "${rootCategory.name}" (ID: ${rootCategory.id})\n`);

    // Строим полное дерево
    const fullTree = buildTreeDisplay(rootCategory);
    const flatTree = flattenTree(rootCategory);

    // Сохраняем JSON
    const jsonData = {
      metadata: {
        created_at: new Date().toISOString(),
        root_category: {
          id: rootCategory.id,
          name: rootCategory.name,
          level: rootCategory.level || 0,
          products_count: rootCategory.products_count || 0
        },
        total_categories: flatTree.length,
        total_yml_categories: YML_CATEGORIES.length
      },
      tree: fullTree,
      flat_tree: flatTree,
      comparison: {
        matched: flatTree.filter(item => item.in_yml === 'Да').length,
        not_matched: flatTree.filter(item => item.in_yml === 'Нет').length,
        exact_matches: flatTree.filter(item => item.match_type === 'Точное').length,
        partial_matches: flatTree.filter(item => item.match_type === 'Частичное').length
      }
    };

    const jsonDir = path.dirname(JSON_OUTPUT);
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(jsonData, null, 2), 'utf-8');

    // Создаем Excel файл
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Domeo Category Tree Tool';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Стили
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // Лист 1: Полное дерево
    const treeSheet = workbook.addWorksheet('Дерево категорий');
    
    treeSheet.columns = [
      { header: 'Путь в дереве', key: 'tree_path', width: 60 },
      { header: 'Уровень', key: 'level', width: 10 },
      { header: 'ID БД', key: 'id', width: 30 },
      { header: 'Название БД', key: 'name', width: 50 },
      { header: 'Родитель', key: 'parent_name', width: 50 },
      { header: 'Уровень БД', key: 'level_db', width: 12 },
      { header: 'Товаров', key: 'products_count', width: 12 },
      { header: 'YML ID', key: 'yml_id', width: 12 },
      { header: 'YML Название', key: 'yml_name', width: 50 },
      { header: 'Тип совпадения', key: 'match_type', width: 18 },
      { header: 'В YML', key: 'in_yml', width: 10 }
    ];

    const treeHeaderRow = treeSheet.getRow(1);
    treeHeaderRow.values = ['Путь в дереве', 'Уровень', 'ID БД', 'Название БД', 'Родитель', 'Уровень БД', 'Товаров', 'YML ID', 'YML Название', 'Тип совпадения', 'В YML'];
    treeHeaderRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    flatTree.forEach((item) => {
      const row = treeSheet.addRow(item);
      
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };

        // Цветовое кодирование
        if (colNumber === 10) { // Тип совпадения
          if (item.match_type === 'Точное') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFC6EFCE' }
            };
          } else if (item.match_type === 'Частичное') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFEB9C' }
            };
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFC7CE' }
            };
          }
        }

        if (colNumber === 11 && item.in_yml === 'Нет') { // В YML
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' }
          };
          cell.font = { bold: true };
        }
      });
    });

    // Лист 2: Сравнение с YML
    const comparisonSheet = workbook.addWorksheet('Сравнение с YML');
    
    comparisonSheet.columns = [
      { header: 'YML ID', key: 'yml_id', width: 12 },
      { header: 'YML Название', key: 'yml_name', width: 50 },
      { header: 'В БД', key: 'in_db', width: 10 },
      { header: 'БД ID', key: 'db_id', width: 30 },
      { header: 'БД Название', key: 'db_name', width: 50 },
      { header: 'Тип совпадения', key: 'match_type', width: 18 },
      { header: 'Уровень БД', key: 'level_db', width: 12 },
      { header: 'Товаров в БД', key: 'products_count', width: 15 }
    ];

    const comparisonHeaderRow = comparisonSheet.getRow(1);
    comparisonHeaderRow.values = ['YML ID', 'YML Название', 'В БД', 'БД ID', 'БД Название', 'Тип совпадения', 'Уровень БД', 'Товаров в БД'];
    comparisonHeaderRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    YML_CATEGORIES.forEach((ymlCat) => {
      const dbCategory = flatTree.find(dbCat => {
        const dbNameLower = dbCat.name.toLowerCase().trim();
        const ymlNameLower = ymlCat.name.toLowerCase().trim();
        return dbNameLower === ymlNameLower || 
               dbNameLower.includes(ymlNameLower) || 
               ymlNameLower.includes(dbNameLower);
      });

      const row = comparisonSheet.addRow({
        yml_id: ymlCat.id,
        yml_name: ymlCat.name,
        in_db: dbCategory ? 'Да' : 'Нет',
        db_id: dbCategory?.id || '',
        db_name: dbCategory?.name || '',
        match_type: dbCategory 
          ? (dbCategory.match_type || 'Частичное')
          : 'Не найдено',
        level_db: dbCategory?.level_db || '',
        products_count: dbCategory?.products_count || 0
      });

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };

        if (colNumber === 3 && !dbCategory) { // В БД
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' }
          };
          cell.font = { bold: true };
        }

        if (colNumber === 6) { // Тип совпадения
          if (dbCategory?.match_type === 'Точное') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFC6EFCE' }
            };
          } else if (dbCategory?.match_type === 'Частичное') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFEB9C' }
            };
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFC7CE' }
            };
          }
        }
      });
    });

    // Лист 3: Статистика
    const statsSheet = workbook.addWorksheet('Статистика');
    
    statsSheet.columns = [
      { header: 'Параметр', key: 'parameter', width: 40 },
      { header: 'Значение', key: 'value', width: 30 }
    ];

    const statsHeaderRow = statsSheet.getRow(1);
    statsHeaderRow.values = ['Параметр', 'Значение'];
    statsHeaderRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    const statsData = [
      { parameter: 'Дата создания', value: new Date().toLocaleString('ru-RU') },
      { parameter: 'Корневая категория', value: rootCategory.name },
      { parameter: 'ID корневой категории', value: rootCategory.id },
      { parameter: 'Уровень корневой категории', value: rootCategory.level || 0 },
      { parameter: 'Товаров в корневой категории', value: rootCategory.products_count || 0 },
      { parameter: '', value: '' },
      { parameter: 'Всего категорий в БД (дерево)', value: flatTree.length },
      { parameter: 'Всего категорий в YML', value: YML_CATEGORIES.length },
      { parameter: '', value: '' },
      { parameter: 'Найдено в БД', value: jsonData.comparison.matched },
      { parameter: 'Не найдено в БД', value: jsonData.comparison.not_matched },
      { parameter: 'Точных совпадений', value: jsonData.comparison.exact_matches },
      { parameter: 'Частичных совпадений', value: jsonData.comparison.partial_matches },
      { parameter: '', value: '' },
      { parameter: 'Процент покрытия', value: `${((jsonData.comparison.matched / YML_CATEGORIES.length) * 100).toFixed(1)}%` },
      { parameter: 'Процент точных совпадений', value: `${((jsonData.comparison.exact_matches / YML_CATEGORIES.length) * 100).toFixed(1)}%` }
    ];

    statsData.forEach((item) => {
      const row = statsSheet.addRow(item);
      
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };

        if (colNumber === 1 && item.parameter !== '') {
          cell.font = { bold: true };
        }
      });
    });

    // Сохраняем Excel файл
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(OUTPUT_FILE);

    console.log('='.repeat(80));
    console.log('\n✅ Дерево категорий получено и сохранено!\n');
    console.log(`📄 Excel файл: ${OUTPUT_FILE}\n`);
    console.log(`📄 JSON файл: ${JSON_OUTPUT}\n`);
    console.log('📋 Структура Excel файла:\n');
    console.log('   1. Лист "Дерево категорий" - полное дерево с отступами');
    console.log('   2. Лист "Сравнение с YML" - сравнение всех категорий из YML с БД');
    console.log('   3. Лист "Статистика" - общая статистика\n');
    console.log('📊 Статистика:\n');
    console.log(`   Всего категорий в БД: ${flatTree.length}`);
    console.log(`   Всего категорий в YML: ${YML_CATEGORIES.length}`);
    console.log(`   Найдено в БД: ${jsonData.comparison.matched}`);
    console.log(`   Не найдено в БД: ${jsonData.comparison.not_matched}`);
    console.log(`   Точных совпадений: ${jsonData.comparison.exact_matches}`);
    console.log(`   Частичных совпадений: ${jsonData.comparison.partial_matches}`);
    console.log(`   Процент покрытия: ${((jsonData.comparison.matched / YML_CATEGORIES.length) * 100).toFixed(1)}%`);
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Готово!\n');

  } catch (error) {
    console.error('\n❌ Ошибка при получении дерева категорий:');
    console.error(error);
    if (error instanceof Error) {
      console.error(`   Сообщение: ${error.message}`);
    }
    process.exit(1);
  }
}

// Запускаем получение дерева
getLightCategoryTree();

