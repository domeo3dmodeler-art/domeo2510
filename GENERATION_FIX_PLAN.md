# 🔧 ПЛАН ИСПРАВЛЕНИЯ: Генерация PDF и Excel

## ❌ ПРОБЛЕМА:

### На ВМ:
```
❌ Error: Could not find Chrome (ver. 141.0.7390.78)
```

### Локально:
- Chrome не скачан
- При попытке генерации будет ошибка

---

## 📊 АРХИТЕКТУРА:

### Функции генерации:

#### ❌ НЕПРАВИЛЬНЫЕ (используют обычный puppeteer):
1. `app/api/documents/generate/route.ts` → `generatePDF()` (строка 10-38)
2. `lib/export/puppeteer-generator.ts` → `generatePDFWithPuppeteer()` (строка 177-187)

#### ✅ ПРАВИЛЬНАЯ (использует @sparticuz/chromium):
3. `lib/pdf/htmlToPdf.ts` → `htmlToPdfBuffer()` ← НЕ ИСПОЛЬЗУЕТСЯ!

---

## 🎯 ЧТО НУЖНО ИСПРАВИТЬ:

### Вариант 1: Переписать на chromium (рекомендую)

**Файлы для правки:**

#### 1. `lib/export/puppeteer-generator.ts`
```typescript
// Строка 3:
- import puppeteer, { Browser } from 'puppeteer';
+ import puppeteer from 'puppeteer-core';
+ import chromium from '@sparticuz/chromium';

// Строка 177:
- const browser = await puppeteer.launch({
-   headless: true,
-   args: [
-     '--no-sandbox',
-     ...
-   ]
- });
+ const browser = await puppeteer.launch({
+   args: chromium.args,
+   executablePath: await chromium.executablePath(),
+   headless: chromium.headless
+ });
```

#### 2. `app/api/documents/generate/route.ts`
```typescript
// Строка 3:
- import puppeteer from 'puppeteer';
+ import puppeteer from 'puppeteer-core';
+ import chromium from '@sparticuz/chromium';

// Строка 11:
- const browser = await puppeteer.launch({ ... });
+ const browser = await puppeteer.launch({
+   args: chromium.args,
+   executablePath: await chromium.executablePath(),
+   headless: chromium.headless
+ });
```

---

## 🔍 КАК РАБОТАЕТ ДЕДУПЛИКАЦИЯ:

### Функция: `findExistingDocument()`

**Локация:** 3 копии:
1. `app/api/documents/create/route.ts` (строка 113)
2. `app/api/documents/create-batch/route.ts` (строка 114)
3. `lib/export/puppeteer-generator.ts` (строка 1087)

**Критерии сопоставления:**
```typescript
{
  parent_document_id: string | null,  // Родитель
  cart_session_id: string | null,      // Сессия
  client_id: string,                   // Клиент
  total_amount: number,                // Сумма
  // + contentHash для supplier_order
}
```

**Логика:**
1. Создает `contentHash` из (clientId, items, totalAmount)
2. Ищет документ по всем 4 критериям
3. Если найден - возвращает существующий (дедупликация)
4. Если нет - создает новый

**Применение:** Только если `prevent_duplicates: true`

---

## 🔗 СВЯЗИ ДОКУМЕНТОВ:

### Цепочка создания:

```
1. КП (Quote)
   └──> parent_document_id: null
   
2. Счет (Invoice)  
   └──> parent_document_id: quote_id
   
3. Заказ (Order)
   └──> parent_document_id: invoice_id
   
4. Заказ поставщика (SupplierOrder)
   └──> parent_document_id: order_id
```

**Все одной сессии:**
- `cart_session_id: "cart_xyz..."` (одинаковый для всех)

---

## ✅ ПЛАН ИСПРАВЛЕНИЯ:

### Шаг 1: Исправить `lib/export/puppeteer-generator.ts`
- Добавить импорт `chromium`
- Заменить `puppeteer` на `puppeteer-core`
- Использовать `chromium.executablePath()`

### Шаг 2: Исправить `app/api/documents/generate/route.ts`
- Аналогичные изменения

### Шаг 3: Тестирование
- Локально: проверить что PDF генерируется
- На ВМ: проверить что PDF генерируется
- Проверить дедупликацию

---

## 📋 ИСПРАВЛЕНИЯ (не делаем пока):

### Изменение 1: lib/export/puppeteer-generator.ts

```typescript
// Строка 1-2:
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
+ import puppeteer from 'puppeteer-core';
+ import chromium from '@sparticuz/chromium';
```

### Изменение 2: lib/export/puppeteer-generator.ts (строка 177)

```typescript
- const browser = await puppeteer.launch({
-   headless: true,
-   args: [...]
- });

+ const executablePath = await chromium.executablePath();
+ const browser = await puppeteer.launch({
+   args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
+   executablePath,
+   headless: chromium.headless
+ });
```

### Изменение 3: app/api/documents/generate/route.ts

Аналогично

---

## 🧪 КАК ПРОТЕСТИРОВАТЬ ЛОКАЛЬНО:

```bash
# 1. Остановить сервер
Get-Process node | Stop-Process

# 2. Исправить код (добавить chromium)

# 3. Запустить
$env:DATABASE_URL="postgresql://domeo:domeo@localhost:5435/domeo"
npm run dev

# 4. Открыть браузер
# http://localhost:3000/doors

# 5. Добавить товар в корзину
# 6. Экспортировать как PDF
# 7. Проверить что файл скачался без ошибок
```

---

## ⚠️ ВАЖНО:

1. **Дедупликация:** Работает на основе 4-5 полей точного совпадения
2. **Связи:** parent_document_id + cart_session_id
3. **Chrome:** НЕТ в Docker - использовать chromium
4. **Excel:** Работает (не требует Chrome)

---

**ПРАВИТЬ ПОКА НЕ НУЖНО ✅ Анализ закончен**

