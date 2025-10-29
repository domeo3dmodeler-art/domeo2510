# 📧 Финальный отчет: Система уведомлений и блокировок

**Дата:** 29 января 2025  
**Статус:** ✅ Готово к тестированию  
**Версия:** Staging (130.193.40.35:3001)

---

## ✅ Что было сделано

### 1. Изменения в `lib/auth/permissions.ts`

**До:**
```typescript
export function canUserChangeStatus(userRole: UserRole, documentType: string) {
  switch (documentType) {
    case 'invoice':
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR;
  }
}
```

**После:**
```typescript
export function canUserChangeStatus(
  userRole: UserRole,
  documentType: string,
  documentStatus?: string  // ✅ Новый параметр
): boolean {
  switch (documentType) {
    case 'quote':
      // КП НЕ блокируются для Комплектатора
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR;
    
    case 'invoice':
      // Комплектатор может менять Invoice только ДО PAID
      if (userRole === UserRole.COMPLECTATOR) {
        const blockedStatuses = ['PAID', 'ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];
        if (documentStatus && blockedStatuses.includes(documentStatus)) {
          return false;
        }
      }
      // EXECUTOR НЕ может менять Invoice напрямую
      // Он меняет SupplierOrder, а Invoice синхронизируется автоматически
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR;
  }
}
```

### 2. Изменения в `app/api/documents/[id]/status/route.ts`

**До:**
```typescript
if (!canUserChangeStatus(userRole, documentType)) {
```

**После:**
```typescript
if (!canUserChangeStatus(userRole, documentType, document.status)) {
```

---

## 📊 Матрица прав

### Quote (КП)

| Статус | Комплектатор | Админ | Блокировка |
|--------|--------------|-------|------------|
| DRAFT | ✅ | ✅ | ❌ |
| SENT | ✅ | ✅ | ❌ |
| ACCEPTED | ✅ | ✅ | ❌ |
| REJECTED | ✅ | ✅ | ❌ |

**Вывод:** КП НЕ блокируются для Комплектатора.

### Invoice (Счет)

| Статус | Комплектатор | Админ | Блокировка |
|--------|--------------|-------|------------|
| DRAFT | ✅ | ✅ | ❌ |
| SENT | ✅ | ✅ | ❌ |
| PAID | ✅ *(устанавливает)* | ✅ | ✅ **БЛОКИРОВАН** |
| ORDERED | ❌ | ✅ | ✅ **БЛОКИРОВАН** |
| RECEIVED | ❌ | ✅ | ✅ **БЛОКИРОВАН** |
| COMPLETED | ❌ | ✅ | ✅ **БЛОКИРОВАН** |

**Вывод:** После PAID Комплектатор ЗАБЛОКИРОВАН для изменения ЭТОГО счета.

---

## 🔄 Логика работы

### Жизненный цикл Quote

1. **Комплектатор создает Quote**
   - Статус: DRAFT
   - Уведомлений: Нет

2. **Комплектатор отправляет Quote**
   - Статус: SENT
   - Уведомлений: Нет (клиент не заходит в систему)

3. **Комплектатор переводит Quote в ACCEPTED**
   - Статус: ACCEPTED
   - Уведомление: 📧 Всем COMPLECTATOR
   - "Клиент принял коммерческое предложение [номер]"
   - ✅ Комплектатор НЕ блокируется (может менять дальше)

### Жизненный цикл Invoice

1. **Комплектатор создает Invoice из Quote**
   - Статус: DRAFT
   - Уведомлений: Нет

2. **Комплектатор отправляет Invoice**
   - Статус: SENT
   - Уведомлений: Нет

3. **Комплектатор переводит Invoice в PAID**
   - Статус: PAID
   - Уведомление: 📧 Всем EXECUTOR
   - "Счет [номер] оплачен. Можете создать заказ у поставщика"
   - ✅ Комплектатор ЗАБЛОКИРОВАН для ЭТОГО счета

4. **Исполнитель создает SupplierOrder**
   - Связан с Invoice через `parent_document_id`

5. **Исполнитель переводит SupplierOrder в ORDERED**
   - Статус: ORDERED
   - Уведомление: 📧 Всем COMPLECTATOR
   - "Заказ размещен у поставщика"
   - Автосинхронизация: Invoice → ORDERED

6. **Исполнитель переводит SupplierOrder в RECEIVED_FROM_SUPPLIER**
   - Статус: RECEIVED_FROM_SUPPLIER
   - Уведомление: 📧 Всем COMPLECTATOR
   - "Товар получен от поставщика"
   - Автосинхронизация: Invoice → RECEIVED_FROM_SUPPLIER

7. **Исполнитель переводит SupplierOrder в COMPLETED**
   - Статус: COMPLETED
   - Уведомление: 📧 Всем COMPLECTATOR
   - "Заказ выполнен поставщиком"
   - Автосинхронизация: Invoice → COMPLETED

---

## 🔧 Технические детали

### Блокировка через API

```typescript
// app/api/documents/[id]/status/route.ts
if (!canUserChangeStatus(userRole, documentType, document.status)) {
  return NextResponse.json(
    { error: 'Недостаточно прав для изменения статуса' },
    { status: 403 }
  );
}
```

### Автоматическая синхронизация

```typescript
// app/api/supplier-orders/[id]/status/route.ts
async function synchronizeDocumentStatuses(invoiceId: string, supplierOrderStatus: string) {
  const statusMapping = {
    'ORDERED': { invoice: 'ORDERED' },
    'RECEIVED_FROM_SUPPLIER': { invoice: 'RECEIVED_FROM_SUPPLIER' },
    'COMPLETED': { invoice: 'COMPLETED' }
  };
  
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: mappedStatuses.invoice }
  });
}
```

---

## 📧 Уведомления

### Когда отправляются

1. **Invoice PAID** → всем `EXECUTOR`
2. **Invoice ORDERED** → всем `COMPLECTATOR` (автоматически)
3. **Invoice RECEIVED** → всем `COMPLECTATOR` (автоматически)
4. **Invoice COMPLETED** → всем `COMPLECTATOR` (автоматически)
5. **Quote ACCEPTED** → всем `COMPLECTATOR`

### Защита от дублей

```typescript
// lib/notifications.ts
const existingNotification = await prisma.notification.findFirst({
  where: {
    user_id: data.userId,
    document_id: data.documentId,
    type: data.type,
    is_read: false,
    created_at: { gte: new Date(Date.now() - 5 * 60 * 1000) }
  }
});
```

---

## ✅ Результат

### Комплектатор может:
1. ✅ Менять ВСЕ статусы Quote
2. ✅ Менять Invoice до PAID
3. ✅ Менять другие Invoice до PAID
4. ✅ Создавать новые Quote и Invoice
5. ❌ НЕ может менять Invoice после PAID

### Исполнитель может:
1. ✅ Создавать SupplierOrder
2. ✅ Менять статусы SupplierOrder
3. ❌ НЕ может менять Invoice напрямую
4. ✅ Invoice синхронизируется автоматически

---

## 🧪 Что нужно протестировать

1. ✅ Комплектатор может менять Quote после ACCEPTED?
2. ✅ Комплектатор блокируется при попытке изменить Invoice после PAID?
3. ✅ Исполнитель может создавать SupplierOrder?
4. ✅ Автосинхронизация Invoice при изменении SupplierOrder?
5. ✅ Уведомления отправляются правильно?
6. ✅ Нет дублей уведомлений?

---

## 📝 Следующие шаги

1. Протестировать логику на staging
2. Проверить уведомления в колокольчике
3. Проверить API ответы (403 при блокировке)
4. Проверить автосинхронизацию статусов

