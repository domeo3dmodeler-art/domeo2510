// __tests__/build-health.spec.ts
// Тест для проверки здоровья сборки

import { test, expect } from '@playwright/test';

test.describe('Build Health Tests', () => {
  test('should build without errors', async ({ page }) => {
    // Переходим на главную страницу
    await page.goto('/');
    
    // Проверяем, что страница загружается
    await expect(page).toHaveTitle(/Domeo/);
    
    // Проверяем отсутствие критических ошибок в консоли
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // Фильтруем критические ошибки
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('MODULE_NOT_FOUND') ||
      error.includes('Cannot resolve module') ||
      error.includes('Module not found') ||
      error.includes('_not-found/page.js')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle admin routes correctly', async ({ page }) => {
    // Переходим на админку
    await page.goto('/admin');
    
    // Проверяем, что страница загружается
    await expect(page.locator('h1')).toBeVisible();
    
    // Проверяем отсутствие ошибок
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    
    const moduleErrors = consoleErrors.filter(error => 
      error.includes('MODULE_NOT_FOUND')
    );
    
    expect(moduleErrors).toHaveLength(0);
  });

  test('should handle 404 pages without errors', async ({ page }) => {
    // Переходим на несуществующую страницу
    const response = await page.goto('/non-existent-page');
    
    // Проверяем, что возвращается 404, а не 500
    expect(response?.status()).toBe(404);
    
    // Проверяем, что отображается кастомная страница 404
    await expect(page.locator('h1')).toContainText('Страница не найдена');
    
    // Проверяем отсутствие ошибок в консоли
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    const moduleErrors = consoleErrors.filter(error => 
      error.includes('MODULE_NOT_FOUND')
    );
    
    expect(moduleErrors).toHaveLength(0);
  });
});
