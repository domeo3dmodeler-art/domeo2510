# План изменений логики статусов документов

## Текущая ситуация

### Логика документов
1. **Quote** (КП)
2. **Invoice** (Счет) - создается от Quote
3. **Order** (Заказ) - служебный, связывает Invoice с SupplierOrder
4. **SupplierOrder** (Заказ поставщику) - создается от Order

### Проблемы
- ❌ SupplierOrder создается от Order, но по логике должен создаваться от Invoice
- ❌ Order - лишнее связующее звено
- ❌ Исполнитель должен создавать SupplierOrder от счета (Invoice), а не от заказа
- ❌ Комплектатор может менять статусы после PAID (не должен)
- ❌ Статус IN_PRODUCTION нужно заменить на ORDERED
- ❌ READY и COMPLETED - нужна ясность

---

## Целевая логика

### Цепочка документов
```
Quote → Invoice → SupplierOrder
```

### Роли и статусы

#### **Комплектатор (COMPLECTATOR)**
- Доступ к:
  - Quote: DRAFT, SENT → (может изменять)
  - Invoice: DRAFT, SENT, PAID → (может изменять до PAID)
- После PAID:
  - ❌ Не может изменить статус Invoice
  - ✅ Получает уведомления от Исполнителя

#### **Исполнитель (EXECUTOR)**
- Доступ к:
  - Invoice: PAID, ORDERED, RECEIVED_FROM_SUPPLIER, COMPLETED → (может изменять)
  - SupplierOrder: создает и управляет
- Создает SupplierOrder от Invoice (не от Order)
- Может менять статусы после PAID

#### **Админ (ADMIN)**
- Полный доступ ко всем статусам
- Может возвращать статусы назад

---

## Статусы Invoice

### Старые статусы (убрать)
- `IN_PRODUCTION` → заменить на `ORDERED`
- `READY` → считается как `COMPLETED` (исполнен)

### Новые статусы
1. **DRAFT** - Черновик (Комплектатор)
2. **SENT** - Отправлен (Комплектатор)
3. **PAID** - Оплачен/Заказ (Комплектатор)
   - После этого - блокировка для Комплектатора
   - Уведомление Исполнителю
4. **ORDERED** - Заказ размещен (Исполнитель)
5. **RECEIVED_FROM_SUPPLIER** - Получен от поставщика (Исполнитель)
6. **COMPLETED** - Исполнен (Исполнитель)
   - Блокировка изменений для всех (кроме Админа)
7. **CANCELLED** - Отменен (Комплектатор/Админ)

---

## Изменения в коде

### 1. Убрать Order из цепочки
**Файл**: `app/api/supplier-orders/route.ts`
```typescript
// БЫЛО:
POST /api/supplier-orders
Body: { orderId: string }

// ДОЛЖНО БЫТЬ:
POST /api/supplier-orders
Body: { invoiceId: string }
```

**Изменения**:
- Заменить `orderId` на `invoiceId`
- `SupplierOrder.parent_document_id` = `Invoice.id`
- Убрать поиск Order
- Напрямую работать с Invoice

### 2. Заменить IN_PRODUCTION на ORDERED
**Файлы**:
- `app/api/invoices/[id]/status/route.ts`
- `app/api/documents/[id]/status/route.ts`
- `app/api/quotes/[id]/status/route.ts`
- `app/api/supplier-orders/[id]/status/route.ts`
- `lib/validation/status-transitions.ts`
- `lib/validation/status-blocking.ts`

**Изменения**:
```typescript
// БЫЛО:
const VALID_STATUSES = ['...', 'IN_PRODUCTION', ...];

// ДОЛЖНО БЫТЬ:
const VALID_STATUSES = ['...', 'ORDERED', ...];
```

### 3. Обновить блокировку статусов для Комплектатора
**Файл**: `lib/auth/permissions.ts`

**Функция**: `canUserChangeStatus`
```typescript
if (userRole === 'COMPLECTATOR') {
  // Может изменять только до PAID
  if (documentType === 'invoice' && currentStatus === 'PAID') {
    return false; // Блокируем после PAID
  }
}
```

### 4. Обновить уведомления
**Файл**: `lib/notifications/status-notifications.ts`

**Добавить**:
- `ORDERED` → уведомление Комплектатору
- `RECEIVED_FROM_SUPPLIER` → уведомление Комплектатору
- `COMPLETED` → уведомление Комплектатору

### 5. Обновить синхронизацию статусов SupplierOrder
**Файл**: `app/api/supplier-orders/[id]/status/route.ts`

**Функция**: `synchronizeDocumentStatuses`
```typescript
// Обновить mapping статусов:
ORDERED → ORDERED (Invoice)
RECEIVED_FROM_SUPPLIER → RECEIVED_FROM_SUPPLIER (Invoice)
COMPLETED → COMPLETED (Invoice)
```

### 6. Читать READY как COMPLETED
**Файл**: `app/api/supplier-orders/[id]/status/route.ts`

**Изменения**:
- Если в коде есть `READY`, заменить на `COMPLETED`
- В БД: migrate все `READY` → `COMPLETED`

---

## Миграция базы данных

### SQL для замены статусов
```sql
-- Заменить IN_PRODUCTION на ORDERED в Invoice
UPDATE "Invoice" SET status = 'ORDERED' WHERE status = 'IN_PRODUCTION';

-- Заменить READY на COMPLETED в Invoice
UPDATE "Invoice" SET status = 'COMPLETED' WHERE status = 'READY';

-- Заменить IN_PRODUCTION на ORDERED в SupplierOrder
UPDATE "SupplierOrder" SET status = 'ORDERED' WHERE status = 'IN_PRODUCTION';

-- Заменить READY на COMPLETED в SupplierOrder
UPDATE "SupplierOrder" SET status = 'COMPLETED' WHERE status = 'READY';

-- Заменить IN_PRODUCTION на ORDERED в Quote
UPDATE "Quote" SET status = 'ORDERED' WHERE status = 'IN_PRODUCTION';

-- Заменить READY на COMPLETED в Quote
UPDATE "Quote" SET status = 'COMPLETED' WHERE status = 'READY';
```

---

## Приоритет изменений

### Высокий приоритет
1. ✅ Изменить SupplierOrder: `orderId` → `invoiceId`
2. ✅ Заменить IN_PRODUCTION на ORDERED
3. ✅ Блокировать Комплектатора после PAID
4. ✅ Обновить синхронизацию статусов

### Средний приоритет
5. ✅ Заменить READY на COMPLETED
6. ✅ Обновить уведомления
7. ✅ Миграция БД

### Низкий приоритет
8. ✅ Обновить UI (статусы и отображение)
9. ✅ Документация

---

## Следующие шаги

1. Исправить `app/api/supplier-orders/route.ts` - изменить с `orderId` на `invoiceId`
2. Заменить `IN_PRODUCTION` → `ORDERED` во всех файлах
3. Добавить блокировку для Комплектатора после `PAID`
4. Обновить синхронизацию статусов
5. Запустить миграцию БД
6. Протестировать workflow

