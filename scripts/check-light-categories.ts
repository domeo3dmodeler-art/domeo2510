import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Загружаем переменные окружения из .env файла
config({ path: '.env.local' });
config(); // Пробуем также .env

const prisma = new PrismaClient();

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
  { id: '050_2', name: 'Комплектующие к светодиодной ленте' }, // Дубликат ID, переименован
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

const ROOT_CATEGORY_NAME = 'Свет';
const ROOT_CATEGORY_NAMES = ['Свет', 'Светильники', 'Освещение', 'Light', 'Lights', 'свет', 'светильники', 'освещение', 'light', 'lights'];

async function checkLightCategories() {
  console.log('\n🔍 Проверка категорий "Свет" в базе данных...\n');
  console.log('=' .repeat(80));

  try {
    // 1. Проверяем наличие корневой категории "Свет" / "Освещение"
    console.log('\n📌 Шаг 1: Поиск корневой категории "Свет" / "Освещение"...\n');
    
    // Ищем корневые категории (без parent_id)
    const allRootCategories = await prisma.catalogCategory.findMany({
      where: {
        parent_id: null
      },
      include: {
        _count: {
          select: {
            products: true,
            subcategories: true
          }
        }
      }
    });

    // Фильтруем по названиям, связанным с "Освещение"
    const rootCategories = allRootCategories.filter(cat => {
      const nameLower = cat.name.toLowerCase();
      return ROOT_CATEGORY_NAMES.some(rootName => 
        nameLower.includes(rootName.toLowerCase()) || rootName.toLowerCase().includes(nameLower)
      );
    });

    if (rootCategories.length === 0) {
      console.log('❌ Корневая категория "Свет" / "Освещение" НЕ НАЙДЕНА в БД');
      console.log('   ➕ Нужно создать: "Свет" или "Освещение" (root level 0)\n');
    } else {
      console.log(`✅ Найдено корневых категорий: ${rootCategories.length}`);
      rootCategories.forEach(cat => {
        console.log(`   - "${cat.name}" (ID: ${cat.id}, level: ${cat.level})`);
        console.log(`     Товаров: ${cat._count.products}, Подкатегорий: ${cat._count.subcategories}`);
      });
      console.log();
    }

    // 2. Проверяем все категории, которые могут относиться к "Свет" / "Освещение"
    console.log('\n📌 Шаг 2: Поиск всех категорий, связанных со светом/освещением...\n');
    
    // Ищем корневую категорию и все её подкатегории
    let rootCategoryId: string | null = null;
    if (rootCategories.length > 0) {
      rootCategoryId = rootCategories[0].id;
    }

    // Ищем все категории (для полного поиска)
    const allCategories = await prisma.catalogCategory.findMany({
      include: {
        _count: {
          select: {
            products: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Фильтруем категории по двум критериям:
    // 1. Это подкатегории корневой категории (если она найдена)
    // 2. Или название похоже на категории из YML
    const categoryNames = YML_CATEGORIES.map(c => c.name.toLowerCase().trim());
    const existingCategories = allCategories.filter(cat => {
      // Проверка 1: путь содержит rootCategoryId
      if (rootCategoryId && cat.path.includes(rootCategoryId)) {
        return true;
      }
      
      // Проверка 2: название совпадает с YML категориями
      const catNameLower = cat.name.toLowerCase().trim();
      return categoryNames.some(ymlName => 
        catNameLower === ymlName || 
        catNameLower.includes(ymlName) || 
        ymlName.includes(catNameLower)
      );
    });

    console.log(`✅ Найдено категорий в БД: ${existingCategories.length}`);
    
    // 3. Сравниваем с YML категориями
    console.log('\n📌 Шаг 3: Сравнение с категориями из YML файла...\n');
    
    const existingCategoryNames = new Set(
      existingCategories.map(c => c.name.toLowerCase().trim())
    );
    
    const ymlCategoryNames = new Set(
      YML_CATEGORIES.map(c => c.name.toLowerCase().trim())
    );

    // Находим категории, которые есть в БД, но их названия могут не совпадать точно
    const matchedCategories: Array<{ yml: typeof YML_CATEGORIES[0], db?: any }> = [];
    const missingCategories: typeof YML_CATEGORIES = [];

    for (const ymlCat of YML_CATEGORIES) {
      const ymlNameLower = ymlCat.name.toLowerCase().trim();
      
      // Ищем точное совпадение
      const exactMatch = existingCategories.find(
        dbCat => dbCat.name.toLowerCase().trim() === ymlNameLower
      );

      if (exactMatch) {
        matchedCategories.push({ yml: ymlCat, db: exactMatch });
      } else {
        // Ищем частичное совпадение
        const partialMatch = existingCategories.find(
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
    console.log('=' .repeat(80));
    console.log('\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ\n');
    console.log('=' .repeat(80));

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
          console.log(`   Уровень: ${db.level}`);
          console.log(`   Товаров: ${db._count.products}`);
          if (db.parent) {
            console.log(`   Родитель: "${db.parent.name}" (${db.parent.id})`);
          }
          console.log();
        }
      }
    }

    console.log('=' .repeat(80));
    console.log(`\n❌ НЕ найдено в БД: ${missingCategories.length} категорий\n`);
    
    if (missingCategories.length > 0) {
      console.log('Категории, которые нужно добавить:');
      console.log('-'.repeat(80));
      
      missingCategories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (YML ID: ${cat.id})`);
      });

      // Группируем по типам для удобства
      console.log('\n' + '=' .repeat(80));
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
    console.log('\n' + '=' .repeat(80));
    console.log('\n📈 СТАТИСТИКА:\n');
    console.log(`   Всего категорий в YML: ${YML_CATEGORIES.length}`);
    console.log(`   Найдено в БД: ${matchedCategories.length}`);
    console.log(`   Отсутствует в БД: ${missingCategories.length}`);
    console.log(`   Процент покрытия: ${((matchedCategories.length / YML_CATEGORIES.length) * 100).toFixed(1)}%`);

    // 6. Категории, которые есть в БД, но не в YML
    const dbCategoryNames = new Set(
      existingCategories.map(c => c.name.toLowerCase().trim())
    );
    
    const extraCategories = existingCategories.filter(dbCat => {
      const dbNameLower = dbCat.name.toLowerCase().trim();
      return !Array.from(ymlCategoryNames).some(ymlName => {
        return ymlName === dbNameLower || 
               dbNameLower.includes(ymlName) || 
               ymlName.includes(dbNameLower);
      });
    });

    if (extraCategories.length > 0 && rootCategoryId) {
      console.log('\n' + '=' .repeat(80));
      console.log(`\nℹ️  Дополнительные категории в БД (${extraCategories.length}):\n`);
      console.log('   Категории, которые есть в БД под "Свет" / "Освещение", но не указаны в YML:');
      extraCategories.forEach(cat => {
        console.log(`   - "${cat.name}" (ID: ${cat.id}, товаров: ${cat._count.products})`);
      });
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n✅ Проверка завершена!\n');

  } catch (error) {
    console.error('\n❌ Ошибка при проверке категорий:');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем проверку
checkLightCategories()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

