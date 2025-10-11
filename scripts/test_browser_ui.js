const puppeteer = require('puppeteer');

async function testBrowserUI() {
  let browser;
  try {
    console.log('=== ТЕСТИРОВАНИЕ UI В БРАУЗЕРЕ ===');
    
    browser = await puppeteer.launch({ 
      headless: false, // Показываем браузер для визуальной проверки
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Переходим на страницу импорта
    console.log('🌐 Переходим на страницу импорта...');
    await page.goto('http://localhost:3000/admin/catalog/import', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Ждем загрузки страницы
    await page.waitForTimeout(3000);
    
    // Ищем категорию "Межкомнатные двери"
    console.log('🔍 Ищем категорию "Межкомнатные двери"...');
    await page.waitForSelector('[data-testid="category-select"], select, .category-select', { timeout: 10000 });
    
    // Кликаем на селектор категории
    const categorySelect = await page.$('select, [data-testid="category-select"], .category-select');
    if (categorySelect) {
      await categorySelect.click();
      await page.waitForTimeout(1000);
      
      // Ищем опцию "Межкомнатные двери"
      const doorOption = await page.$x("//option[contains(text(), 'Межкомнатные двери')]");
      if (doorOption.length > 0) {
        await doorOption[0].click();
        console.log('✅ Выбрана категория "Межкомнатные двери"');
        await page.waitForTimeout(2000);
        
        // Проверяем, появился ли TemplateManager
        console.log('🔍 Проверяем TemplateManager...');
        const templateManager = await page.$('.template-manager, [data-testid="template-manager"]');
        if (templateManager) {
          console.log('✅ TemplateManager найден');
          
          // Проверяем поля шаблона
          const fields = await page.$$eval('.field-item, .template-field, [data-testid="template-field"]', 
            elements => elements.map(el => el.textContent?.trim()).filter(Boolean)
          );
          
          console.log(`📋 Найдено полей в UI: ${fields.length}`);
          console.log('Первые 5 полей:');
          fields.slice(0, 5).forEach((field, i) => {
            console.log(`  ${i + 1}: "${field}"`);
            const hasQuestionMarks = field.includes('?');
            console.log(`     Содержит знаки вопроса: ${hasQuestionMarks}`);
          });
          
          // Проверяем кнопку скачивания
          const downloadButton = await page.$('button:has-text("Скачать"), button:has-text("Download")');
          if (downloadButton) {
            console.log('✅ Кнопка скачивания найдена');
          }
          
        } else {
          console.log('❌ TemplateManager не найден');
        }
      } else {
        console.log('❌ Опция "Межкомнатные двери" не найдена');
      }
    } else {
      console.log('❌ Селектор категории не найден');
    }
    
    // Делаем скриншот для проверки
    await page.screenshot({ path: 'ui_test_screenshot.png', fullPage: true });
    console.log('📸 Скриншот сохранен как ui_test_screenshot.png');
    
    console.log('\n✅ Тестирование UI завершено');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании UI:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Проверяем, установлен ли puppeteer
try {
  testBrowserUI();
} catch (error) {
  console.log('Puppeteer не установлен, пропускаем тест браузера');
  console.log('Для установки: npm install puppeteer');
}
