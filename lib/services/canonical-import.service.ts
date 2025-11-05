// Система канонических шаблонов импорта для DOMEO
// Каждый шаблон создается при первом импорте в категорию

export interface CanonicalTemplateField {
  canonicalName: string;        // Каноническое название (например, "supplier_sku")
  displayName: string;          // Отображаемое название (например, "Артикул поставщика")
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array';
  isRequired: boolean;          // Обязательное поле
  isUnique: boolean;           // Уникальное поле (для поиска товаров)
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    pattern?: string;
    allowedValues?: string[];
  };
  unit?: string;               // Единица измерения (мм, руб, кг)
  description?: string;        // Описание поля
}

export interface CanonicalImportTemplate {
  id: string;
  catalogCategoryId: string;
  name: string;
  description?: string;
  fields: CanonicalTemplateField[];
  updateMode: 'replace' | 'merge' | 'add_new';  // Режим обновления по умолчанию
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;           // ID пользователя, создавшего шаблон
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
  warnings: string[];
  details: {
    productId: string;
    sku: string;
    action: 'created' | 'updated' | 'skipped';
    errors?: string[];
  }[];
}

export class CanonicalImportService {
  
  /**
   * Создает канонический шаблон при первом импорте в категорию
   */
  async createTemplateFromExcel(
    fileBuffer: Buffer,
    catalogCategoryId: string,
    userId: string,
    templateName: string
  ): Promise<{ template: CanonicalImportTemplate; analysis: any }> {
    try {
      const XLSX = require('xlsx');
      
      // Читаем Excel файл
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('Файл пустой или не содержит данных');
      }
      
      // Первая строка - заголовки
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];
      
      console.log('📊 Создание шаблона из Excel:');
      console.log('Заголовки:', headers);
      console.log('Количество строк:', rows.length);
      
      // Анализируем каждую колонку
      const fieldAnalysis = headers.map((header, index) => {
        const columnData = rows.map(row => row[index]).filter(val => val !== undefined && val !== '');
        const nonEmptyCount = columnData.length;
        const fillRate = nonEmptyCount / rows.length;
        
        // Определяем тип данных
        const dataType = this.detectDataType(columnData);
        
        // Определяем, является ли поле уникальным (для поиска товаров)
        const uniqueValues = new Set(columnData.map(val => val.toString().trim()));
        const isUnique = uniqueValues.size === nonEmptyCount && fillRate > 0.8;
        
        // Определяем, является ли поле обязательным
        const isRequired = fillRate > 0.9; // Если заполнено в 90%+ строк
        
        return {
          header,
          index,
          dataType,
          fillRate,
          isRequired,
          isUnique,
          sampleValues: columnData.slice(0, 5),
          nonEmptyCount,
          totalRows: rows.length
        };
      });
      
      console.log('🔍 Анализ полей:', fieldAnalysis);
      
      // Создаем канонические поля
      const canonicalFields: CanonicalTemplateField[] = fieldAnalysis.map((analysis, index) => {
        const canonicalName = this.generateCanonicalName(analysis.header, index);
        
        return {
          canonicalName,
          displayName: analysis.header,
          dataType: analysis.dataType,
          isRequired: analysis.isRequired,
          isUnique: analysis.isUnique,
          validationRules: this.generateValidationRules(analysis),
          unit: this.detectUnit(analysis.header),
          description: this.generateDescription(analysis)
        };
      });
      
      // Создаем шаблон
      const template: CanonicalImportTemplate = {
        id: `template_${catalogCategoryId}_${Date.now()}`,
        catalogCategoryId,
        name: templateName,
        description: `Шаблон импорта для категории ${catalogCategoryId}`,
        fields: canonicalFields,
        updateMode: 'merge',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId
      };
      
      console.log('✅ Создан канонический шаблон:', template);
      
