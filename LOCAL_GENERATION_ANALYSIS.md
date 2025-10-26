# 🔍 АНАЛИЗ: Генерация документов ЛОКАЛЬНО

## 📊 ТЕКУЩАЯ СИТУАЦИЯ ЛОКАЛЬНО:

### ✅ Установлено:
1. `puppeteer` - есть
2. `@sparticuz/chromium` - есть ✅
3. `exceljs` - есть

### ❌ Проблема:
**Chrome не скачан локально** (нет `node_modules\puppeteer\local-chromium`)
**Причина:** Ошибки сети при установке

---

## 🔍 КАК ПРОИСХОДИТ ГЕНЕРАЦИЯ:

### Цепочка вызовов:

```
1. app/api/documents/generate/route.ts
   └──> generatePDF() (строка 10)
       └──> puppeteer.launch() (без chromium) ❌

2. lib/export/puppeteer-generator.ts  
   └──> generatePDFWithPuppeteer() (строка 177)
       └──> puppeteer.launch() (без chromium) ❌

3. ✅ lib/pdf/htmlToPdf.ts
   └──> htmlToPdfBuffer()
       └──> puppeteer-core + @sparticuz/chromium ✅
```

---

## 🎯 ГДЕ ИСПОЛЬЗУЕТСЯ:

### ❌ Используется неправильно (без chromium):
- `app/api/documents/generate/route.ts` → `generatePDF()`
- `lib/export/puppeteer-generator.ts` → `generatePDFWithPuppeteer()`
- `app/api/export/fast/route.ts` → `exportDocumentWithPDF()`

### ✅ Используется правильно (с chromium):
- `lib/pdf/htmlToPdf.ts` → `htmlToPdfBuffer()`
- `app/lib/pdf/htmlToPdf.ts` → дубликат правильной реализации

---

## 🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА ЛОКАЛЬНО:

### 1. Проверка установки:

```bash
✅ puppeteer: Установлен
❌ local-chromium: Нет (Chrome не скачался)
✅ @sparticuz/chromium: Установлен
✅ exceljs: Установлен
```

### 2. Код который НЕ РАБОТАЕТ локально:

**Файл:** `lib/export/puppeteer-generator.ts`
```typescript
// Строка 3:
import puppeteer, { Browser } from 'puppeteer';  // ❌ обычный puppeteer

// Строка 177:
const browser = await puppeteer.launch({  // ❌ ищет Chrome в системе
  headless: true,
  args: [...]
});
```

**Проблема:** Ищет Chrome локально, но его нет

### 3. Код который ДОЛЖЕН работать (но не используется):

**Файл:** `lib/pdf/htmlToPdf.ts`
```typescript
// Строка 1-2:
import chromium from '@sparticuz/chromium';  // ✅ правильный импорт
import puppeteer from 'puppeteer-core';     // ✅ правильно

// Строка 29:
const browser = await puppeteer.launch({
  args: chromium.args,                      // ✅ использует chromium
  executablePath: await chromium.executablePath(),  // ✅ правильный путь
  headless: true
});
```

**Проблема:** Эта функция НЕ используется! ❌

---

## 🔍 ЧТО ПРОИСХОДИТ ЛОКАЛЬНО:

### При попытке генерации PDF:

1. Вызывается `generatePDF()` или `generatePDFWithPuppeteer()`
2. Код пытается запустить `puppeteer.launch()`
3. Puppeteer ищет Chrome в системе
4. ❌ Chrome не найден → **ОШИБКА**

### При локальном запуске:
- Возможно puppeteer скачивает Chrome автоматически
- ИЛИ вернется ошибка "Could not find Chrome"

### На ВМ (Docker Alpine):
- Chromium НЕ установлен в образе
- ❌ **ОБЯЗАТЕЛЬНАЯ ОШИБКА**

---

## 🧪 ТЕСТ ЛОКАЛЬНО:

### Попробовать сгенерировать PDF локально:

```bash
# 1. Остановить dev сервер
Get-Process node | Stop-Process

# 2. Запустить с правильной БД
$env:DATABASE_URL="postgresql://domeo:domeo@localhost:5435/domeo"
npm run dev

# 3. Открыть http://localhost:3000
# 4. Попробовать создать PDF
```

---

## 🔍 ОЖИДАЕМЫЕ ОШИБКИ:

### Ошибка 1: "Could not find Chrome"
- **Где:** Локально
- **Причина:** Chrome не скачан
- **Решение:** Использовать `@sparticuz/chromium`

### Ошибка 2: "Table users does not exist"
- **Где:** Локально
- **Причина:** БД не применялась миграция
- **Решено:** Схема применена с ВМ

### Ошибка 3: Chrome не найден на ВМ
- **Где:** ВМ
- **Причина:** Docker Alpine без Chromium
- **Решение:** Использовать `@sparticuz/chromium`

---

## 📝 ИТОГ ЛОКАЛЬНОГО АНАЛИЗА:

### ✅ Что работает:
- Prisma engines установлены
- ExcelJS работает (не требует Chrome)
- Код компилируется

### ❌ Что НЕ работает:
- PDF генерация (нет Chrome)
- Puppeteer ищет Chrome в системе

### 🔧 Что нужно исправить:
1. Использовать `@sparticuz/chromium` вместо обычного `puppeteer`
2. ИЛИ установить Chromium в Docker

---

**ДЕЛАТЬ ПОКА НЕ НУЖНО - только анализ ✅**

