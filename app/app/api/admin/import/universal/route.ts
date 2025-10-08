import { NextRequest, NextResponse } from "next/server";
import * as XLSX from 'xlsx';
import { validateDocumentFile } from '../../../../../lib/validation/file-validation';

// Функция для создания динамической схемы категории на основе заголовков прайса
async function createDynamicSchema(categoryId: string, headers: string[]) {
  console.log('Creating dynamic schema for category:', categoryId, 'with headers:', headers);
  
  // Создаем свойства на основе заголовков
  const properties = headers.map((header, index) => {
    // Определяем тип поля по названию
    let type = 'text';
    let required = false;
    let unit = '';
    
    // Логика определения типа поля
    if (header.toLowerCase().includes('цена') || header.toLowerCase().includes('стоимость')) {
      type = 'number';
      unit = '₽';
      required = true;
    } else if (header.toLowerCase().includes('ширина') || header.toLowerCase().includes('высота') || 
               header.toLowerCase().includes('толщина') || header.toLowerCase().includes('/мм')) {
      type = 'number';
      unit = 'мм';
    } else if (header.toLowerCase().includes('фото') || header.toLowerCase().includes('ссылка')) {
      type = 'url';
    } else if (header.toLowerCase().includes('название') || header.toLowerCase().includes('модель') || 
               header.toLowerCase().includes('артикул') || header.toLowerCase().includes('поставщик')) {
      required = true;
    }
    
    return {
      key: `field_${index + 1}`,
      name: header,
      type: type,
      required: required,
      unit: unit
    };
  });
  
  // Создаем import_mapping
  const import_mapping = {};
  headers.forEach((header, index) => {
    import_mapping[`field_${index + 1}`] = header;
  });
  
  const schema = {
    properties: properties,
    import_mapping: import_mapping
  };
  
  console.log('Created dynamic schema:', schema);
  
  // Обновляем категорию в базе данных (пока что просто возвращаем схему)
  // В реальной системе здесь будет вызов API для обновления категории
  
  return schema;
}

// GET /api/admin/import/universal - Получить информацию об импорте
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    
    return NextResponse.json({
      ok: true,
      message: "API для универсального импорта прайсов",
      usage: "Используйте POST запрос с FormData для загрузки файлов",
      supported_formats: ["xlsx", "xls", "csv"],
      required_fields: {
        file: "Файл для импорта",
        category: "ID категории каталога",
        mode: "Режим обработки (headers или full)"
      },
      example: {
        method: "POST",
        body: "FormData с полями: file, category, mode, mapping"
      },
      current_category: category || "не указана"
    });
  } catch (error) {
    console.error('Error in GET /api/admin/import/universal:', error);
    return NextResponse.json(
      { error: "Ошибка получения информации об импорте" },
      { status: 500 }
    );
  }
}

// Универсальный импорт прайсов для любой категории товаров
export async function POST(req: NextRequest) {
  console.log('=== API CALL START ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  try {
    const formData = await req.formData();
    console.log('FormData received, keys:', Array.from(formData.keys()));
    
    const file = formData.get("file") as File;
    const category = formData.get("category") as string;
    const mapping = formData.get("mapping") as string;
    const mode = formData.get("mode") as string; // 'headers' или 'full'

    console.log('Parsed parameters:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      category, 
      mode,
      mapping
    });

    // Дополнительная проверка типа файла по расширению
    const fileName = file.name.toLowerCase();
    const isExcelFile = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsvFile = fileName.endsWith('.csv');
    
    console.log('File extension check:', {
      fileName: file.name,
      isExcelFile,
      isCsvFile,
      mimeType: file.type
    });

    if (!file) {
      console.log('ERROR: No file provided');
      return NextResponse.json(
        { error: "Файл не предоставлен" },
        { status: 400 }
      );
    }

    if (!category) {
      console.log('ERROR: No category provided');
      console.log('Available form data keys:', Array.from(formData.keys()));
      return NextResponse.json(
        { error: "Категория не указана" },
        { status: 400 }
      );
    }

    // Валидация файла
    const validation = validateDocumentFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Получаем информацию о категории из каталога
    const categoriesResponse = await fetch(`${req.nextUrl.origin}/api/catalog/categories`);
    const categoriesData = await categoriesResponse.json();
    console.log('Получены категории каталога:', categoriesData);
    
    // Ищем категорию в списке
    let categoryInfo = null;
    if (Array.isArray(categoriesData)) {
      categoryInfo = categoriesData.find((cat: any) => cat.id === category);
    } else if (categoriesData.categories && Array.isArray(categoriesData.categories)) {
      categoryInfo = categoriesData.categories.find((cat: any) => cat.id === category);
    }
    
    console.log('Найденная категория:', categoryInfo);
    console.log('CategoryInfo import_mapping:', categoryInfo?.import_mapping);

    if (!categoryInfo) {
      console.warn(`Категория "${category}" не найдена в каталоге, создаем базовую информацию`);
      // Создаем базовую информацию о категории
      categoryInfo = {
        id: category,
        name: `Категория ${category}`,
        properties: [],
        import_mapping: {}
      };
    }

    // Получаем шаблон импорта для этой категории
    let importTemplate = null;
    try {
      const templateResponse = await fetch(`${req.nextUrl.origin}/api/admin/import-templates?catalog_category_id=${category}`);
      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        if (templateData.success && templateData.templates && templateData.templates.length > 0) {
          importTemplate = templateData.templates[0];
          console.log('Found import template:', importTemplate);
        }
      }
    } catch (templateError) {
      console.log('No import template found or error:', templateError);
    }

    // Если режим "только заголовки", возвращаем только заголовки
    if (mode === 'headers') {
      console.log('Headers mode - processing file:', file.name, file.type, file.size);
      try {
        const buffer = await file.arrayBuffer();
        let workbook;
        
        if (file.type === 'text/csv' || isCsvFile) {
          console.log('Processing CSV file');
          // Для CSV файлов читаем как текст с правильной кодировкой
          const text = await file.text();
          console.log('CSV text length:', text.length);
          console.log('CSV first 200 chars:', text.substring(0, 200));
          
          const lines = text.split('\n').filter(line => line.trim());
          console.log('CSV lines count:', lines.length);
          
          if (lines.length === 0) {
            console.log('CSV file is empty');
            return NextResponse.json({ error: "CSV файл пустой" }, { status: 400 });
          }
          
          // Определяем разделитель
          const firstLine = lines[0];
          console.log('CSV first line:', firstLine);
          
          let delimiter = ',';
          if (firstLine.includes(';')) {
            delimiter = ';';
          } else if (firstLine.includes('\t')) {
            delimiter = '\t';
          }
          
          console.log('Detected delimiter:', delimiter);
          
          // Парсим заголовки с учетом кавычек
          const headers = (() => {
            const result = [];
            let current = '';
            let inQuotes = false;
            let i = 0;
            
            while (i < firstLine.length) {
              const char = firstLine[i];
              
              if (char === '"') {
                if (inQuotes && firstLine[i + 1] === '"') {
                  // Экранированная кавычка
                  current += '"';
                  i += 2;
                } else {
                  // Начало или конец кавычек
                  inQuotes = !inQuotes;
                  i++;
                }
              } else if (char === delimiter && !inQuotes) {
                // Разделитель вне кавычек
                result.push(current.trim());
                current = '';
                i++;
              } else {
                current += char;
                i++;
              }
            }
            
            // Добавляем последнее поле
            result.push(current.trim());
            return result;
          })();
          
          console.log('CSV headers extracted:', headers);
          
          // Создаем схему категории на основе заголовков
          const dynamicSchema = await createDynamicSchema(category, headers);
          
          return NextResponse.json({ 
            ok: true, 
            headers,
            schema: dynamicSchema,
            message: "Заголовки CSV файла успешно прочитаны"
          });
        } else {
          console.log('Processing Excel file');
          console.log('File details:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          });
          
          // Для Excel файлов - пробуем разные варианты чтения
          try {
            // Вариант 1: Чтение как array buffer
            workbook = XLSX.read(buffer, { type: 'array' });
            console.log('Excel workbook created successfully');
            console.log('Workbook details:', {
              sheetNames: workbook.SheetNames,
              sheetCount: workbook.SheetNames.length
            });
            
            // Пробуем все листы, если первый не содержит данных
            let headers: string[] = [];
            let usedSheet = '';
            
            for (const sheetName of workbook.SheetNames) {
              console.log(`Trying sheet: ${sheetName}`);
              const worksheet = workbook.Sheets[sheetName];
              console.log('Worksheet details:', {
                range: worksheet['!ref'],
                hasData: !!worksheet['!ref']
              });
              
              if (!worksheet['!ref']) {
                console.log(`Sheet ${sheetName} has no data range, skipping`);
                continue;
              }
              
              // Пробуем разные варианты чтения
              let jsonData;
              try {
                // Сначала пробуем с raw: true для сохранения оригинальных значений
                console.log('Trying sheet_to_json with raw: true...');
                jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
                console.log('Sheet to JSON (raw: true) result:', {
                  length: jsonData.length,
                  firstRow: jsonData[0],
                  firstFewRows: jsonData.slice(0, 3)
                });
                
                if (jsonData.length === 0) {
                  // Если не получилось, пробуем без raw
                  console.log('No data with raw: true, trying without raw...');
                  jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                  console.log('Sheet to JSON (no raw) result:', {
                    length: jsonData.length,
                    firstRow: jsonData[0],
                    firstFewRows: jsonData.slice(0, 3)
                  });
                }
              } catch (e) {
                console.log('Sheet to JSON failed, trying alternative method:', e);
                jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                console.log('Alternative method result:', {
                  length: jsonData.length,
                  firstRow: jsonData[0]
                });
              }
              
              if (jsonData.length === 0) {
                console.log(`Sheet ${sheetName} appears to be empty, trying next sheet`);
                continue;
              }
              
              // Читаем заголовки из первой строки
              let headerRowIndex = 0; // Всегда первая строка
              
              console.log(`Using first row (index 0) as headers from sheet ${sheetName}`);
              const headerRow = jsonData[0] as any[];
              console.log('Raw headers from first row:', headerRow);
              
              // Фильтруем пустые заголовки и заголовки типа _EMPTY_X
              const filteredHeaders = headerRow.filter(h => {
                if (h === null || h === undefined) {
                  console.log('Filtering out null/undefined header:', h);
                  return false;
                }
                if (typeof h === 'string') {
                  const trimmed = h.trim();
                  if (trimmed === '') {
                    console.log('Filtering out empty string header');
                    return false;
                  }
                  if (trimmed.startsWith('_EMPTY_')) {
                    console.log('Filtering out _EMPTY_ header:', trimmed);
                    return false;
                  }
                  if (trimmed.startsWith('__EMPTY')) {
                    console.log('Filtering out __EMPTY header:', trimmed);
                    return false;
                  }
                  console.log('Keeping valid string header:', trimmed);
                  return true;
                }
                // Для не-строковых значений тоже включаем
                console.log('Keeping non-string header:', h, typeof h);
                return true;
              }).map(h => String(h).trim());
              
              console.log('Final filtered headers:', filteredHeaders);
              console.log('Headers count:', filteredHeaders.length);
              console.log('All headers:', filteredHeaders.map((h, i) => `${i+1}. ${h}`).join(', '));
              
              if (filteredHeaders.length > 0) {
                headers = filteredHeaders;
                usedSheet = sheetName;
                break; // Нашли валидные заголовки, выходим из цикла
              }
            }
            
            if (headers.length === 0) {
              console.log('No valid headers found in any sheet, trying raw data approach');
              // Пробуем получить данные напрямую из первого листа
              const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
              const rawData = XLSX.utils.sheet_to_json(firstSheet, { raw: true });
              console.log('Raw data sample:', rawData.slice(0, 2));
              
              if (rawData.length > 0) {
                const firstRow = rawData[0];
                const rawHeaders = Object.keys(firstRow);
                console.log('Raw headers from object keys:', rawHeaders);
                
                // Фильтруем пустые заголовки и заголовки типа _EMPTY_X
                const filteredRawHeaders = rawHeaders.filter(h => {
                  if (!h || typeof h !== 'string') return false;
                  const trimmed = h.trim();
                  if (trimmed === '') return false;
                  if (trimmed.startsWith('_EMPTY_')) return false;
                  if (trimmed.startsWith('__EMPTY')) return false;
                  return true;
                });
                
                console.log('Filtered raw headers:', filteredRawHeaders);
                
                if (filteredRawHeaders.length > 0) {
                  return NextResponse.json({ 
                    ok: true, 
                    headers: filteredRawHeaders,
                    message: "Заголовки файла прочитаны из raw данных"
                  });
                }
              }
              
              // Если все методы не сработали, возвращаем ошибку с деталями
              return NextResponse.json({ 
                error: "Не удалось извлечь заголовки из Excel файла. Возможно, файл имеет нестандартный формат.",
                debug: {
                  sheetNames: workbook.SheetNames,
                  worksheetRange: workbook.SheetNames.map(name => ({
                    sheet: name,
                    range: workbook.Sheets[name]['!ref']
                  })),
                  firstSheetData: workbook.SheetNames.length > 0 ? 
                    XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }).slice(0, 3) : [],
                  rawHeaders: rawData.length > 0 ? Object.keys(rawData[0]) : []
                }
              }, { status: 400 });
            }
            
            // Создаем схему категории на основе заголовков
            const dynamicSchema = await createDynamicSchema(category, headers);
            
            return NextResponse.json({ 
              ok: true, 
              headers: headers,
              schema: dynamicSchema,
              message: `Заголовки файла успешно прочитаны из листа "${usedSheet}"`
            });
          } catch (excelError) {
            console.error('Excel parsing error:', excelError);
            console.error('Error details:', {
              message: excelError.message,
              stack: excelError.stack
            });
            
            // Пробуем альтернативный способ
            try {
              console.log('Trying alternative Excel parsing...');
              workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
              
              console.log('Alternative parsing result:', {
                length: jsonData.length,
                firstRow: jsonData[0]
              });
              
              if (jsonData.length > 0) {
                const headers = jsonData[0] as any[];
                
                // Фильтруем пустые заголовки и заголовки типа _EMPTY_X
                const filteredHeaders = headers.filter(h => {
                  if (h === null || h === undefined) return false;
                  if (typeof h === 'string') {
                    const trimmed = h.trim();
                    if (trimmed === '') return false;
                    if (trimmed.startsWith('_EMPTY_')) return false;
                    if (trimmed.startsWith('__EMPTY')) return false;
                    return true;
                  }
                  return true;
                }).map(h => String(h).trim());
                
                console.log('Alternative Excel headers:', filteredHeaders);
                console.log('Alternative original headers:', headers);
                
                if (filteredHeaders.length > 0) {
                  // Создаем схему категории на основе заголовков
                  const dynamicSchema = await createDynamicSchema(category, filteredHeaders);
                  
                  return NextResponse.json({ 
                    ok: true, 
                    headers: filteredHeaders,
                    schema: dynamicSchema,
                    message: "Заголовки файла прочитаны альтернативным способом"
                  });
                }
              }
            } catch (altError) {
              console.error('Alternative Excel parsing also failed:', altError);
            }
            
            return NextResponse.json({ 
              error: "Не удалось прочитать Excel файл. Проверьте формат файла.",
              debug: {
                originalError: excelError.message,
                fileSize: file.size,
                fileName: file.name
              }
            }, { status: 400 });
          }
        }
      } catch (error) {
        console.error('Ошибка чтения заголовков:', error);
        return NextResponse.json(
          { error: "Ошибка чтения файла. Проверьте формат файла." },
          { status: 400 }
        );
      }
    }

    // Парсим mapping если предоставлен
    let mappingConfig = categoryInfo.import_mapping; // Используем дефолтный mapping
    if (mapping) {
      try {
        mappingConfig = JSON.parse(mapping);
      } catch (e) {
        return NextResponse.json(
          { error: "Неверный формат mapping JSON" },
          { status: 400 }
        );
      }
    }

    // Если настройки импорта уже существуют, используем их
    if (categoryInfo.import_mapping && Object.keys(categoryInfo.import_mapping).length > 0) {
      console.log('Using existing import mapping:', categoryInfo.import_mapping);
      mappingConfig = categoryInfo.import_mapping;
    }

    // Если есть шаблон импорта, используем его данные для маппинга
    if (importTemplate && importTemplate.requiredFields) {
      console.log('Using import template for mapping');
      
      // Парсим templateFields если это строка
      let templateFields = importTemplate.requiredFields;
      if (typeof templateFields === 'string') {
        try {
          templateFields = JSON.parse(templateFields);
        } catch (e) {
          console.error('Error parsing requiredFields:', e);
          templateFields = [];
        }
      }
      
      // Проверяем, что templateFields является массивом
      if (!Array.isArray(templateFields) || templateFields.length === 0) {
        console.log('Template fields is not an array or empty, skipping template mapping');
      } else {
        const calculatorFields = templateFields.map((field: any) => field.fieldName || field);
        
        mappingConfig = {
          calculator_fields: calculatorFields,
          frontend_price: calculatorFields[0] // Используем первое поле как цену
        };
        
        // Также обновляем categoryInfo.properties для совместимости
        categoryInfo.properties = templateFields.map((field: any) => ({
          key: field.fieldName || field,
          name: field.displayName || field.fieldName || field,
          required: true
        }));

        // ОБНОВЛЯЕМ ШАБЛОН с fieldMappings
        if (mappingConfig && mappingConfig.fieldMappings) {
          console.log('🐨 Saving fieldMappings to template:', mappingConfig.fieldMappings);
          
          // Парсим существующий шаблон
          let existingTemplate = null;
          try {
            const existingTemplates = await prisma.importTemplate.findMany({
              where: { catalog_category_id: category }
            });
            existingTemplate = existingTemplates[0];
          } catch (error) {
            console.log('No existing template found, will create new one');
          }

          // Подготавливаем fieldMappings для сохранения
          const fieldMappingsData = mappingConfig.fieldMappings.map((mapping: any) => ({
            fieldName: mapping.fieldName,
            displayName: mapping.displayName,
            dataType: mapping.dataType,
            isRequired: mapping.isRequired,
            isVisible: mapping.isVisible !== undefined ? mapping.isVisible : true
          }));

          if (existingTemplate) {
            // Обновляем существующий шаблон
            await prisma.importTemplate.update({
              where: { id: existingTemplate.id },
              data: {
                field_mappings: JSON.stringify(fieldMappingsData),
                updated_at: new Date()
              }
            });
            console.log('✅ Updated existing template with fieldMappings');
          } else {
            // Создаем новый шаблон
            await prisma.importTemplate.create({
              data: {
                name: `Шаблон для ${categoryInfo.name || 'категории'}`,
                description: `Автоматически созданный шаблон`,
                catalog_category_id: category,
                field_mappings: JSON.stringify(fieldMappingsData),
                required_fields: JSON.stringify([
                  'Название товара',
                  'Цена',
                  ...templateFields.filter(f => f.name?.toLowerCase().includes('артикул')).map(f => f.name)
                ]),
                is_active: true
              }
            });
            console.log('✅ Created new template with fieldMappings');
          }
        }

        console.log('Generated mapping config from template:', mappingConfig);
        console.log('Updated category properties:', categoryInfo.properties);
      }
    }

    // Реальная обработка файла с библиотекой xlsx
    const buffer = await file.arrayBuffer();
    let workbook;
    
    if (file.type === 'text/csv') {
      // Для CSV файлов читаем как текст с правильной кодировкой
      const text = await file.text();
      console.log('CSV text length:', text.length);
      console.log('CSV first 200 chars:', text.substring(0, 200));
      
      const lines = text.split('\n').filter(line => line.trim());
      console.log('CSV lines count:', lines.length);
      
      if (lines.length === 0) {
        return NextResponse.json(
          { error: "CSV файл пустой" },
          { status: 400 }
        );
      }
      
      // Определяем разделитель
      const firstLine = lines[0];
      console.log('CSV first line:', firstLine);
      
      let delimiter = ',';
      if (firstLine.includes(';')) {
        delimiter = ';';
      } else if (firstLine.includes('\t')) {
        delimiter = '\t';
      }
      
      console.log('Detected delimiter:', delimiter);
      
      // Парсим CSV с учетом кавычек и разделителей
      const csvData = lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
          const char = line[i];
          
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Экранированная кавычка
              current += '"';
              i += 2;
            } else {
              // Начало или конец кавычек
              inQuotes = !inQuotes;
              i++;
            }
          } else if (char === delimiter && !inQuotes) {
            // Разделитель вне кавычек
            result.push(current.trim());
            current = '';
            i++;
          } else {
            current += char;
            i++;
          }
        }
        
        // Добавляем последнее поле
        result.push(current.trim());
        return result;
      });
      
      console.log('Parsed CSV data (first 3 rows):', csvData.slice(0, 3));
      
      workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(csvData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    } else {
      // Для Excel файлов используем стандартный парсер
      workbook = XLSX.read(buffer, { type: 'array' });
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: "Файл пустой или не содержит данных" },
        { status: 400 }
      );
    }

    // Первая строка - заголовки
    const rawHeaders = jsonData[0] as string[];
    // Очищаем заголовки от кавычек и лишних пробелов
    const headers = rawHeaders.map(header => 
      header ? header.toString().replace(/^["']|["']$/g, '').trim() : ''
    ).filter(header => header); // Убираем пустые заголовки
    
    const rows = jsonData.slice(1) as any[][];
    
    console.log('=== HEADERS PROCESSING ===');
    console.log('Raw headers:', rawHeaders);
    console.log('Cleaned headers:', headers);
    console.log('Headers count:', headers.length);

    // Валидация обязательных полей
    const requiredFields = categoryInfo.properties.filter((prop: any) => prop.required).map((prop: any) => prop.key);
    const errors: string[] = [];
    const products: any[] = [];
    
    console.log('=== IMPORT PROCESSING DEBUG ===');
    console.log('Headers:', headers);
    console.log('CategoryInfo properties:', categoryInfo.properties);
    console.log('Required fields:', requiredFields);
    console.log('Mapping config:', mappingConfig);
    console.log('Import template:', importTemplate);
    console.log('CategoryInfo import_mapping:', categoryInfo.import_mapping);
    
    // Fallback: если нет mappingConfig, создаем простой mapping на основе заголовков
    if (!mappingConfig || (typeof mappingConfig === 'object' && Object.keys(mappingConfig).length === 0)) {
      console.log('No mapping config found, creating fallback mapping from headers');
      mappingConfig = {};
      headers.forEach(header => {
        mappingConfig[header] = header; // Прямое соответствие заголовок -> поле
      });
      console.log('Fallback mapping config:', mappingConfig);
    }
    
    console.log('=== END IMPORT PROCESSING DEBUG ===');

    // Автоматическое создание шаблона при первой загрузке товаров
    // Также пересоздаем шаблон, если в нем слишком много полей (>200)
    const shouldRecreateTemplate = !importTemplate || 
      (importTemplate && importTemplate.required_fields && 
       JSON.parse(importTemplate.required_fields).length > 200);
    
    if (shouldRecreateTemplate && rows.length > 0) {
      if (importTemplate) {
        console.log('Пересоздаем шаблон - слишком много полей:', JSON.parse(importTemplate.required_fields).length);
      }
      console.log('=== AUTO-CREATING TEMPLATE ===');
      try {
        // Фильтруем заголовки для создания шаблона - исключаем служебные поля
        const filteredHeaders = headers.filter(header => {
          const lowerHeader = header.toLowerCase().trim();
          
          // Исключаем служебные поля
          const excludePatterns = [
            /^№$/,
            /^номер$/,
            /^id$/,
            /^ключ$/,
            /^уникальный/,
            /^системный/,
            /^служебный/,
            /^технический/,
            /^внутренний/,
            /^временный/,
            /^temp/,
            /^tmp/,
            /^test/,
            /^debug/,
            /^domeo_ссылка/,
            /^domeo_ссылк/,
            /^ссылка.*фото/,
            /^фото.*ссылка/,
            /^изображен/,
            /^картинк/,
            /^url/,
            /^http/,
            /^www\./,
            /^\.com/,
            /^\.ru/,
            /^\.org/,
            /^путь/,
            /^path/,
            /^file/,
            /^файл/,
            /^пустой/,
            /^empty/,
            /^null/,
            /^undefined/,
            /^неопределен/,
            /^\s*$/,
            /^[^а-яёa-z0-9\s]/i, // Начинается с не-буквы и не-цифры
            /^\d+$/ // Только цифры
          ];
          
          // Проверяем, не содержит ли заголовок исключаемые паттерны
          const shouldExclude = excludePatterns.some(pattern => pattern.test(lowerHeader));
          
          // Также исключаем слишком короткие или длинные заголовки
          const isValidLength = header.length >= 2 && header.length <= 100;
          
          return !shouldExclude && isValidLength;
        });
        
        console.log('Original headers count:', headers.length);
        console.log('Filtered headers count:', filteredHeaders.length);
        console.log('Filtered headers:', filteredHeaders.slice(0, 20)); // Показываем первые 20
        
        // Ограничиваем количество полей в шаблоне (максимум 100 полей)
        const maxFields = 100;
        const finalHeaders = filteredHeaders.slice(0, maxFields);
        
        if (filteredHeaders.length > maxFields) {
          console.log(`Ограничение: взяты только первые ${maxFields} полей из ${filteredHeaders.length} отфильтрованных`);
        }
        
        // Создаем шаблон на основе отфильтрованных заголовков
        const templateFields = finalHeaders.map((header, index) => {
          // Определяем тип поля на основе названия
          let fieldType = 'text';
          let isRequired = false;
          let isForCalculator = false;
          
          const lowerHeader = header.toLowerCase();
          
          // Обязательные поля
          if (lowerHeader.includes('название') || 
              lowerHeader.includes('имя') || 
              lowerHeader.includes('наименование') ||
              lowerHeader.includes('артикул') ||
              lowerHeader.includes('sku') ||
              lowerHeader.includes('код')) {
            isRequired = true;
          }
          
          // Числовые поля
          if (lowerHeader.includes('цена') || 
              lowerHeader.includes('стоимость') || 
              lowerHeader.includes('сумма') ||
              lowerHeader.includes('количество') ||
              lowerHeader.includes('вес') ||
              lowerHeader.includes('размер') ||
              lowerHeader.includes('объем') ||
              lowerHeader.includes('площадь') ||
              lowerHeader.includes('длина') ||
              lowerHeader.includes('ширина') ||
              lowerHeader.includes('высота') ||
              lowerHeader.includes('глубина') ||
              lowerHeader.includes('диаметр') ||
              lowerHeader.includes('толщина') ||
              /^\d+$/.test(lowerHeader)) {
            fieldType = 'number';
            isForCalculator = true;
          }
          
          // Логические поля
          if (lowerHeader.includes('есть') || 
              lowerHeader.includes('наличие') || 
              lowerHeader.includes('доступн') ||
              lowerHeader.includes('активн') ||
              lowerHeader.includes('включен') ||
              lowerHeader.includes('выключен') ||
              lowerHeader === 'да' ||
              lowerHeader === 'нет') {
            fieldType = 'boolean';
          }
          
          return {
            fieldName: header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            displayName: header,
            type: fieldType,
            required: isRequired,
            isForCalculator: isForCalculator,
            isForExport: true
          };
        });

        // Создаем field_mappings для автоматического шаблона
        const fieldMappingsData = templateFields.map(field => ({
          fieldName: field.fieldName,
          displayName: field.displayName,
          dataType: field.type,
          isRequired: field.required,
          isVisible: true
        }));

        const templateData = {
          name: `Автоматический шаблон для ${categoryInfo.name}`,
          description: `Шаблон создан автоматически при первой загрузке товаров в категорию ${categoryInfo.name}. Поля отфильтрованы и ограничены.`,
          catalog_category_id: category,
          field_mappings: JSON.stringify(fieldMappingsData),
          required_fields: JSON.stringify(templateFields.filter(f => f.required)),
          calculator_fields: JSON.stringify(templateFields.filter(f => f.isForCalculator)),
          export_fields: JSON.stringify(templateFields),
          is_active: true
        };

        let templateResponse;
        
        if (importTemplate) {
          // Обновляем существующий шаблон
          templateResponse = await fetch(`${req.nextUrl.origin}/api/admin/import-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...templateData,
              id: importTemplate.id // Добавляем ID для обновления
            })
          });
          console.log('Обновляем существующий шаблон:', importTemplate.id);
        } else {
          // Создаем новый шаблон
          templateResponse = await fetch(`${req.nextUrl.origin}/api/admin/import-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templateData)
          });
          console.log('Создаем новый шаблон');
        }

        if (templateResponse.ok) {
          const templateResult = await templateResponse.json();
          importTemplate = templateResult.template;
          console.log('Шаблон сохранен:', importTemplate.id);
          console.log('Количество обязательных полей:', templateFields.filter(f => f.required).length);
          console.log('Количество полей для калькулятора:', templateFields.filter(f => f.isForCalculator).length);
          console.log('Общее количество полей в шаблоне:', templateFields.length);
        } else {
          console.error('Ошибка при сохранении шаблона');
        }
      } catch (error) {
        console.error('Ошибка при автоматическом создании шаблона:', error);
      }
    }

    console.log('=== STARTING ROW PROCESSING ===');
    console.log('Total rows to process:', rows.length);
    console.log('First few rows:', rows.slice(0, 3));

    // Обрабатываем каждую строку
    rows.forEach((row, index) => {
      console.log(`\n=== PROCESSING ROW ${index + 1} ===`);
      console.log('Row data:', row);
      console.log('Headers:', headers);
      console.log('Row length:', row.length);
      console.log('Headers length:', headers.length);
      
      if (row.length === 0 || row.every(cell => !cell)) {
        console.log(`Skipping empty row ${index + 2}`);
        return; // Пропускаем пустые строки
      }

      console.log(`=== PROCESSING ROW ${index + 2} ===`);
      console.log('Row data:', row);
      console.log('Row length:', row.length);

      const product: any = {};
      let hasErrors = false;

      // Создаем объект specifications для хранения всех свойств
      const specifications: any = {};

      // Маппим поля согласно настройкам категории
      console.log('Mapping config:', mappingConfig);
      console.log('Has calculator_fields:', !!mappingConfig.calculator_fields);
      console.log('Calculator fields:', mappingConfig.calculator_fields);
      
      // Упрощенный маппинг - добавляем все данные из строки в specifications
      console.log('Using direct mapping - adding all row data to specifications');
      headers.forEach((header, headerIndex) => {
        if (row[headerIndex] !== undefined && row[headerIndex] !== null && row[headerIndex] !== '') {
          specifications[header] = row[headerIndex];
          console.log(`Added to specifications: ${header} = ${row[headerIndex]}`);
        }
      });
      
      // Ищем поле с ценой для product.price - используем точный маппинг из шаблона
      if (mappingConfig && mappingConfig.fieldMappings) {
        // Находим поле цены из шаблона
        const priceMapping = mappingConfig.fieldMappings.find(field => 
          field.dataType === 'number' && 
          (field.displayName.toLowerCase().includes('цена') || 
           field.fieldName.toLowerCase().includes('цена'))
        );
        
        if (priceMapping) {
          const priceValue = specifications[priceMapping.fieldName];
          if (priceValue !== undefined && priceValue !== null && priceValue !== '') {
            product.price = priceValue;
            console.log(`✅ Found price from template mapping "${priceMapping.fieldName}" (${priceMapping.displayName}): "${priceValue}" (type: ${typeof priceValue})`);
          } else {
            console.log(`❌ Price field "${priceMapping.fieldName}" is empty or undefined`);
          }
        } else {
          console.log(`❌ No price mapping found in template`);
        }
      } else {
        console.log(`❌ No mapping config available`);
      }
      
      console.log('Specifications after mapping:', specifications);
      
      // Дополнительная проверка: если specifications пустой, добавляем все данные из строки
      if (Object.keys(specifications).length === 0) {
        console.log('Specifications is empty, adding all row data directly');
        headers.forEach((header, index) => {
          if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
            specifications[header] = row[index];
            console.log(`Fallback: Added ${header} = ${row[index]}`);
          }
        });
        console.log('Specifications after fallback:', specifications);
      }
      
      // Извлекаем основные поля товара используя маппинг из шаблона
      if (mappingConfig && mappingConfig.fieldMappings) {
        const fieldMappings = mappingConfig.fieldMappings;
        
        // Ищем поле для названия товара
        const nameMapping = fieldMappings.find(f => 
          f.displayName && f.displayName.toLowerCase().includes('наименование')
        );
        
        if (nameMapping && specifications[nameMapping.fieldName]) {
          product.name = specifications[nameMapping.fieldName].toString().trim();
          console.log(`✅ Found product name from template: "${product.name}"`);
        }
        
        // Ищем поле для артикула/SKU
        const skuMapping = fieldMappings.find(f => 
          f.displayName && f.displayName.toLowerCase().includes('артикул')
        );
        
        if (skuMapping && specifications[skuMapping.fieldName]) {
          product.sku = specifications[skuMapping.fieldName].toString().trim();
          console.log(`✅ Found product SKU from template: "${product.sku}"`);
        }
      }
      
      // Сохраняем все данные в specifications
      product.specifications = specifications;
      
      // Отладочная информация для первого товара
      if (index === 0) {
        console.log('=== FIRST PRODUCT DEBUG ===');
        console.log('Row data:', row);
        console.log('Headers:', headers);
        console.log('Mapping config:', mappingConfig);
        console.log('Specifications:', specifications);
        console.log('Product name:', product.name);
        console.log('Product SKU:', product.sku);
        console.log('Product price:', product.price);
        console.log('Product before saving:', product);
        console.log('=== END FIRST PRODUCT DEBUG ===');
      }

      // Проверяем обязательные поля - только если они заданы
      console.log('=== VALIDATION ===');
      console.log('Required fields:', requiredFields);
      console.log('Calculator fields:', mappingConfig.calculator_fields);
      console.log('Specifications keys:', Object.keys(specifications));
      
      // Валидация на основе шаблона - более мягкая
      if (importTemplate && importTemplate.requiredFields) {
        console.log('Validating against template required fields');
        
        // Парсим requiredFields если это строка
        let templateRequiredFields = importTemplate.requiredFields;
        if (typeof templateRequiredFields === 'string') {
          try {
            templateRequiredFields = JSON.parse(templateRequiredFields);
          } catch (e) {
            console.error('Error parsing requiredFields for validation:', e);
            templateRequiredFields = [];
          }
        }
        
        // Проверяем, что это массив
        if (Array.isArray(templateRequiredFields) && templateRequiredFields.length > 0) {
          let missingRequiredFields = [];
          
          templateRequiredFields.forEach((field: any) => {
            const fieldName = field.fieldName || field;
            if (!specifications[fieldName] || specifications[fieldName] === '') {
              missingRequiredFields.push(fieldName);
            }
          });
        
          if (missingRequiredFields.length > 0) {
            console.log(`Validation warning: Missing required fields: ${missingRequiredFields.join(', ')}`);
            console.log('But continuing anyway - soft validation mode');
            // Не добавляем ошибку, просто предупреждение
            // errors.push(`Строка ${index + 2}: Отсутствуют обязательные поля: ${missingRequiredFields.join(', ')}`);
            // hasErrors = true;
          } else {
            console.log('Product passed validation - all required fields present');
          }
        }
      }
      
      // Основная валидация - проверяем только что есть данные
      if (Object.keys(specifications).length === 0) {
        console.log('Validation error: No data in specifications');
        errors.push(`Строка ${index + 2}: Товар не содержит данных`);
        hasErrors = true;
      } else {
        console.log('Product passed validation - has specifications data');
        console.log('Specifications keys count:', Object.keys(specifications).length);
      }
      
      console.log('Has errors:', hasErrors);
      console.log('=== END VALIDATION ===');

      if (!hasErrors) {
        products.push({
          ...product,
          row_number: index + 2,
          category: category
        });
        
        // Отладочная информация для первых нескольких товаров
        if (index < 5) {
          console.log(`=== PRODUCT ${index + 1} ADDED ===`);
          console.log('Product:', product);
          console.log('Specifications:', specifications);
          console.log('Has errors:', hasErrors);
        }
      } else {
        // Отладочная информация для товаров с ошибками
        if (index < 5) {
          console.log(`=== PRODUCT ${index + 1} REJECTED ===`);
          console.log('Product:', product);
          console.log('Specifications:', specifications);
          console.log('Has errors:', hasErrors);
          console.log('Errors for this product:', errors.slice(-1)); // Последняя ошибка
        }
      }
    });

    console.log('\n=== ROW PROCESSING COMPLETED ===');
    console.log('Total products processed:', products.length);
    console.log('Total errors found:', errors.length);
    console.log('Products array:', products.slice(0, 3)); // Первые 3 товара для отладки

    const result = {
      message: "Файл успешно обработан",
      category: categoryInfo,
      filename: file.name,
      size: file.size,
      type: file.type,
      mapping: mappingConfig,
      imported: products.length,
      errors: errors,
      products: products.slice(0, 10), // Показываем первые 10 товаров для предпросмотра
      photo_mapping: {}, // Будет заполнено после загрузки фото
      file_content_preview: headers.join(', '), // Показываем заголовки
      processing_status: errors.length > 0 ? "partial" : "success",
      note: `Обработано ${rows.length} строк, успешно импортировано ${products.length} товаров`,
      category_properties: categoryInfo.properties,
      required_fields: requiredFields,
      headers: headers,
      total_rows: rows.length,
      valid_rows: products.length,
      error_rows: errors.length,
      debug: {
        first_row: rows[0],
        mapping_config: mappingConfig,
        sample_product: products[0] || null
      }
    };

    console.log('=== API CALL SUCCESS ===');
    console.log('Products array length:', products.length);
    console.log('Errors array length:', errors.length);
    
    // Сохраняем товары напрямую в базу данных
    try {
      console.log('Saving products directly to database...');
      console.log('Total products to save:', products.length);
      console.log('First product sample:', products[0]);
      
      // Импортируем PrismaClient напрямую
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const savedProducts = [];
      const failedProducts = [];
      const errorStats = {};
      
      if (products.length === 0) {
        console.log('WARNING: No products to save - products array is empty');
        console.log('This might be due to validation errors or empty data');
        result.save_message = 'Предупреждение: Нет товаров для сохранения - возможно, все товары были отклонены при валидации';
      }
      
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        try {
          // Минимальная валидация - только проверяем что товар не пустой
          if (!product.specifications || Object.keys(product.specifications).length === 0) {
            throw new Error('Товар не содержит данных');
          }
          
          // Профессиональная валидация и парсинг цены
          let basePrice = 0;
          if (product.price !== undefined && product.price !== null && product.price !== '') {
            console.log(`🔍 Processing price for product ${i+1}: raw value = "${product.price}" (type: ${typeof product.price})`);
            
            // Конвертируем в строку и очищаем
            const priceString = product.price.toString().trim();
            console.log(`🔍 Price string after trim: "${priceString}"`);
            
            // Удаляем все кроме цифр, точек и запятых
            const cleanedPrice = priceString.replace(/[^\d.,]/g, '').replace(',', '.');
            console.log(`🔍 Cleaned price: "${cleanedPrice}"`);
            
            const parsedPrice = parseFloat(cleanedPrice);
            console.log(`🔍 Parsed price: ${parsedPrice} (isNaN: ${isNaN(parsedPrice)})`);
            
            if (isNaN(parsedPrice)) {
              throw new Error(`Invalid price value: "${product.price}" -> "${cleanedPrice}" -> NaN`);
            }
            
            basePrice = parsedPrice;
          } else {
            console.log(`🔍 Product ${i+1}: price is empty/null/undefined`);
          }
          
          // Профессиональная валидация количества
          let stockQuantity = 0;
          if (product.stock !== undefined && product.stock !== null && product.stock !== '') {
            const parsedStock = parseInt(product.stock.toString());
            if (isNaN(parsedStock)) {
              throw new Error(`Invalid stock quantity: "${product.stock}"`);
            }
            stockQuantity = parsedStock;
          }
          
          // Генерируем SKU если его нет
          const productSku = product.sku || `SKU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Профессиональная проверка на существование товара
          const existingProduct = await prisma.product.findFirst({
            where: {
              AND: [
                { catalog_category_id: category },
                { sku: productSku }
              ]
            }
          });
          
          let savedProduct;
          if (existingProduct) {
            // Обновляем существующий товар
            savedProduct = await prisma.product.update({
              where: { id: existingProduct.id },
              data: {
                name: product.name || 'Без названия',
                base_price: basePrice,
                stock_quantity: stockQuantity,
                brand: product.brand || '',
                model: product.model || '',
                description: product.description || '',
                specifications: JSON.stringify(product.specifications || {}),
                properties_data: JSON.stringify(product.specifications || {}),
                is_active: true,
                updated_at: new Date()
              }
            });
            console.log(`🔄 Updated existing product: ${productSku}`);
          } else {
            // Создаем новый товар
            savedProduct = await prisma.product.create({
              data: {
                catalog_category_id: category,
                sku: productSku,
                name: product.name || 'Без названия',
                base_price: basePrice,
                stock_quantity: stockQuantity,
                brand: product.brand || '',
                model: product.model || '',
                description: product.description || '',
                specifications: JSON.stringify(product.specifications || {}),
                properties_data: JSON.stringify(product.specifications || {}),
                is_active: true
              }
            });
            console.log(`✅ Created new product: ${productSku}`);
          }
          
          savedProducts.push(savedProduct);
          if (i < 5) { // Логируем первые 5 товаров
            console.log(`✅ Product ${i+1} saved:`, savedProduct.id, savedProduct.name);
          }
          
        } catch (productError) {
          const errorMessage = productError instanceof Error ? productError.message : 'Unknown error';
          const errorCode = (productError as any)?.code;
          
          // Собираем статистику ошибок
          const errorKey = errorCode || errorMessage;
          errorStats[errorKey] = (errorStats[errorKey] || 0) + 1;
          
          failedProducts.push({
            index: i + 1,
            product: {
              name: product.name,
              sku: product.sku,
              price: product.price
            },
            error: errorMessage,
            errorCode: errorCode
          });
          
          console.error(`❌ Product ${i+1} failed:`, {
            name: product.name,
            sku: product.sku,
            error: errorMessage,
            errorCode: errorCode
          });
        }
      }
      
      await prisma.$disconnect();
      
      console.log('🔍 СТАТИСТИКА СОХРАНЕНИЯ:');
      console.log('🔍 Всего товаров обработано:', products.length);
      console.log('🔍 Товаров сохранено в БД:', savedProducts.length);
      console.log('🔍 Товаров не сохранено:', failedProducts.length);
      console.log('🔍 Разница (не сохранено):', products.length - savedProducts.length);
      
      if (failedProducts.length > 0) {
        console.log('📊 СТАТИСТИКА ОШИБОК:');
        console.log('📊 Типы ошибок:', errorStats);
        console.log('📊 Первые 10 неудачных товаров:', failedProducts.slice(0, 10));
        
        // Анализ причин ошибок
        const emptyNames = failedProducts.filter(f => !f.product.name || f.product.name.trim() === '').length;
        const duplicateSkus = failedProducts.filter(f => f.errorCode === 'P2002').length;
        const validationErrors = failedProducts.filter(f => f.error.includes('validation')).length;
        
        console.log('🔍 АНАЛИЗ ОШИБОК:');
        console.log('🔍 Пустые названия:', emptyNames);
        console.log('🔍 Дублирующиеся SKU:', duplicateSkus);
        console.log('🔍 Ошибки валидации:', validationErrors);
      }
      
      result.imported = savedProducts.length;
      result.database_saved = savedProducts.length;
      result.total_processed = products.length;
      result.failed_products = failedProducts.length;
      result.error_stats = errorStats;
      result.failed_products_sample = failedProducts.slice(0, 10);
      result.save_message = `Успешно сохранено ${savedProducts.length} из ${products.length} товаров в базу данных`;
      
    } catch (saveError) {
      console.error('Error saving products directly:', saveError);
      result.save_message = 'Ошибка при сохранении в базу данных: ' + (saveError instanceof Error ? saveError.message : 'Неизвестная ошибка');
    }
    
    // Обновляем статистику
    try {
      await fetch(`${req.nextUrl.origin}/api/admin/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imported: products.length, 
          filename: file.name,
          category: category
        })
      });
    } catch (statsError) {
      console.error('Error updating stats:', statsError);
    }
    
    // Добавляем в историю импортов
    try {
      await fetch(`${req.nextUrl.origin}/api/admin/import-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: category,
          filename: file.name,
          products_count: products.length,
          status: 'completed'
        })
      });
    } catch (historyError) {
      console.error('Error updating import history:', historyError);
    }
    
    // Обновляем счетчики товаров в категориях
    try {
      await fetch(`${req.nextUrl.origin}/api/admin/categories/update-counts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Product counts updated successfully');
    } catch (countsError) {
      console.error('Error updating product counts:', countsError);
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('=== API CALL ERROR ===');
    console.error('Ошибка обработки файла:', error);
    console.error('Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: "Ошибка обработки файла: " + (error as Error).message },
      { status: 500 }
    );
  }
}
