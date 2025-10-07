# M7 — Исправление ошибок MODULE_NOT_FOUND

## Проблема
В логах Next.js появлялись ошибки `MODULE_NOT_FOUND` для `_not-found/page.js`.

## Причина
Ошибка была вызвана несколькими проблемами типизации и импортов:

1. **Неправильные типы в API роутах** - использование `null` вместо `undefined`
2. **Неправильные импорты** - импорт несуществующих экспортов
3. **Проблемы с типизацией Prisma** - несоответствие типов между Prisma и нашими интерфейсами
4. **Проблемы с типизацией компонентов** - использование `any` типов

## Исправления

### 1. Исправление типов в API роутах
```typescript
// Было
clientInfo: quote.clientInfo || null

// Стало
clientInfo: quote.clientInfo || undefined
```

### 2. Исправление импортов
```typescript
// Было
import { htmlToPdf } from '@/lib/pdf/htmlToPdf';

// Стало
import { htmlToPdfBuffer } from '@/lib/pdf/htmlToPdf';
```

### 3. Исправление типизации Prisma
```typescript
// Было
const where = q
  ? { OR: [{ sku: { contains: q, mode: 'insensitive' } }] }
  : {};

// Стало
const where = q
  ? { OR: [{ sku: { contains: q, mode: 'insensitive' as const } }] }
  : {};
```

### 4. Исправление типизации компонентов
```typescript
// Было
const [editData, setEditData] = useState<any>({});

// Стало
const [editData, setEditData] = useState<Partial<Quote>>({});
```

## Результат
- ✅ Сборка проходит без ошибок
- ✅ Нет ошибок `MODULE_NOT_FOUND`
- ✅ Все типы корректны
- ✅ Проект готов к продакшену

## Тесты
Добавлены тесты для проверки:
- Отсутствия ошибок `MODULE_NOT_FOUND`
- Корректной обработки 404 страниц
- Здоровья сборки

## Скрипт проверки
Создан скрипт `scripts/check_build_health.sh` для автоматической проверки здоровья сборки.

## Рекомендации
1. Всегда используйте `undefined` вместо `null` для опциональных полей
2. Проверяйте типы при работе с Prisma
3. Используйте строгую типизацию вместо `any`
4. Регулярно запускайте `npm run build` для проверки ошибок
