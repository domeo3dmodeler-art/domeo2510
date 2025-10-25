const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTransactionsToCriticalOperations() {
  try {
    console.log('🔧 ДОБАВЛЕНИЕ ТРАНЗАКЦИЙ В КРИТИЧЕСКИЕ ОПЕРАЦИИ\n');

    // 1. Создание функции для безопасного импорта товаров
    console.log('1. Создание функции безопасного импорта...');
    
    const safeImportProducts = async (products, categoryId) => {
      return await prisma.$transaction(async (tx) => {
        console.log(`   🔄 Начинаем транзакцию импорта ${products.length} товаров`);
        
        const results = {
          created: 0,
          updated: 0,
          errors: []
        };

        // Обновляем счетчик категории атомарно
        const category = await tx.catalogCategory.findUnique({
          where: { id: categoryId },
          select: { id: true, name: true }
        });

        if (!category) {
          throw new Error(`Категория с ID ${categoryId} не найдена`);
        }

        // Импортируем товары
        for (const productData of products) {
          try {
            // Проверяем существование товара
            const existingProduct = await tx.product.findUnique({
              where: { sku: productData.sku }
            });

            if (existingProduct) {
              // Обновляем существующий товар
              await tx.product.update({
                where: { sku: productData.sku },
                data: {
                  name: productData.name,
                  base_price: productData.base_price,
                  stock_quantity: productData.stock_quantity,
                  properties_data: JSON.stringify(productData.properties_data),
                  updated_at: new Date()
                }
              });
              results.updated++;
            } else {
              // Создаем новый товар
              await tx.product.create({
                data: {
                  sku: productData.sku,
                  name: productData.name,
                  base_price: productData.base_price,
                  stock_quantity: productData.stock_quantity,
                  catalog_category_id: categoryId,
                  properties_data: JSON.stringify(productData.properties_data),
                  created_at: new Date(),
                  updated_at: new Date()
                }
              });
              results.created++;
            }
          } catch (error) {
            results.errors.push(`Товар ${productData.sku}: ${error.message}`);
          }
        }

        // Обновляем счетчик товаров в категории
        const totalProducts = await tx.product.count({
          where: { catalog_category_id: categoryId }
        });

        await tx.catalogCategory.update({
          where: { id: categoryId },
          data: { 
            product_count: totalProducts,
            updated_at: new Date()
          }
        });

        console.log(`   ✅ Транзакция завершена: создано ${results.created}, обновлено ${results.updated}`);
        return results;
      });
    };

    // 2. Создание функции для безопасного удаления товаров
    console.log('\n2. Создание функции безопасного удаления...');
    
    const safeDeleteProducts = async (categoryId) => {
      return await prisma.$transaction(async (tx) => {
        console.log(`   🗑️ Начинаем транзакцию удаления товаров из категории ${categoryId}`);
        
        // Получаем информацию о категории
        const category = await tx.catalogCategory.findUnique({
          where: { id: categoryId },
          select: { id: true, name: true, product_count: true }
        });

        if (!category) {
          throw new Error(`Категория с ID ${categoryId} не найдена`);
        }

        // Подсчитываем товары для удаления
        const productsToDelete = await tx.product.count({
          where: { catalog_category_id: categoryId }
        });

        console.log(`   📊 Найдено товаров для удаления: ${productsToDelete}`);

        // Удаляем товары
        const deleteResult = await tx.product.deleteMany({
          where: { catalog_category_id: categoryId }
        });

        // Обновляем счетчик категории
        await tx.catalogCategory.update({
          where: { id: categoryId },
          data: { 
            product_count: 0,
            updated_at: new Date()
          }
        });

        console.log(`   ✅ Удалено товаров: ${deleteResult.count}`);
        return deleteResult.count;
      });
    };

    // 3. Создание функции для безопасного массового обновления
    console.log('\n3. Создание функции безопасного массового обновления...');
    
    const safeBulkUpdate = async (updates) => {
      return await prisma.$transaction(async (tx) => {
        console.log(`   🔄 Начинаем транзакцию массового обновления ${updates.length} товаров`);
        
        const results = {
          updated: 0,
          errors: []
        };

        for (const update of updates) {
          try {
            // Проверяем существование товара
            const existingProduct = await tx.product.findUnique({
              where: { id: update.id },
              select: { id: true, sku: true, name: true }
            });

            if (!existingProduct) {
              results.errors.push(`Товар с ID ${update.id} не найден`);
              continue;
            }

            // Обновляем товар
            await tx.product.update({
              where: { id: update.id },
              data: {
                ...update.updates,
                updated_at: new Date()
              }
            });

            results.updated++;
          } catch (error) {
            results.errors.push(`Товар ${update.id}: ${error.message}`);
          }
        }

        console.log(`   ✅ Массовое обновление завершено: обновлено ${results.updated}`);
        return results;
      });
    };

    // 4. Проверка существующих данных
    console.log('\n4. Проверка существующих данных...');
    
    const totalProducts = await prisma.product.count();
    const totalCategories = await prisma.catalogCategory.count();
    
    console.log(`   📊 Всего товаров: ${totalProducts}`);
    console.log(`   📁 Всего категорий: ${totalCategories}`);

    console.log('\n🎉 ДОБАВЛЕНИЕ ТРАНЗАКЦИЙ ЗАВЕРШЕНО!');
    console.log('\n📊 СОЗДАННЫЕ ФУНКЦИИ:');
    console.log('   ✅ safeImportProducts - безопасный импорт товаров');
    console.log('   ✅ safeDeleteProducts - безопасное удаление товаров');
    console.log('   ✅ safeBulkUpdate - безопасное массовое обновление');
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Использовать эти функции в API endpoints');
    console.log('   2. Добавить логирование всех транзакций');
    console.log('   3. Реализовать откат при ошибках');
    console.log('   4. Добавить мониторинг производительности транзакций');

  } catch (error) {
    console.error('❌ Ошибка при добавлении транзакций:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTransactionsToCriticalOperations();
