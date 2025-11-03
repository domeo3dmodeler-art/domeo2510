// Скрипт экспорта сопоставления категорий в Excel
// Использование: npm run export:category-mapping-excel

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

const MAPPING_FILE = path.join(process.cwd(), 'docs', 'LIGHT_CATEGORIES_MAPPING.json');
const OUTPUT_FILE = path.join(process.cwd(), 'docs', 'LIGHT_CATEGORIES_MAPPING.xlsx');

async function exportToExcel() {
  console.log('\n📊 Экспорт сопоставления категорий в Excel...\n');
  console.log('='.repeat(80));

  try {
    // Читаем JSON файл
    console.log(`📖 Чтение файла: ${MAPPING_FILE}\n`);
    
    if (!fs.existsSync(MAPPING_FILE)) {
      throw new Error(`Файл не найден: ${MAPPING_FILE}`);
    }

    const jsonContent = fs.readFileSync(MAPPING_FILE, 'utf-8');
    const mapping = JSON.parse(jsonContent);

    // Создаем новую книгу Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Domeo Category Mapping Tool';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Стили для заголовков
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

    const greenHeaderStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const redHeaderStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC00000' }
      },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // Лист 1: Сопоставления (Mappings)
    const mappingsSheet = workbook.addWorksheet('Сопоставления');
    
    mappingsSheet.columns = [
      { header: 'YML ID', key: 'yml_id', width: 12 },
      { header: 'YML Название', key: 'yml_name', width: 45 },
      { header: 'БД ID', key: 'db_id', width: 30 },
      { header: 'БД Название', key: 'db_name', width: 45 },
      { header: 'Тип совпадения', key: 'match_type', width: 18 },
      { header: 'Статус', key: 'status', width: 18 },
      { header: 'Уровень БД', key: 'db_level', width: 12 },
      { header: 'Товаров в БД', key: 'db_products_count', width: 15 },
      { header: 'Требует внимания', key: 'needs_attention', width: 18 }
    ];

    // Заголовки
    const mappingsHeaderRow = mappingsSheet.getRow(1);
    mappingsHeaderRow.values = [
      'YML ID', 'YML Название', 'БД ID', 'БД Название', 
      'Тип совпадения', 'Статус', 'Уровень БД', 'Товаров в БД', 'Требует внимания'
    ];
    mappingsHeaderRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Данные
    mapping.mappings.forEach((item: any, index: number) => {
      const row = mappingsSheet.addRow({
        yml_id: item.yml_id,
        yml_name: item.yml_name,
        db_id: item.db_id,
        db_name: item.db_name,
        match_type: item.match_type === 'exact' ? 'Точное' : item.match_type === 'partial' ? 'Частичное' : 'Нет',
        status: item.status === 'matched' ? 'Сопоставлено' : item.status === 'partial_match' ? 'Частичное' : 'Не найдено',
        db_level: item.db_level || '',
        db_products_count: item.db_products_count || 0,
        needs_attention: item.needs_attention ? 'Да' : 'Нет'
      });

      // Цветовое кодирование строк
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };

        if (colNumber === 5) { // Тип совпадения
          if (item.match_type === 'exact') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFC6EFCE' }
            };
          } else if (item.match_type === 'partial') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFEB9C' }
            };
          }
        }

        if (colNumber === 9 && item.needs_attention) { // Требует внимания
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' }
          };
          cell.font = { bold: true };
        }
      });
    });

    // Лист 2: Отсутствующие в БД (Missing in DB)
    const missingInDbSheet = workbook.addWorksheet('Отсутствуют в БД');
    
    missingInDbSheet.columns = [
      { header: 'YML ID', key: 'yml_id', width: 12 },
      { header: 'YML Название', key: 'yml_name', width: 60 },
      { header: 'Статус', key: 'status', width: 18 },
      { header: 'Действие', key: 'action_required', width: 20 }
    ];

    const missingInDbHeaderRow = missingInDbSheet.getRow(1);
    missingInDbHeaderRow.values = ['YML ID', 'YML Название', 'Статус', 'Действие'];
    missingInDbHeaderRow.eachCell((cell) => {
      cell.style = redHeaderStyle;
    });

    mapping.missing_in_db.forEach((item: any) => {
      const row = missingInDbSheet.addRow({
        yml_id: item.yml_id,
        yml_name: item.yml_name,
        status: item.status === 'not_found' ? 'Не найдено' : item.status,
        action_required: item.action_required === 'create' ? 'Создать' : item.action_required
      });

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
        
        // Подсветка строк
        if (row.number % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF2F2' }
          };
        }
      });
    });

    // Лист 3: Отсутствующие в YML (Missing in YML)
    const missingInYmlSheet = workbook.addWorksheet('Есть в БД, нет в YML');
    
    missingInYmlSheet.columns = [
      { header: 'БД ID', key: 'db_id', width: 30 },
      { header: 'БД Название', key: 'db_name', width: 60 },
      { header: 'Уровень', key: 'db_level', width: 12 },
      { header: 'Товаров', key: 'db_products_count', width: 15 },
      { header: 'Родитель ID', key: 'db_parent_id', width: 30 },
      { header: 'Статус', key: 'status', width: 18 },
      { header: 'Действие', key: 'action_required', width: 20 }
    ];

    const missingInYmlHeaderRow = missingInYmlSheet.getRow(1);
    missingInYmlHeaderRow.values = ['БД ID', 'БД Название', 'Уровень', 'Товаров', 'Родитель ID', 'Статус', 'Действие'];
    missingInYmlHeaderRow.eachCell((cell) => {
      cell.style = greenHeaderStyle;
    });

    mapping.missing_in_yml.forEach((item: any) => {
      const row = missingInYmlSheet.addRow({
        db_id: item.db_id,
        db_name: item.db_name,
        db_level: item.db_level || '',
        db_products_count: item.db_products_count || 0,
        db_parent_id: item.db_parent_id || '',
        status: item.status === 'not_in_yml' ? 'Нет в YML' : item.status,
        action_required: item.action_required === 'review' ? 'Проверить' : item.action_required
      });

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
        
        // Подсветка строк
        if (row.number % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2FFF2' }
          };
        }
      });
    });

    // Лист 4: Статистика
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
      { parameter: 'Дата создания', value: new Date(mapping.metadata.created_at).toLocaleString('ru-RU') },
      { parameter: 'Корневая категория', value: mapping.metadata.root_category?.name || 'Не найдена' },
      { parameter: 'ID корневой категории', value: mapping.metadata.root_category?.id || 'N/A' },
      { parameter: 'Уровень корневой категории', value: mapping.metadata.root_category?.level || 'N/A' },
      { parameter: 'Товаров в корневой категории', value: mapping.metadata.root_category?.products_count || 0 },
      { parameter: '', value: '' },
      { parameter: 'Всего категорий в YML', value: mapping.metadata.total_yml_categories },
      { parameter: 'Всего категорий в БД (под "Свет")', value: mapping.metadata.total_db_categories },
      { parameter: '', value: '' },
      { parameter: 'Точных совпадений', value: mapping.statistics.exact_matches },
      { parameter: 'Частичных совпадений', value: mapping.statistics.partial_matches },
      { parameter: 'Не найдено в БД', value: mapping.statistics.no_matches },
      { parameter: '', value: '' },
      { parameter: 'Процент покрытия', value: `${((mapping.statistics.exact_matches + mapping.statistics.partial_matches) / mapping.metadata.total_yml_categories * 100).toFixed(1)}%` },
      { parameter: 'Отсутствующих в БД', value: mapping.missing_in_db.length },
      { parameter: 'Есть в БД, нет в YML', value: mapping.missing_in_yml.length },
      { parameter: '', value: '' },
      { parameter: 'API URL', value: mapping.metadata.api_url }
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

        if (colNumber === 2 && item.parameter !== '' && typeof item.value === 'number') {
          cell.numFmt = '#,##0';
        }
      });
    });

    // Сохраняем файл
    console.log(`💾 Сохранение файла: ${OUTPUT_FILE}\n`);
    
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(OUTPUT_FILE);

    console.log('='.repeat(80));
    console.log('\n✅ Excel файл успешно создан!\n');
    console.log(`📄 Файл: ${OUTPUT_FILE}\n`);
    console.log('📋 Содержимое:\n');
    console.log('   1. Лист "Сопоставления" - все сопоставления YML ↔ БД');
    console.log('   2. Лист "Отсутствуют в БД" - категории, которые нужно создать');
    console.log('   3. Лист "Есть в БД, нет в YML" - категории для проверки');
    console.log('   4. Лист "Статистика" - общая статистика\n');
    console.log('='.repeat(80));
    console.log('\n✅ Готово!\n');

  } catch (error) {
    console.error('\n❌ Ошибка при экспорте в Excel:');
    console.error(error);
    if (error instanceof Error) {
      console.error(`   Сообщение: ${error.message}`);
    }
    process.exit(1);
  }
}

// Запускаем экспорт
exportToExcel();

