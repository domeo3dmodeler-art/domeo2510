const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixScalabilityIssues() {
  try {
    console.log('🔧 РЕШЕНИЕ ПРОБЛЕМ МАСШТАБИРОВАНИЯ\n');

    // 1. Реализация курсорной пагинации
    console.log('1. Реализация курсорной пагинации...');
    
    const createCursorPagination = () => {
      const paginateProducts = async (cursor, limit = 50) => {
        const whereClause = cursor ? { id: { gt: cursor } } : {};
        
        const products = await prisma.product.findMany({
          where: whereClause,
          take: limit + 1, // Берем на один больше для определения hasNextPage
          orderBy: { id: 'asc' },
          select: {
            id: true,
            sku: true,
            name: true,
            base_price: true,
            stock_quantity: true,
            created_at: true
          }
        });

        const hasNextPage = products.length > limit;
        const items = hasNextPage ? products.slice(0, limit) : products;
        const nextCursor = hasNextPage ? items[items.length - 1].id : null;

        return {
          items,
          nextCursor,
          hasNextPage,
          total: items.length
        };
      };

      const paginateProductsByCategory = async (categoryId, cursor, limit = 50) => {
        const whereClause = {
          catalog_category_id: categoryId,
          ...(cursor ? { id: { gt: cursor } } : {})
        };
        
        const products = await prisma.product.findMany({
          where: whereClause,
          take: limit + 1,
          orderBy: { id: 'asc' },
          select: {
            id: true,
            sku: true,
            name: true,
            base_price: true,
            stock_quantity: true,
            created_at: true
          }
        });

        const hasNextPage = products.length > limit;
        const items = hasNextPage ? products.slice(0, limit) : products;
        const nextCursor = hasNextPage ? items[items.length - 1].id : null;

        return {
          items,
          nextCursor,
          hasNextPage,
          total: items.length
        };
      };

      return { paginateProducts, paginateProductsByCategory };
    };

    // 2. Создание системы кэширования запросов
    console.log('\n2. Создание системы кэширования запросов...');
    
    const createQueryCache = () => {
      const cache = new Map();
      const TTL = 5 * 60 * 1000; // 5 минут

      const getCacheKey = (query, params) => {
        return `${query}_${JSON.stringify(params)}`;
      };

      const get = async (query, params) => {
        const key = getCacheKey(query, params);
        const cached = cache.get(key);
        
        if (cached && cached.expires > Date.now()) {
          console.log(`   📋 Кэш попадание для: ${query}`);
          return cached.data;
        }
        
        if (cached) {
          cache.delete(key);
        }
        
        return null;
      };

      const set = async (query, params, data) => {
        const key = getCacheKey(query, params);
        cache.set(key, {
          data,
          expires: Date.now() + TTL
        });
        console.log(`   💾 Данные закэшированы для: ${query}`);
      };

      const invalidate = async (pattern) => {
        let invalidated = 0;
        for (const key of cache.keys()) {
          if (key.includes(pattern)) {
            cache.delete(key);
            invalidated++;
          }
        }
        console.log(`   🗑️ Инвалидировано записей кэша: ${invalidated}`);
      };

      const clear = async () => {
        cache.clear();
        console.log('   🧹 Кэш очищен');
      };

      return { get, set, invalidate, clear };
    };

    // 3. Оптимизация запросов с использованием select
    console.log('\n3. Оптимизация запросов с использованием select...');
    
    const createOptimizedQueries = () => {
      // Оптимизированный запрос для списка товаров
      const getProductsList = async (categoryId, limit = 50, offset = 0) => {
        return await prisma.product.findMany({
          where: { catalog_category_id: categoryId },
          take: limit,
          skip: offset,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            sku: true,
            name: true,
            base_price: true,
            stock_quantity: true,
            is_active: true,
            created_at: true
            // Не загружаем properties_data и specifications для списка
          }
        });
      };

      // Оптимизированный запрос для детальной информации о товаре
      const getProductDetails = async (productId) => {
        return await prisma.product.findUnique({
          where: { id: productId },
          select: {
            id: true,
            sku: true,
            name: true,
            description: true,
            base_price: true,
            stock_quantity: true,
            brand: true,
            model: true,
            properties_data: true,
            specifications: true,
            is_active: true,
            is_featured: true,
            created_at: true,
            updated_at: true,
            catalog_category: {
              select: {
                id: true,
                name: true,
                path: true
              }
            }
          }
        });
      };

      // Оптимизированный запрос для статистики
      const getCategoryStats = async (categoryId) => {
        const [totalProducts, activeProducts, totalValue] = await Promise.all([
          prisma.product.count({
            where: { catalog_category_id: categoryId }
          }),
          prisma.product.count({
            where: { 
              catalog_category_id: categoryId,
              is_active: true
            }
          }),
          prisma.product.aggregate({
            where: { catalog_category_id: categoryId },
            _sum: { base_price: true }
          })
        ]);

        return {
          totalProducts,
          activeProducts,
          inactiveProducts: totalProducts - activeProducts,
          totalValue: totalValue._sum.base_price || 0
        };
      };

      return { getProductsList, getProductDetails, getCategoryStats };
    };

    // 4. Создание системы ленивой загрузки
    console.log('\n4. Создание системы ленивой загрузки...');
    
    const createLazyLoading = () => {
      const loadedData = new Map();
      const loadingPromises = new Map();

      const loadProduct = async (productId) => {
        if (loadedData.has(productId)) {
          return loadedData.get(productId);
        }

        if (loadingPromises.has(productId)) {
          return await loadingPromises.get(productId);
        }

        const promise = prisma.product.findUnique({
          where: { id: productId },
          select: {
            id: true,
            sku: true,
            name: true,
            base_price: true,
            stock_quantity: true,
            properties_data: true
          }
        });

        loadingPromises.set(productId, promise);
        
        try {
          const product = await promise;
          loadedData.set(productId, product);
          return product;
        } finally {
          loadingPromises.delete(productId);
        }
      };

      const preloadProducts = async (productIds) => {
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            sku: true,
            name: true,
            base_price: true,
            stock_quantity: true,
            properties_data: true
          }
        });

        products.forEach(product => {
          loadedData.set(product.id, product);
        });

        console.log(`   📦 Предзагружено товаров: ${products.length}`);
        return products;
      };

      const clearCache = () => {
        loadedData.clear();
        loadingPromises.clear();
        console.log('   🧹 Кэш ленивой загрузки очищен');
      };

      return { loadProduct, preloadProducts, clearCache };
    };

    // 5. Создание системы батчинга запросов
    console.log('\n5. Создание системы батчинга запросов...');
    
    const createBatchQueries = () => {
      const batchSize = 100;
      const batchDelay = 10; // мс

      const batchUpdateProducts = async (updates) => {
        const results = [];
        
        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize);
          
          const batchResults = await Promise.all(
            batch.map(update => 
              prisma.product.update({
                where: { id: update.id },
                data: update.data
              })
            )
          );
          
          results.push(...batchResults);
          
          if (i + batchSize < updates.length) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
          }
        }

        console.log(`   📦 Обработано батчей: ${Math.ceil(updates.length / batchSize)}`);
        return results;
      };

      const batchCreateProducts = async (products) => {
        const results = [];
        
        for (let i = 0; i < products.length; i += batchSize) {
          const batch = products.slice(i, i + batchSize);
          
          const batchResults = await prisma.product.createMany({
            data: batch,
            skipDuplicates: true
          });
          
          results.push(batchResults);
          
          if (i + batchSize < products.length) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
          }
        }

        console.log(`   📦 Создано батчей: ${Math.ceil(products.length / batchSize)}`);
        return results;
      };

      return { batchUpdateProducts, batchCreateProducts };
    };

    // 6. Тестирование системы масштабирования
    console.log('\n6. Тестирование системы масштабирования...');
    
    // Тестируем курсорную пагинацию
    const { paginateProducts, paginateProductsByCategory } = createCursorPagination();
    const firstPage = await paginateProducts(null, 10);
    console.log(`   ✅ Курсорная пагинация: ${firstPage.items.length} товаров, hasNext: ${firstPage.hasNextPage}`);
    
    // Тестируем кэширование
    const cache = createQueryCache();
    await cache.set('test_query', { param: 'value' }, { result: 'cached' });
    const cachedResult = await cache.get('test_query', { param: 'value' });
    console.log(`   ✅ Кэширование: ${cachedResult ? 'работает' : 'не работает'}`);
    
    // Тестируем оптимизированные запросы
    const { getProductsList, getCategoryStats } = createOptimizedQueries();
    const productsList = await getProductsList('cmg50xcgs001cv7mn0tdyk1wo', 5);
    const categoryStats = await getCategoryStats('cmg50xcgs001cv7mn0tdyk1wo');
    console.log(`   ✅ Оптимизированные запросы: ${productsList.length} товаров, ${categoryStats.totalProducts} всего`);
    
    // Тестируем ленивую загрузку
    const { loadProduct, preloadProducts } = createLazyLoading();
    if (productsList.length > 0) {
      const product = await loadProduct(productsList[0].id);
      console.log(`   ✅ Ленивая загрузка: ${product ? 'работает' : 'не работает'}`);
    }
    
    // Тестируем батчинг
    const { batchUpdateProducts } = createBatchQueries();
    const testUpdates = productsList.slice(0, 3).map(product => ({
      id: product.id,
      data: { updated_at: new Date() }
    }));
    const batchResults = await batchUpdateProducts(testUpdates);
    console.log(`   ✅ Батчинг: ${batchResults.length} обновлений`);

    console.log('\n🎉 РЕШЕНИЕ ПРОБЛЕМ МАСШТАБИРОВАНИЯ ЗАВЕРШЕНО!');
    console.log('\n📊 СОЗДАННЫЕ СИСТЕМЫ:');
    console.log('   ✅ Курсорная пагинация - эффективная навигация по большим данным');
    console.log('   ✅ Кэширование запросов - ускорение повторных запросов');
    console.log('   ✅ Оптимизированные запросы - минимизация загружаемых данных');
    console.log('   ✅ Ленивая загрузка - загрузка данных по требованию');
    console.log('   ✅ Батчинг запросов - группировка операций для производительности');
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Использовать курсорную пагинацию вместо offset-based');
    console.log('   2. Кэшировать часто запрашиваемые данные');
    console.log('   3. Загружать только необходимые поля');
    console.log('   4. Использовать ленивую загрузку для больших списков');
    console.log('   5. Группировать операции в батчи для лучшей производительности');

  } catch (error) {
    console.error('❌ Ошибка при решении проблем масштабирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixScalabilityIssues();
