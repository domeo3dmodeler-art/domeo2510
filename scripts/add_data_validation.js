const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addDataValidation() {
  try {
    console.log('🔧 ДОБАВЛЕНИЕ ВАЛИДАЦИИ ДАННЫХ\n');

    // 1. Создание валидаторов для товаров
    console.log('1. Создание валидаторов для товаров...');
    
    const productValidators = {
      // Валидация SKU
      validateSKU: (sku) => {
        if (!sku || typeof sku !== 'string') {
          return { valid: false, error: 'SKU обязателен и должен быть строкой' };
        }
        if (sku.length < 3 || sku.length > 100) {
          return { valid: false, error: 'SKU должен быть от 3 до 100 символов' };
        }
        if (!/^[a-zA-Z0-9\-_]+$/.test(sku)) {
          return { valid: false, error: 'SKU может содержать только буквы, цифры, дефисы и подчеркивания' };
        }
        return { valid: true };
      },

      // Валидация названия
      validateName: (name) => {
        if (!name || typeof name !== 'string') {
          return { valid: false, error: 'Название товара обязательно' };
        }
        if (name.trim().length < 2) {
          return { valid: false, error: 'Название товара должно быть не менее 2 символов' };
        }
        if (name.length > 255) {
          return { valid: false, error: 'Название товара не должно превышать 255 символов' };
        }
        return { valid: true };
      },

      // Валидация цены
      validatePrice: (price) => {
        if (typeof price !== 'number') {
          return { valid: false, error: 'Цена должна быть числом' };
        }
        if (price < 0) {
          return { valid: false, error: 'Цена не может быть отрицательной' };
        }
        if (price > 10000000) {
          return { valid: false, error: 'Цена не должна превышать 10,000,000' };
        }
        return { valid: true };
      },

      // Валидация количества на складе
      validateStock: (stock) => {
        if (typeof stock !== 'number') {
          return { valid: false, error: 'Количество на складе должно быть числом' };
        }
        if (!Number.isInteger(stock)) {
          return { valid: false, error: 'Количество на складе должно быть целым числом' };
        }
        if (stock < 0) {
          return { valid: false, error: 'Количество на складе не может быть отрицательным' };
        }
        return { valid: true };
      },

      // Валидация JSON свойств
      validateProperties: (properties) => {
        if (!properties) {
          return { valid: true }; // Пустые свойства допустимы
        }
        
        let parsedProperties;
        try {
          parsedProperties = typeof properties === 'string' 
            ? JSON.parse(properties) 
            : properties;
        } catch (error) {
          return { valid: false, error: 'Некорректный JSON в свойствах товара' };
        }

        if (typeof parsedProperties !== 'object' || Array.isArray(parsedProperties)) {
          return { valid: false, error: 'Свойства товара должны быть объектом' };
        }

        // Проверяем размер JSON
        const jsonString = JSON.stringify(parsedProperties);
        if (jsonString.length > 10000) {
          return { valid: false, error: 'Свойства товара слишком большие (более 10KB)' };
        }

        return { valid: true };
      }
    };

    // 2. Создание валидаторов для категорий
    console.log('\n2. Создание валидаторов для категорий...');
    
    const categoryValidators = {
      // Валидация названия категории
      validateName: (name) => {
        if (!name || typeof name !== 'string') {
          return { valid: false, error: 'Название категории обязательно' };
        }
        if (name.trim().length < 2) {
          return { valid: false, error: 'Название категории должно быть не менее 2 символов' };
        }
        if (name.length > 100) {
          return { valid: false, error: 'Название категории не должно превышать 100 символов' };
        }
        return { valid: true };
      },

      // Валидация пути категории
      validatePath: (path) => {
        if (!path || typeof path !== 'string') {
          return { valid: false, error: 'Путь категории обязателен' };
        }
        if (!path.startsWith('/')) {
          return { valid: false, error: 'Путь категории должен начинаться с /' };
        }
        if (!/^\/[a-zA-Z0-9\-_\/]*$/.test(path)) {
          return { valid: false, error: 'Путь категории может содержать только буквы, цифры, дефисы, подчеркивания и слэши' };
        }
        return { valid: true };
      },

      // Валидация уровня категории
      validateLevel: (level) => {
        if (typeof level !== 'number') {
          return { valid: false, error: 'Уровень категории должен быть числом' };
        }
        if (!Number.isInteger(level)) {
          return { valid: false, error: 'Уровень категории должен быть целым числом' };
        }
        if (level < 0 || level > 10) {
          return { valid: false, error: 'Уровень категории должен быть от 0 до 10' };
        }
        return { valid: true };
      }
    };

    // 3. Создание функции валидации товара
    console.log('\n3. Создание функции валидации товара...');
    
    const validateProduct = async (productData) => {
      const errors = [];
      const warnings = [];

      // Валидация основных полей
      const skuValidation = productValidators.validateSKU(productData.sku);
      if (!skuValidation.valid) errors.push(skuValidation.error);

      const nameValidation = productValidators.validateName(productData.name);
      if (!nameValidation.valid) errors.push(nameValidation.error);

      const priceValidation = productValidators.validatePrice(productData.base_price);
      if (!priceValidation.valid) errors.push(priceValidation.error);

      const stockValidation = productValidators.validateStock(productData.stock_quantity);
      if (!stockValidation.valid) errors.push(stockValidation.error);

      const propertiesValidation = productValidators.validateProperties(productData.properties_data);
      if (!propertiesValidation.valid) errors.push(propertiesValidation.error);

      // Проверка уникальности SKU
      if (productData.sku) {
        const existingProduct = await prisma.product.findUnique({
          where: { sku: productData.sku },
          select: { id: true }
        });
        
        if (existingProduct && existingProduct.id !== productData.id) {
          errors.push(`Товар с SKU "${productData.sku}" уже существует`);
        }
      }

      // Проверка существования категории
      if (productData.catalog_category_id) {
        const category = await prisma.catalogCategory.findUnique({
          where: { id: productData.catalog_category_id },
          select: { id: true, name: true }
        });
        
        if (!category) {
          errors.push(`Категория с ID "${productData.catalog_category_id}" не найдена`);
        }
      }

      // Предупреждения
      if (productData.base_price === 0) {
        warnings.push('Цена товара равна нулю');
      }
      
      if (productData.stock_quantity === 0) {
        warnings.push('Товар отсутствует на складе');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    };

    // 4. Создание функции валидации категории
    console.log('\n4. Создание функции валидации категории...');
    
    const validateCategory = async (categoryData) => {
      const errors = [];
      const warnings = [];

      // Валидация основных полей
      const nameValidation = categoryValidators.validateName(categoryData.name);
      if (!nameValidation.valid) errors.push(nameValidation.error);

      const pathValidation = categoryValidators.validatePath(categoryData.path);
      if (!pathValidation.valid) errors.push(pathValidation.error);

      const levelValidation = categoryValidators.validateLevel(categoryData.level);
      if (!levelValidation.valid) errors.push(levelValidation.error);

      // Проверка уникальности пути
      if (categoryData.path) {
        const existingCategory = await prisma.catalogCategory.findFirst({
          where: { 
            path: categoryData.path,
            id: { not: categoryData.id || '' }
          },
          select: { id: true, name: true }
        });
        
        if (existingCategory) {
          errors.push(`Категория с путем "${categoryData.path}" уже существует`);
        }
      }

      // Проверка существования родительской категории
      if (categoryData.parent_id) {
        const parentCategory = await prisma.catalogCategory.findUnique({
          where: { id: categoryData.parent_id },
          select: { id: true, name: true, level: true }
        });
        
        if (!parentCategory) {
          errors.push(`Родительская категория с ID "${categoryData.parent_id}" не найдена`);
        } else if (categoryData.level && parentCategory.level >= categoryData.level) {
          errors.push('Уровень дочерней категории должен быть больше уровня родительской');
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    };

    // 5. Создание функции массовой валидации
    console.log('\n5. Создание функции массовой валидации...');
    
    const validateMultipleProducts = async (products) => {
      const results = [];
      let validCount = 0;
      let invalidCount = 0;

      for (const product of products) {
        const validation = await validateProduct(product);
        results.push({
          sku: product.sku,
          name: product.name,
          ...validation
        });

        if (validation.valid) {
          validCount++;
        } else {
          invalidCount++;
        }
      }

      return {
        results,
        summary: {
          total: products.length,
          valid: validCount,
          invalid: invalidCount
        }
      };
    };

    // 6. Тестирование валидации
    console.log('\n6. Тестирование валидации...');
    
    // Тестируем валидацию товара
    const testProduct = {
      sku: 'TEST-VALIDATION-001',
      name: 'Тестовый товар для валидации',
      base_price: 1000,
      stock_quantity: 10,
      catalog_category_id: 'cmg50xcgs001cv7mn0tdyk1wo',
      properties_data: '{"test": true}'
    };

    const productValidation = await validateProduct(testProduct);
    console.log(`   ✅ Валидация товара: ${productValidation.valid ? 'валиден' : 'невалиден'}`);
    if (productValidation.errors.length > 0) {
      console.log(`   ❌ Ошибки: ${productValidation.errors.join(', ')}`);
    }
    if (productValidation.warnings.length > 0) {
      console.log(`   ⚠️  Предупреждения: ${productValidation.warnings.join(', ')}`);
    }

    // Тестируем валидацию категории
    const testCategory = {
      name: 'Тестовая категория для валидации',
      path: '/test-validation-category',
      level: 1
    };

    const categoryValidation = await validateCategory(testCategory);
    console.log(`   ✅ Валидация категории: ${categoryValidation.valid ? 'валидна' : 'невалидна'}`);
    if (categoryValidation.errors.length > 0) {
      console.log(`   ❌ Ошибки: ${categoryValidation.errors.join(', ')}`);
    }

    console.log('\n🎉 ДОБАВЛЕНИЕ ВАЛИДАЦИИ ДАННЫХ ЗАВЕРШЕНО!');
    console.log('\n📊 СОЗДАННЫЕ ВАЛИДАТОРЫ:');
    console.log('   ✅ Валидация товаров - SKU, название, цена, количество, свойства');
    console.log('   ✅ Валидация категорий - название, путь, уровень');
    console.log('   ✅ Проверка уникальности - SKU и пути категорий');
    console.log('   ✅ Проверка связей - существование категорий и родительских связей');
    console.log('   ✅ Массовая валидация - для импорта товаров');
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Интегрировать валидацию в API endpoints');
    console.log('   2. Добавить валидацию на уровне Prisma схемы');
    console.log('   3. Создать middleware для автоматической валидации');
    console.log('   4. Добавить валидацию в формы интерфейса');

  } catch (error) {
    console.error('❌ Ошибка при добавлении валидации данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDataValidation();
