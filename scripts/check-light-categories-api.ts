// Скрипт проверки категорий "Свет" через API
// Использование: npm run check:light-categories-api

const API_URL = 'http://130.193.40.35:3001/api/catalog/categories/tree';

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
function findCategoriesInTree(tree: any[], rootCategoryNames: string[], foundCategories: any[] = [], rootCategoryId: string | null = null): { rootCategory: any | null, allCategories: any[] } {
  for (const category of tree) {
    const nameLower = category.name.toLowerCase();
    const isRootCategory = rootCategoryNames.some(rootName => 
      nameLower.includes(rootName.toLowerCase()) || rootName.toLowerCase().includes(nameLower)
    );

    if (isRootCategory && !category.parent_id) {
      rootCategoryId = category.id;
      foundCategories.push(category);
    } else if (rootCategoryId && category.parent_id) {
      // Проверяем, является ли эта категория подкатегорией корневой
      if (category.path && category.path.includes(rootCategoryId)) {
        foundCategories.push(category);
      }
    }

    // Рекурсивно обходим дочерние категории
    if (category.children && category.children.length > 0) {
      const result = findCategoriesInTree(category.children, rootCategoryNames, foundCategories, rootCategoryId);
      rootCategoryId = result.rootCategoryId || rootCategoryId;
    }
  }

  const rootCategory = foundCategories.find(c => !c.parent_id && rootCategoryNames.some(rn => c.name.toLowerCase().includes(rn.toLowerCase())));
  return { rootCategory, allCategories: foundCategories };
}

