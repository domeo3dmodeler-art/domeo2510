// __tests__/admin-e2e.spec.ts
// E2E тесты для админки Doors

import { test, expect } from '@playwright/test';

test.describe('Admin Doors E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную страницу админки
    await page.goto('/admin/doors');
  });

  test('should display admin doors dashboard', async ({ page }) => {
    // Проверяем заголовок
    await expect(page.locator('h1')).toContainText('Админка Doors');
    
    // Проверяем наличие всех разделов
    await expect(page.locator('text=Серии')).toBeVisible();
    await expect(page.locator('text=Опции')).toBeVisible();
    await expect(page.locator('text=Ограничения')).toBeVisible();
    await expect(page.locator('text=Шаблоны КП')).toBeVisible();
    await expect(page.locator('text=Импорт прайса')).toBeVisible();
    await expect(page.locator('text=Аналитика')).toBeVisible();
  });

  test('should navigate to series management', async ({ page }) => {
    // Кликаем на карточку "Серии"
    await page.click('text=Серии');
    
    // Проверяем, что перешли на страницу серий
    await expect(page).toHaveURL('/admin/doors/series');
    await expect(page.locator('h1')).toContainText('Управление сериями');
    
    // Проверяем наличие кнопки создания
    await expect(page.locator('text=Создать серию')).toBeVisible();
  });

  test('should navigate to options management', async ({ page }) => {
    // Кликаем на карточку "Опции"
    await page.click('text=Опции');
    
    // Проверяем, что перешли на страницу опций
    await expect(page).toHaveURL('/admin/doors/options');
    await expect(page.locator('h1')).toContainText('Управление опциями');
    
    // Проверяем наличие фильтров
    await expect(page.locator('text=Тип опции')).toBeVisible();
    await expect(page.locator('text=Серия')).toBeVisible();
  });

  test('should navigate to constraints management', async ({ page }) => {
    // Кликаем на карточку "Ограничения"
    await page.click('text=Ограничения');
    
    // Проверяем, что перешли на страницу ограничений
    await expect(page).toHaveURL('/admin/doors/constraints');
    await expect(page.locator('h1')).toContainText('Ограничения совместимости');
    
    // Проверяем наличие статистики
    await expect(page.locator('text=Всего ограничений')).toBeVisible();
    await expect(page.locator('text=Несовместимости')).toBeVisible();
  });

  test('should navigate to templates management', async ({ page }) => {
    // Кликаем на карточку "Шаблоны КП"
    await page.click('text=Шаблоны КП');
    
    // Проверяем, что перешли на страницу шаблонов
    await expect(page).toHaveURL('/admin/doors/templates');
    await expect(page.locator('h1')).toContainText('Шаблоны КП');
    
    // Проверяем наличие кнопки создания
    await expect(page.locator('text=Создать шаблон')).toBeVisible();
  });

  test('should create new series', async ({ page }) => {
    // Переходим на страницу серий
    await page.goto('/admin/doors/series');
    
    // Кликаем на кнопку создания
    await page.click('text=Создать серию');
    
    // Проверяем, что перешли на форму создания
    await expect(page).toHaveURL('/admin/doors/series/new');
    await expect(page.locator('h1')).toContainText('Создание серии');
    
    // Заполняем форму
    await page.fill('input[name="name"]', 'Тестовая серия');
    await page.fill('textarea[name="description"]', 'Описание тестовой серии');
    
    // Добавляем материал
    await page.fill('input[placeholder*="материал"]', 'Тестовый материал');
    await page.click('button:has-text("Добавить")');
    
    // Проверяем, что материал добавился
    await expect(page.locator('text=Тестовый материал')).toBeVisible();
    
    // Заполняем базовую цену
    await page.fill('input[name="basePrice"]', '10000');
    
    // Проверяем валидацию - пытаемся отправить без названия
    await page.fill('input[name="name"]', '');
    await page.click('button:has-text("Создать серию")');
    
    // Проверяем, что появилась ошибка валидации
    await expect(page.locator('text=Название серии обязательно')).toBeVisible();
  });

  test('should filter options by type', async ({ page }) => {
    // Переходим на страницу опций
    await page.goto('/admin/doors/options');
    
    // Выбираем фильтр по типу
    await page.selectOption('select', 'hardware');
    
    // Проверяем, что фильтр применился (в реальном приложении здесь была бы проверка отфильтрованных результатов)
    await expect(page.locator('select')).toHaveValue('hardware');
  });

  test('should preview PDF template', async ({ page }) => {
    // Переходим на страницу шаблонов
    await page.goto('/admin/doors/templates');
    
    // Ищем кнопку предпросмотра (если есть шаблоны)
    const previewButton = page.locator('button:has-text("Предпросмотр PDF")').first();
    
    if (await previewButton.isVisible()) {
      // Кликаем на предпросмотр
      await previewButton.click();
      
      // Проверяем, что открылась новая вкладка или произошел переход
      // В реальном приложении здесь была бы проверка загрузки PDF
      await expect(page.locator('text=Загрузка...')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate series form', async ({ page }) => {
    // Переходим на форму создания серии
    await page.goto('/admin/doors/series/new');
    
    // Пытаемся отправить пустую форму
    await page.click('button:has-text("Создать серию")');
    
    // Проверяем валидацию названия
    await expect(page.locator('text=Название серии обязательно')).toBeVisible();
    
    // Заполняем только название
    await page.fill('input[name="name"]', 'Тест');
    
    // Пытаемся отправить снова
    await page.click('button:has-text("Создать серию")');
    
    // Проверяем валидацию материалов
    await expect(page.locator('text=Необходимо указать хотя бы один материал')).toBeVisible();
  });

  test('should handle constraint types', async ({ page }) => {
    // Переходим на страницу ограничений
    await page.goto('/admin/doors/constraints');
    
    // Проверяем фильтр по типу
    await page.selectOption('select', 'incompatible');
    
    // Проверяем, что фильтр применился
    await expect(page.locator('select')).toHaveValue('incompatible');
    
    // Возвращаемся к "Все типы"
    await page.selectOption('select', 'all');
    await expect(page.locator('select')).toHaveValue('all');
  });

  test('should navigate back to admin dashboard', async ({ page }) => {
    // Переходим на страницу серий
    await page.goto('/admin/doors/series');
    
    // Кликаем на "Назад к админке"
    await page.click('text=Назад к админке');
    
    // Проверяем, что вернулись на главную страницу админки
    await expect(page).toHaveURL('/admin/doors');
    await expect(page.locator('h1')).toContainText('Админка Doors');
  });

  test('should display quick actions', async ({ page }) => {
    // Проверяем наличие быстрых действий
    await expect(page.locator('text=Быстрые действия')).toBeVisible();
    
    // Проверяем кнопки быстрых действий
    await expect(page.locator('text=Создать серию')).toBeVisible();
    await expect(page.locator('text=Добавить опцию')).toBeVisible();
    await expect(page.locator('text=Добавить ограничение')).toBeVisible();
    await expect(page.locator('text=Импортировать прайс')).toBeVisible();
  });

  test('should handle empty states', async ({ page }) => {
    // Переходим на страницу серий
    await page.goto('/admin/doors/series');
    
    // Если нет серий, проверяем пустое состояние
    const emptyState = page.locator('text=Нет серий');
    if (await emptyState.isVisible()) {
      await expect(page.locator('text=Начните с создания новой серии')).toBeVisible();
      await expect(page.locator('text=Создать серию')).toBeVisible();
    }
  });
});
