// Скрипт создания файла сопоставления категорий БД и YML
// Использование: npm run create:category-mapping

import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://130.193.40.35:3001/api/catalog/categories/tree';
const OUTPUT_FILE = path.join(process.cwd(), 'docs', 'LIGHT_CATEGORIES_MAPPING.json');

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
function getAllCategoriesFromTree(tree: any[], result: any[] = []): any[] {
  for (const category of tree) {
    result.push(category);
    if (category.children && category.children.length > 0) {
      getAllCategoriesFromTree(category.children, result);
    }
  }
  return result;
}

// Функция поиска похожих категорий
function findSimilarCategory(ymlName: string, dbCategories: any[]): { category: any, matchType: 'exact' | 'partial' | 'none' } | null {
  const ymlNameLower = ymlName.toLowerCase().trim();
  
  // Точное совпадение
  const exactMatch = dbCategories.find(dbCat => 
    dbCat.name.toLowerCase().trim() === ymlNameLower
  );
  
  if (exactMatch) {
    return { category: exactMatch, matchType: 'exact' };
  }
  
  // Частичное совпадение
  const partialMatch = dbCategories.find(dbCat => {
    const dbNameLower = dbCat.name.toLowerCase().trim();
    return dbNameLower.includes(ymlNameLower) || ymlNameLower.includes(dbNameLower);
  });
  
  if (partialMatch) {
    return { category: partialMatch, matchType: 'partial' };
  }
  
  return null;
}

async function createCategoryMapping() {
  console.log('\n🔍 Создание файла сопоставления категорий...\n');
  console.log('='.repeat(80));

  try {
    console.log(`\n📡 Запрос к API: ${API_URL}\n`);

    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.categories) {
      throw new Error('Неверный формат ответа API');
    }

    const tree = data.categories;
    const allDBCategories = getAllCategoriesFromTree(tree);

    // Находим корневую категорию "Свет"
    const rootCategory = allDBCategories.find(cat => 
      !cat.parent_id && ROOT_CATEGORY_NAMES.some(rootName => 
        cat.name.toLowerCase().includes(rootName.toLowerCase())
      )
    );

    // Получаем все категории под "Свет"
    const lightCategories = rootCategory 
      ? allDBCategories.filter(cat => 
          cat.path && cat.path.includes(rootCategory.id) || cat.id === rootCategory.id
        )
      : allDBCategories.filter(cat => 
          ROOT_CATEGORY_NAMES.some(rootName => 
            cat.name.toLowerCase().includes(rootName.toLowerCase())
          )
        );

    // Создаем маппинг
    const mapping: any = {
      metadata: {
        created_at: new Date().toISOString(),
        root_category: rootCategory ? {
          id: rootCategory.id,
          name: rootCategory.name,
          level: rootCategory.level,
          products_count: rootCategory.products_count || 0
        } : null,
        total_yml_categories: YML_CATEGORIES.length,
        total_db_categories: lightCategories.length,
        api_url: API_URL
      },
      mappings: [] as any[],
      missing_in_db: [] as any[],
      missing_in_yml: [] as any[],
      statistics: {
        exact_matches: 0,
        partial_matches: 0,
        no_matches: 0
      }
    };

    // Сопоставляем категории из YML с категориями в БД
    for (const ymlCat of YML_CATEGORIES) {
      const match = findSimilarCategory(ymlCat.name, lightCategories);
      
      if (match) {
        mapping.mappings.push({
          yml_id: ymlCat.id,
          yml_name: ymlCat.name,
          db_id: match.category.id,
          db_name: match.category.name,
          match_type: match.matchType,
          db_level: match.category.level,
          db_products_count: match.category.products_count || 0,
          db_parent_id: match.category.parent_id || null,
          db_path: match.category.path || null,
          status: match.matchType === 'exact' ? 'matched' : 'partial_match',
          needs_attention: match.matchType !== 'exact'
        });
        
        if (match.matchType === 'exact') {
          mapping.statistics.exact_matches++;
        } else {
          mapping.statistics.partial_matches++;
        }
      } else {
        mapping.missing_in_db.push({
          yml_id: ymlCat.id,
          yml_name: ymlCat.name,
          status: 'not_found',
          action_required: 'create'
        });
        mapping.statistics.no_matches++;
      }
    }

    // Находим категории в БД, которых нет в YML
    const ymlCategoryNames = new Set(YML_CATEGORIES.map(c => c.name.toLowerCase().trim()));
    
    for (const dbCat of lightCategories) {
      if (dbCat.id === rootCategory?.id) continue; // Пропускаем корневую категорию
      
      const dbNameLower = dbCat.name.toLowerCase().trim();
      const isInYml = Array.from(ymlCategoryNames).some(ymlName => 
        dbNameLower === ymlName || 
        dbNameLower.includes(ymlName) || 
        ymlName.includes(dbNameLower)
      );
      
      if (!isInYml) {
        mapping.missing_in_yml.push({
          db_id: dbCat.id,
          db_name: dbCat.name,
          db_level: dbCat.level,
          db_products_count: dbCat.products_count || 0,
          db_parent_id: dbCat.parent_id || null,
          db_path: dbCat.path || null,
          status: 'not_in_yml',
          action_required: 'review'
        });
      }
    }

    // Сохраняем в файл
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2), 'utf-8');

    console.log('\n✅ Файл сопоставления создан успешно!\n');
    console.log(`📄 Файл: ${OUTPUT_FILE}\n`);
    console.log('='.repeat(80));
    console.log('\n📊 СТАТИСТИКА:\n');
    console.log(`   Всего категорий в YML: ${YML_CATEGORIES.length}`);
    console.log(`   Всего категорий в БД (под "Свет"): ${lightCategories.length}`);
    console.log(`   Точных совпадений: ${mapping.statistics.exact_matches}`);
    console.log(`   Частичных совпадений: ${mapping.statistics.partial_matches}`);
    console.log(`   Не найдено в БД: ${mapping.missing_in_db.length}`);
    console.log(`   Есть в БД, но нет в YML: ${mapping.missing_in_yml.length}`);
    
    if (rootCategory) {
      console.log(`\n   Корневая категория: "${rootCategory.name}" (ID: ${rootCategory.id})`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 Структура файла:\n');
    console.log('   - metadata: информация о проверке');
    console.log('   - mappings: сопоставление YML -> БД');
    console.log('   - missing_in_db: категории из YML, которых нет в БД');
    console.log('   - missing_in_yml: категории из БД, которых нет в YML');
    console.log('   - statistics: статистика сопоставления');
    console.log('\n✅ Готово!\n');

  } catch (error) {
    console.error('\n❌ Ошибка при создании файла сопоставления:');
    console.error(error);
    if (error instanceof Error) {
      console.error(`   Сообщение: ${error.message}`);
    }
    process.exit(1);
  }
}

// Запускаем создание файла
createCategoryMapping();

