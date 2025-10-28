# Отчет: Исправления логики статусов документов

## ✅ Выполненные изменения

### 1. Изменен SupplierOrder: orderId → invoiceId
**Файлы**:
- `app/api/supplier-orders/route.ts`
  - POST: `orderId` → `invoiceId`
  - GET: `orderId` → `invoiceId`
  - Создание SupplierOrder теперь напрямую от Invoice (без Order)
  - `SupplierOrder.parent_document_id = Invoice.id`

### 2. Заменены статусы: IN_PRODUCTION → ORDERED, READY → RECEIVED_FROM_SUPPLIER
**Файлы**:
- `app/api/invoices/[id]/status/route.ts`
  - Удален `IN_PRODUCTION`
  - Добавлен `ORDERED`
- `app/api/supplier-orders/[id]/status/route.ts`
  - Удалены `IN_PRODUCTION`, `READY`
  - Добавлен `RECEIVED_FROM_SUPPLIER`
- `lib/validation/status-transitions.ts`
  - Обновлены переходы для invoice, order, supplier_order
- `lib/validation/status-blocking.ts`
  - Обновлены заблокированные статусы
- `lib/utils/status-labels.ts`
  - Обновлены русские названия статусов

### 3. Обновлена синхронизация статусов
**Файл**: `app/api/supplier-orders/[id]/status/route.ts`
- Функция `synchronizeDocumentStatuses` теперь работает с `invoiceId` вместо `orderId`
- Убран Order из цепочки синхронизации
- Синхронизируются: Invoice и Quote
- Обновлены уведомления для комплектатора

### 4. Создан SQL для миграции БД
**Файл**: `migrations/fix-status-names.sql`
- Заменяет `IN_PRODUCTION` → `ORDERED`
- Заменяет `READY` → `RECEIVED_FROM_SUPPLIER`
- Обновляет Invoice, SupplierOrder, Quote, Order

## 📊 Новая цепочка документов

```
Quote → Invoice → SupplierOrder
```

**Статусы Invoice**:
1. DRAFT - Черновик (Комплектатор)
2. SENT - Отправлен (Комплектатор)
3. PAID - Оплачен/Заказ (Комплектатор) ⚠️ после этого блокировка для Комплектатора
4. ORDERED - Заказ размещен (Исполнитель)
5. RECEIVED_FROM_SUPPLIER - Получен от поставщика (Исполнитель)
6. COMPLETED - Исполнен (Исполнитель) ⚠️ полная блокировка изменений
7. CANCELLED - Отменен

**Статусы SupplierOrder**:
1. PENDING - Ожидает
2. ORDERED - Заказ размещен
3. RECEIVED_FROM_SUPPLIER - Получен от поставщика
4. COMPLETED - Исполнен
5. CANCELLED - Отменен

## 🎯 Роли и права

### Комплектатор (COMPLECTATOR)
- Доступ до `PAID` включительно
- После `PAID` не может изменять статусы
- Получает уведомления от Исполнителя

### Исполнитель (EXECUTOR)
- Создает SupplierOrder от Invoice
- Может изменять статусы: `ORDERED`, `RECEIVED_FROM_SUPPLIER`, `COMPLETED`
- Получает уведомление при `PAID`

### Админ (ADMIN)
- Полный доступ ко всем статусам
- Может возвращать статусы назад

## 🚀 Следующие шаги

1. **Проверить изменения в коде**
   - Все файлы обновлены
   - Линтер ошибок нет

2. **Запустить миграцию БД**
   ```bash
   psql -d <database> -f migrations/fix-status-names.sql
   ```

3. **Протестировать workflow**
   - Создание Quote
   - Создание Invoice от Quote
   - Смена статуса на PAID (блокировка для Комплектатора)
   - Создание SupplierOrder от Invoice (Исполнителем)
   - Изменение статусов Исполнителем
   - Проверка уведомлений

4. **Обновить UI (если нужно)**
   - Проверить отображение статусов
   - Проверить кнопки изменения статусов
   - Проверить уведомления

## ⚠️ Важные изменения

- **Убран Order из цепочки**: SupplierOrder теперь создается напрямую от Invoice
- **Заменены статусы**: `IN_PRODUCTION` → `ORDERED`, `READY` → `RECEIVED_FROM_SUPPLIER`
- **Комплектатор блокирован после PAID**: только Исполнитель может менять статусы
- **Статус COMPLETED**: полная блокировка изменений для всех (кроме Админа)

