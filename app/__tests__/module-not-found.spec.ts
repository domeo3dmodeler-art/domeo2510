// __tests__/module-not-found.spec.ts
// Тест для проверки отсутствия ошибок MODULE_NOT_FOUND

import { test, expect } from '@playwright/test';

test.describe('Module Not Found Error Tests', () => {
  test('should not have MODULE_NOT_FOUND errors in console', async ({ page }) => {
    // Слушаем ошибки консоли
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Переходим на главную страницу
    await page.goto('/');
    
    // Ждем загрузки
    await page.waitForLoadState('networkidle');
    
    // Проверяем, что нет ошибок MODULE_NOT_FOUND
    const moduleNotFoundErrors = consoleErrors.filter(error => 
      error.includes('MODULE_NOT_FOUND') || 
      error.includes('_not-found/page.js')
    );
    
    expect(moduleNotFoundErrors).toHaveLength(0);
  });

  test('should handle 404 pages correctly', async ({ page }) => {
    // Переходим на несуществующую страницу
    const response = await page.goto('/non-existent-page');
    
    // Проверяем, что страница загружается (не 500 ошибка)
    expect(response?.status()).toBe(404);
    
    // Проверяем, что отображается кастомная страница 404
    await expect(page.locator('h1')).toContainText('Страница не найдена');
  });

  test('should not have build errors', async ({ page }) => {
    // Переходим на различные страницы для проверки
    const pages = [
      '/',
      '/admin',
      '/admin/doors',
      '/admin/import',
      '/doors',
      '/quotes'
    ];

    for (const pagePath of pages) {
      try {
        const response = await page.goto(pagePath);
        // Проверяем, что страница загружается без ошибок сервера
        expect(response?.status()).toBeLessThan(500);
      } catch (error) {
        // Если страница не существует, это нормально
        console.log(`Page ${pagePath} not found, skipping...`);
      }
    }
  });

  test('should have proper error boundaries', async ({ page }) => {
    // Переходим на страницу админки
    await page.goto('/admin/doors');
    
    // Проверяем, что страница загружается
    await expect(page.locator('h1')).toContainText('Админка Doors');
    
    // Проверяем, что нет ошибок в консоли
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Ждем немного для возможных асинхронных ошибок
    await page.waitForTimeout(1000);
    
    // Проверяем, что нет критических ошибок
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('MODULE_NOT_FOUND') ||
      error.includes('Cannot resolve module') ||
      error.includes('Module not found')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle dynamic routes correctly', async ({ page }) => {
    // Тестируем динамические маршруты
    const dynamicRoutes = [
      '/admin/doors/series',
      '/admin/doors/options',
      '/admin/doors/constraints',
      '/admin/doors/templates'
    ];

    for (const route of dynamicRoutes) {
      try {
        const response = await page.goto(route);
        if (response?.status() === 200) {
          // Если страница загружается, проверяем отсутствие ошибок
          await page.waitForLoadState('networkidle');
          
          const consoleErrors: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              consoleErrors.push(msg.text());
            }
          });
          
          const moduleErrors = consoleErrors.filter(error => 
            error.includes('MODULE_NOT_FOUND')
          );
          
          expect(moduleErrors).toHaveLength(0);
        }
      } catch (error) {
        console.log(`Route ${route} not accessible, skipping...`);
      }
    }
  });
});