      return {
        template,
        analysis: {
          totalFields: canonicalFields.length,
          requiredFields: canonicalFields.filter(f => f.isRequired).length,
          uniqueFields: canonicalFields.filter(f => f.isUnique).length,
          fieldAnalysis
        }
      };
      
    } catch (error) {
      console.error('❌ Ошибка при создании шаблона:', error);
      throw error;
    }
  }
  
  /**
   * Импорт товаров по каноническому шаблону
   */
  async importWithTemplate(
    fileBuffer: Buffer,
    template: CanonicalImportTemplate,
    updateMode: 'replace' | 'merge' | 'add_new' = 'merge'
  ): Promise<ImportResult> {
    try {
      const XLSX = require('xlsx');
      
      // Читаем Excel файл
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          errors: ['Файл пустой или не содержит данных'],
          warnings: [],
          details: []
        };
      }
      
      // Первая строка - заголовки
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];
      
      console.log('📊 Импорт по шаблону:');
      console.log('Заголовки файла:', headers);
      console.log('Поля шаблона:', template.fields.map(f => f.displayName));
      
      // Проверяем соответствие заголовков шаблону
      const validationResult = this.validateHeadersAgainstTemplate(headers, template);
      if (!validationResult.isValid) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          details: []
        };
      }
      
      // Создаем маппинг колонок на поля шаблона
      const columnMapping = this.createColumnMapping(headers, template);
      
      console.log('🔗 Маппинг колонок:', columnMapping);
      
      // Находим поле для поиска товаров (обычно SKU)
      const searchField = template.fields.find(f => f.isUnique);
      if (!searchField) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          errors: ['В шаблоне не найдено уникальное поле для поиска товаров'],
          warnings: [],
          details: []
        };
      }
      
      const searchColumnIndex = columnMapping[searchField.canonicalName];
      if (searchColumnIndex === undefined) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          errors: [`Не найдена колонка для поля "${searchField.displayName}"`],
          warnings: [],
          details: []
        };
      }
      
      const results: ImportResult = {
        success: true,
        imported: 0,
        updated: 0,
        errors: [],
        warnings: [],
        details: []
      };
      
      // Обрабатываем каждую строку
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        
        if (!row || row.length === 0) continue;
        
        try {
          // Извлекаем значение для поиска товара
          const searchValue = row[searchColumnIndex];
          if (!searchValue) {
            results.warnings.push(`Строка ${rowIndex + 2}: Пустое значение для поиска, пропускаем`);
            continue;
          }
          
          const searchValueStr = searchValue.toString().trim();
          console.log(`\n🔍 Обработка товара: ${searchValueStr}`);
          
          // Собираем данные товара по шаблону
          const productData: Record<string, any> = {};
          const validationErrors: string[] = [];
          
          for (const field of template.fields) {
            const columnIndex = columnMapping[field.canonicalName];
            if (columnIndex === undefined) {
              if (field.isRequired) {
                validationErrors.push(`Отсутствует обязательное поле "${field.displayName}"`);
              }
              continue;
            }
            
            const value = row[columnIndex];
            
            // Валидируем значение
            const validationResult = this.validateFieldValue(value, field);
            if (!validationResult.isValid) {
              validationErrors.push(...validationResult.errors);
              if (field.isRequired) {
                continue; // Пропускаем строку если обязательное поле невалидно
              }
            }
            
            productData[field.canonicalName] = validationResult.processedValue;
          }
          
          if (validationErrors.length > 0) {
            results.warnings.push(`Строка ${rowIndex + 2}: ${validationErrors.join(', ')}`);
            if (validationErrors.some(err => err.includes('обязательное поле'))) {
              continue; // Пропускаем строку с ошибками обязательных полей
            }
          }
          
          // Ищем существующий товар
          const existingProduct = await this.findProductBySearchField(
            searchValueStr, 
            searchField.canonicalName,
            template.catalogCategoryId
          );
          
          if (existingProduct) {
            // Обновляем существующий товар
            const updateResult = await this.updateExistingProduct(
              existingProduct.id,
              productData,
              updateMode
            );
            
            results.updated++;
            results.details.push({
              productId: existingProduct.id,
              sku: searchValueStr,
              action: 'updated',
              errors: updateResult.errors
            });
            
            console.log(`✅ Товар ${searchValueStr} обновлен`);
            
          } else if (updateMode !== 'replace') {
            // Создаем новый товар
            const createResult = await this.createNewProduct(
              productData,
              template.catalogCategoryId
            );
            
            results.imported++;
            results.details.push({
              productId: createResult.id,
              sku: searchValueStr,
              action: 'created',
              errors: createResult.errors
            });
            
            console.log(`✅ Товар ${searchValueStr} создан`);
            
          } else {
            results.warnings.push(`Строка ${rowIndex + 2}: Товар "${searchValueStr}" не найден (режим замены)`);
          }
          
        } catch (error) {
          const errorMsg = `Ошибка при обработке строки ${rowIndex + 2}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
      console.log(`\n📊 ИТОГИ ИМПОРТА:`);
      console.log(`✅ Создано товаров: ${results.imported}`);
      console.log(`🔄 Обновлено товаров: ${results.updated}`);
      console.log(`❌ Ошибок: ${results.errors.length}`);
      console.log(`⚠️ Предупреждений: ${results.warnings.length}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Критическая ошибка при импорте:', error);
      return {
        success: false,
        imported: 0,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Неизвестная ошибка'],
        warnings: [],
        details: []
      };
    }
  }
  
  /**
   * Генерирует каноническое название поля
   */
  private generateCanonicalName(displayName: string, index: number): string {
    // Нормализуем название
    let canonical = displayName
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s]/g, '') // Убираем спецсимволы
      .replace(/\s+/g, '_')           // Заменяем пробелы на подчеркивания
      .replace(/[а-я]/g, (char) => {  // Транслитерация кириллицы
        const map: Record<string, string> = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return map[char] || char;
      });
    
    // Если название получилось пустым, используем индекс
    if (!canonical) {
      canonical = `field_${index + 1}`;
    }
    
    return canonical;
  }
  
  /**
   * Определяет тип данных по значениям
   */
  private detectDataType(values: any[]): 'string' | 'number' | 'boolean' | 'date' | 'array' {
    if (values.length === 0) return 'string';
    
    const sampleValues = values.slice(0, 10);
    
    // Проверяем на числа
    const numericCount = sampleValues.filter(val => {
      const str = val.toString().trim();
      return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
    }).length;
    
    if (numericCount / sampleValues.length > 0.8) {
      return 'number';
    }
    
    // Проверяем на даты
    const dateCount = sampleValues.filter(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }).length;
    
    if (dateCount / sampleValues.length > 0.8) {
      return 'date';
    }
    
    // Проверяем на булевы значения
    const booleanCount = sampleValues.filter(val => {
      const str = val.toString().toLowerCase().trim();
      return ['да', 'нет', 'yes', 'no', 'true', 'false', '1', '0'].includes(str);
    }).length;
    
    if (booleanCount / sampleValues.length > 0.8) {
      return 'boolean';
    }
    
    // Проверяем на массивы
    const arrayCount = sampleValues.filter(val => {
      return Array.isArray(val) || (typeof val === 'string' && val.includes(','));
    }).length;
    
    if (arrayCount / sampleValues.length > 0.8) {
      return 'array';
    }
    
    return 'string';
  }
  
  /**
   * Определяет единицу измерения по названию поля
   */
  private detectUnit(header: string): string | undefined {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('цена') || lowerHeader.includes('стоимость')) {
      return 'руб';
    }
    if (lowerHeader.includes('ширина') || lowerHeader.includes('высота') || 
        lowerHeader.includes('толщина') || lowerHeader.includes('/мм')) {
      return 'мм';
    }
    if (lowerHeader.includes('вес') || lowerHeader.includes('масса')) {
      return 'кг';
    }
    if (lowerHeader.includes('объем') || lowerHeader.includes('литр')) {
      return 'л';
    }
    
    return undefined;
  }
  
  /**
   * Генерирует правила валидации для поля
   */
  private generateValidationRules(analysis: any): any {
    const rules: any = {};
    
    if (analysis.dataType === 'string') {
      const maxLength = Math.max(...analysis.sampleValues.map((v: any) => v.toString().length));
      rules.maxLength = Math.min(maxLength * 2, 1000); // Максимум 1000 символов
    }
    
    if (analysis.dataType === 'number') {
      const values = analysis.sampleValues.map((v: any) => parseFloat(v.toString()));
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      
      if (minValue >= 0) {
        rules.minValue = 0;
      }
      rules.maxValue = maxValue * 2; // Допускаем значения в 2 раза больше максимального
    }
    
    return rules;
  }
  
  /**
   * Генерирует описание поля
   */
  private generateDescription(analysis: any): string {
    const dataType = analysis.dataType;
    const fillRate = Math.round(analysis.fillRate * 100);
    
    return `${dataType} поле, заполнено в ${fillRate}% строк`;
  }
  
  /**
   * Проверяет соответствие заголовков файла шаблону
   */
  private validateHeadersAgainstTemplate(
    headers: string[], 
    template: CanonicalImportTemplate
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Проверяем обязательные поля
    for (const field of template.fields) {
      if (field.isRequired) {
        const found = headers.some(header => 
          header.trim().toLowerCase() === field.displayName.trim().toLowerCase()
        );
        
        if (!found) {
          errors.push(`Отсутствует обязательное поле "${field.displayName}"`);
        }
      }
    }
    
    // Проверяем новые поля (не из шаблона)
    for (const header of headers) {
      const found = template.fields.some(field => 
        field.displayName.trim().toLowerCase() === header.trim().toLowerCase()
      );
      
      if (!found) {
        warnings.push(`Найдено новое поле "${header}", которое не входит в шаблон`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Создает маппинг колонок на поля шаблона
   */
  private createColumnMapping(headers: string[], template: CanonicalImportTemplate): Record<string, number> {
    const mapping: Record<string, number> = {};
    
    for (const field of template.fields) {
      const index = headers.findIndex(header => 
        header.trim().toLowerCase() === field.displayName.trim().toLowerCase()
      );
      
      if (index !== -1) {
        mapping[field.canonicalName] = index;
      }
    }
    
    return mapping;
  }
  
  /**
   * Валидирует значение поля
   */
  private validateFieldValue(value: any, field: CanonicalTemplateField): {
    isValid: boolean;
    errors: string[];
    processedValue: any;
  } {
    const errors: string[] = [];
    let processedValue = value;
    
    // Проверка на пустое значение для обязательных полей
    if (field.isRequired && (value === undefined || value === null || value === '')) {
      errors.push(`Поле "${field.displayName}" обязательно для заполнения`);
      return { isValid: false, errors, processedValue: null };
    }
    
    // Обработка в зависимости от типа
    switch (field.dataType) {
      case 'number':
        const numValue = parseFloat(value.toString().replace(',', '.'));
        if (isNaN(numValue)) {
          errors.push(`Поле "${field.displayName}" должно содержать число`);
        } else {
          processedValue = numValue;
          
          if (field.validationRules?.minValue !== undefined && numValue < field.validationRules.minValue) {
            errors.push(`Поле "${field.displayName}" должно быть не менее ${field.validationRules.minValue}`);
          }
          
          if (field.validationRules?.maxValue !== undefined && numValue > field.validationRules.maxValue) {
            errors.push(`Поле "${field.displayName}" должно быть не более ${field.validationRules.maxValue}`);
          }
        }
        break;
        
      case 'boolean':
        const strValue = value.toString().toLowerCase().trim();
        if (['да', 'yes', 'true', '1'].includes(strValue)) {
          processedValue = true;
        } else if (['нет', 'no', 'false', '0'].includes(strValue)) {
          processedValue = false;
        } else {
          errors.push(`Поле "${field.displayName}" должно содержать да/нет или true/false`);
        }
        break;
        
      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          errors.push(`Поле "${field.displayName}" должно содержать корректную дату`);
        } else {
          processedValue = dateValue.toISOString();
        }
        break;
        
      case 'array':
        if (typeof value === 'string' && value.includes(',')) {
          processedValue = value.split(',').map((item: string) => item.trim()).filter(Boolean);
        } else if (Array.isArray(value)) {
          processedValue = value;
        } else {
          processedValue = [value.toString()];
        }
        break;
        
      default: // string
        processedValue = value.toString().trim();
        
        if (field.validationRules?.minLength && processedValue.length < field.validationRules.minLength) {
          errors.push(`Поле "${field.displayName}" должно содержать не менее ${field.validationRules.minLength} символов`);
        }
        
        if (field.validationRules?.maxLength && processedValue.length > field.validationRules.maxLength) {
          errors.push(`Поле "${field.displayName}" должно содержать не более ${field.validationRules.maxLength} символов`);
        }
        
        if (field.validationRules?.pattern && !new RegExp(field.validationRules.pattern).test(processedValue)) {
          errors.push(`Поле "${field.displayName}" не соответствует требуемому формату`);
        }
        
        if (field.validationRules?.allowedValues && !field.validationRules.allowedValues.includes(processedValue)) {
          errors.push(`Поле "${field.displayName}" должно содержать одно из значений: ${field.validationRules.allowedValues.join(', ')}`);
        }
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      processedValue
    };
  }
  
  /**
   * Ищет товар по полю поиска
   */
  private async findProductBySearchField(
    searchValue: string,
    searchFieldName: string,
    categoryId: string
  ): Promise<any> {
    // Здесь должна быть логика поиска в БД
    // Пока возвращаем null для демонстрации
    return null;
  }
  
  /**
   * Обновляет существующий товар
   */
  private async updateExistingProduct(
    productId: string,
    productData: Record<string, any>,
    updateMode: 'replace' | 'merge' | 'add_new'
  ): Promise<{ errors: string[] }> {
    // Здесь должна быть логика обновления в БД
    return { errors: [] };
  }
  
  /**
   * Создает новый товар
   */
  private async createNewProduct(
    productData: Record<string, any>,
    categoryId: string
  ): Promise<{ id: string; errors: string[] }> {
    // Здесь должна быть логика создания в БД
    return { id: `product_${Date.now()}`, errors: [] };
  }
}

// Экспортируем экземпляр сервиса
export const canonicalImportService = new CanonicalImportService();