async function checkLightCategoriesViaAPI() {
  console.log('\n🔍 Проверка категорий "Свет" через API...\n');
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

    // 1. Ищем корневую категорию "Свет"
    console.log('\n📌 Шаг 1: Поиск корневой категории "Свет"...\n');
    
    const { rootCategory, allCategories } = findCategoriesInTree(tree, ROOT_CATEGORY_NAMES);

    if (!rootCategory) {
      console.log('❌ Корневая категория "Свет" / "Освещение" НЕ НАЙДЕНА в БД');
      console.log('   ➕ Нужно создать: "Свет" или "Освещение" (root level 0)\n');
    } else {
      console.log(`✅ Найдена корневая категория:`);
      console.log(`   - "${rootCategory.name}" (ID: ${rootCategory.id}, level: ${rootCategory.level})`);
      console.log(`     Товаров: ${rootCategory.products_count || 0}\n`);
    }

    // 2. Ищем все подкатегории
    console.log('\n📌 Шаг 2: Поиск всех категорий, связанных со светом/освещением...\n');

    // Фильтруем категории, которые похожи на категории из YML
    const categoryNames = YML_CATEGORIES.map(c => c.name.toLowerCase().trim());
    const relatedCategories = allCategories.filter(cat => {
      const catNameLower = cat.name.toLowerCase().trim();
      return categoryNames.some(ymlName => 
        catNameLower === ymlName || 
        catNameLower.includes(ymlName) || 
        ymlName.includes(catNameLower)
      );
    });

    console.log(`✅ Найдено категорий в БД: ${relatedCategories.length}\n`);

    // 3. Сравниваем с YML категориями
    console.log('\n📌 Шаг 3: Сравнение с категориями из YML файла...\n');
    
    const matchedCategories: Array<{ yml: typeof YML_CATEGORIES[0], db?: any }> = [];
    const missingCategories: typeof YML_CATEGORIES = [];

    for (const ymlCat of YML_CATEGORIES) {
      const ymlNameLower = ymlCat.name.toLowerCase().trim();
      
      const exactMatch = relatedCategories.find(
        dbCat => dbCat.name.toLowerCase().trim() === ymlNameLower
      );

      if (exactMatch) {
        matchedCategories.push({ yml: ymlCat, db: exactMatch });
      } else {
        const partialMatch = relatedCategories.find(
          dbCat => {
            const dbNameLower = dbCat.name.toLowerCase().trim();
            return dbNameLower.includes(ymlNameLower) || ymlNameLower.includes(dbNameLower);
          }
        );

        if (partialMatch) {
          matchedCategories.push({ yml: ymlCat, db: partialMatch });
        } else {
          missingCategories.push(ymlCat);
        }
      }
    }

    // 4. Выводим результаты
    console.log('='.repeat(80));
    console.log('\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ\n');
    console.log('='.repeat(80));

    console.log(`\n✅ Найдено в БД: ${matchedCategories.length} категорий\n`);
    
    if (matchedCategories.length > 0) {
      console.log('Категории, найденные в БД:');
      console.log('-'.repeat(80));
      
      for (const { yml, db } of matchedCategories) {
        if (db) {
          const isExactMatch = db.name.toLowerCase().trim() === yml.name.toLowerCase().trim();
          const matchIcon = isExactMatch ? '✅' : '⚠️';
          const matchNote = isExactMatch ? '' : ` (похоже на "${db.name}")`;
          
          console.log(`${matchIcon} ${yml.name}`);
          console.log(`   YML ID: ${yml.id}`);
          console.log(`   БД ID: ${db.id}`);
          console.log(`   БД название: "${db.name}"${matchNote}`);
          console.log(`   Уровень: ${db.level || 'N/A'}`);
          console.log(`   Товаров: ${db.products_count || 0}`);
          if (db.parent_id) {
            console.log(`   Родитель ID: ${db.parent_id}`);
          }
          console.log();
        }
      }
    }

    console.log('='.repeat(80));
    console.log(`\n❌ НЕ найдено в БД: ${missingCategories.length} категорий\n`);
    
    if (missingCategories.length > 0) {
      console.log('Категории, которые нужно добавить:');
      console.log('-'.repeat(80));
      
      missingCategories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (YML ID: ${cat.id})`);
      });

      // Группируем по типам
      console.log('\n' + '='.repeat(80));
      console.log('\n📋 ГРУППИРОВКА ОТСУТСТВУЮЩИХ КАТЕГОРИЙ:\n');
      
      const basicLighting = missingCategories.filter(c => 
        ['Люстра', 'Подвесной', 'Потолочный', 'Напольный', 'Настольный', 'Настенный', 'Встраиваемый'].some(
          keyword => c.name.includes(keyword)
        )
      );
      
      const specialized = missingCategories.filter(c =>
        ['Спот', 'Трековый', 'Прожектор', 'Ландшафтный', 'Садово-парковый', 'Парковый'].some(
          keyword => c.name.includes(keyword)
        )
      );
      
      const accessories = missingCategories.filter(c =>
        ['Аксессуар', 'Плафон', 'Комплектующие', 'Крепление'].some(
          keyword => c.name.includes(keyword)
        )
      );
      
      const control = missingCategories.filter(c =>
        ['Диммер', 'Выключатель', 'Контроллер', 'Панель управления', 'Пульт'].some(
          keyword => c.name.includes(keyword)
        )
      );
      
      const tracks = missingCategories.filter(c =>
        c.name.includes('Шинопровод')
      );
      
      const other = missingCategories.filter(c =>
        !basicLighting.includes(c) &&
        !specialized.includes(c) &&
        !accessories.includes(c) &&
        !control.includes(c) &&
        !tracks.includes(c)
      );

      if (basicLighting.length > 0) {
        console.log(`\n💡 Основные светильники (${basicLighting.length}):`);
        basicLighting.forEach(c => console.log(`   - ${c.name}`));
      }

      if (specialized.length > 0) {
        console.log(`\n🌟 Специализированные (${specialized.length}):`);
        specialized.forEach(c => console.log(`   - ${c.name}`));
      }

      if (accessories.length > 0) {
        console.log(`\n🔧 Комплектующие (${accessories.length}):`);
        accessories.forEach(c => console.log(`   - ${c.name}`));
      }

      if (control.length > 0) {
        console.log(`\n🎛️ Системы управления (${control.length}):`);
        control.forEach(c => console.log(`   - ${c.name}`));
      }

      if (tracks.length > 0) {
        console.log(`\n🔌 Шинопроводы (${tracks.length}):`);
        tracks.forEach(c => console.log(`   - ${c.name}`));
      }

      if (other.length > 0) {
        console.log(`\n📦 Прочее (${other.length}):`);
        other.forEach(c => console.log(`   - ${c.name}`));
      }
    }

    // 5. Статистика
    console.log('\n' + '='.repeat(80));
    console.log('\n📈 СТАТИСТИКА:\n');
    console.log(`   Всего категорий в YML: ${YML_CATEGORIES.length}`);
    console.log(`   Найдено в БД: ${matchedCategories.length}`);
    console.log(`   Отсутствует в БД: ${missingCategories.length}`);
    console.log(`   Процент покрытия: ${((matchedCategories.length / YML_CATEGORIES.length) * 100).toFixed(1)}%`);

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Проверка завершена!\n');

  } catch (error) {
    console.error('\n❌ Ошибка при проверке категорий:');
    console.error(error);
    if (error instanceof Error) {
      console.error(`   Сообщение: ${error.message}`);
    }
    process.exit(1);
  }
}

// Запускаем проверку
checkLightCategoriesViaAPI();

