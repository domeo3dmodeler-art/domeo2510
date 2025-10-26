# 🔍 АНАЛИЗ: Проблема генерации PDF и Excel на ВМ

## ❌ ПРОБЛЕМА:

### Ошибка из логов ВМ:
```
❌ Ошибка генерации PDF: Error: Could not find Chrome (ver. 141.0.7390.78)
❌ Fast export error: Error: PDF generation failed: Could not find Chrome
```

### Причина:
1. **В Dockerfile.staging НЕТ установки Chromium**
2. **Код использует обычный `puppeteer`** который ищет Chrome в системе
3. **В Alpine Linux нет Chrome** по умолчанию

---

## 📊 АРХИТЕКТУРА ГЕНЕРАЦИИ ДОКУМЕНТОВ:

### Текущая структура:

```
app/api/documents/generate/route.ts
├── generatePDF() - ❌ не работает (использует puppeteer без Chromium)
└── generateExcel() - ✅ должно работать (ExcelJS)

lib/export/puppeteer-generator.ts  
├── generatePDFWithPuppeteer() - ❌ не работает (использует puppeteer без Chromium)
└── generateExcelOrder() - ✅ должно работать

lib/pdf/htmlToPdf.ts
└── htmlToPdfBuffer() - ✅ ПРАВИЛЬНАЯ РЕАЛИЗАЦИЯ (использует @sparticuz/chromium)
```

---

## 🎯 ПРАВИЛА И СВЯЗИ (дедупликация):

### Дедупликация документов:

**Функция:** `findExistingDocument()` (в 3 местах)
```typescript
// Критерии поиска:
{
  parent_document_id: string | null,  // Родительский документ
  cart_session_id: string | null,     // ID сессии корзины
  client_id: string,                  // ID клиента
  total_amount: number,               // Общая сумма
  // + contentHash для supplier_order
}
```

**Логика:**
1. Создает `contentHash` из (clientId, items, totalAmount)
2. Ищет документ по всем критериям
3. Если найден - возвращает существующий
4. Если нет - создает новый

**Сложность:**
- Строгие критерии сопоставления
- Точное совпадение всех полей
- Правильная обработка `null` значений

---

## 💡 РЕШЕНИЕ ПРОБЛЕМЫ:

### Вариант 1: Добавить Chromium в Docker
```dockerfile
# В Dockerfile.staging, runner stage:
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont
```

**Плюсы:** Просто
**Минусы:** Увеличивает размер образа на ~200MB

---

### Вариант 2: Использовать @sparticuz/chromium
```typescript
// В generatePDFWithPuppeteer и generatePDF:
import chromium from '@sparticuz/chromium';

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless
});
```

**Плюсы:** 
- Уже есть в package.json
- Работает в Docker Alpine
- Меньший размер

**Минусы:** Нужно изменить код

---

### Вариант 3: Использовать существующую реализацию
Заменить вызовы `generatePDF()` на `htmlToPdfBuffer()` из `lib/pdf/htmlToPdf.ts`

**Плюсы:** 
- Уже работает правильно
- Не нужно менять Docker

**Минусы:** 
- Нужно изменить код в местах вызова

---

## 🔍 ЧТО ПРОВЕРИТЬ НА ВМ:

### 1. Проверить что есть в контейнере:
```bash
docker exec domeo-staging-app sh -c 'ls -la node_modules/.cache/puppeteer/'
docker exec domeo-staging-app sh -c 'ls -la node_modules/@sparticuz/chromium/'
```

### 2. Проверить логи Excel генерации:
```bash
docker logs domeo-staging-app 2>&1 | grep -i "excel"
```

### 3. Проверить используются ли правильные функции:
```bash
docker exec domeo-staging-app sh -c 'grep -n "generatePDF\|generatePDFWithPuppeteer" /app/.next/server/**/*.js | head -20'
```

---

## 📝 СЛОЖНЫЕ СВЯЗИ И ПРАВИЛА:

### 1. Дедупликация:
- **Функция:** `findExistingDocument()` 
- **Места:** 
  - `app/api/documents/create/route.ts`
  - `app/api/documents/create-batch/route.ts`
  - `lib/export/puppeteer-generator.ts`
- **Критерии:** 4-5 полей точного совпадения

### 2. Цепочки документов:
```
КП → Счет → Заказ → Заказ поставщика
(parent_document_id создает связи)
```

### 3. Поиск товаров:
- По конфигурации (стиль, модель, покрытие, цвет, размеры)
- С кэшированием результатов
- Оптимизированные запросы к БД

---

## 🎯 РЕКОМЕНДАЦИЯ:

### Для ПЕРЕДЕЛКИ (рекомендую):

**Вариант 2: Использовать @sparticuz/chromium**
```typescript
// В lib/export/puppeteer-generator.ts строка 177:
import chromium from '@sparticuz/chromium';

const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox'],
  executablePath: await chromium.executablePath(),
  headless: chromium.headless
});
```

**Изменения:**
1. ✅ Исправить `generatePDFWithPuppeteer()` в `lib/export/puppeteer-generator.ts`
2. ✅ Исправить `generatePDF()` в `app/api/documents/generate/route.ts`
3. ❌ Docker менять НЕ НУЖНО (chromium уже есть в пакетах)

---

## ✅ ГДЕ ПРАВИТЬ:

1. `lib/export/puppeteer-generator.ts` - строка 177
2. `app/api/documents/generate/route.ts` - строка 11

**ДЕЛАТЬ ПОКА НЕ НУЖНО - только анализ ✅**

