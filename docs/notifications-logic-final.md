# 📧 Финальная логика системы уведомлений

## ✅ Подтвержденные требования

1. ✅ Quote (КП) - **НЕ БЛОКИРУЮТСЯ** для Комплектатора
2. ✅ Invoice (Счет) - Комплектатор блокируется **ПОСЛЕ PAID**
3. ✅ Invoice ORDERED/RECEIVED/COMPLETED - меняет **ТОЛЬКО** Исполнитель
4. ✅ Статусы применяются ко **ВСЕМ** связанным документам
5. ✅ Комплектатор получает уведомления о смене статусов

---

## 🔒 Блокировка Комплектатора

### Quote (КП)
```
✅ Комплектатор может менять ВСЕ статусы КП
✅ ACCEPTED - Комплектатор меняет ВРУЧНУЮ
✅ Дальше ACCEPTED - Комплектатор МОЖЕТ менять
```

### Invoice (Счет)
```
✅ ДО PAID - Комплектатор МОЖЕТ менять
❌ ПОСЛЕ PAID - Комплектатор ЗАБЛОКИРОВАН для ЭТОГО счета
✅ Может работать с ДРУГИМИ счетами (до PAID)
```

**Блокированные статусы для Комплектатора:**
- `PAID`
- `ORDERED`
- `RECEIVED_FROM_SUPPLIER`
- `COMPLETED`

---

## 🔄 Жизненный цикл Invoice

### 1. Комплектатор создает и меняет до PAID
```
Комплектатор: DRAFT → SENT → **PAID**
✅ Может менять статусы
✅ Полный доступ
```

### 2. После PAID - только Исполнитель
```
Статус PAID
❌ Комплектатор ЗАБЛОКИРОВАН для ЭТОГО счета
✅ EXECUTOR может менять дальше
```

### 3. EXECUTOR меняет статусы
```
EXECUTOR: PAID → ORDERED → RECEIVED → COMPLETED

ORDERED:
  → Уведомление всем COMPLECTATOR
  → Автосинхронизация: Invoice + Quote

RECEIVED_FROM_SUPPLIER:
  → Уведомление всем COMPLECTATOR
  → Автосинхронизация: Invoice + Quote

COMPLETED:
  → Уведомление всем COMPLECTATOR
  → Автосинхронизация: Invoice + Quote
```

---

## 📊 Матрица прав

### Quote (КП)

| Статус | Комплектатор | Админ |
|--------|--------------|-------|
| DRAFT | ✅ | ✅ |
| SENT | ✅ | ✅ |
| ACCEPTED | ✅ | ✅ |
| REJECTED | ✅ | ✅ |

### Invoice (Счет)

| Статус | Комплектатор | Исполнитель | Админ |
|--------|--------------|-------------|-------|
| DRAFT | ✅ | ❌ | ✅ |
| SENT | ✅ | ❌ | ✅ |
| **PAID** | ✅ *(только СТАВИТЬ)* | ✅ *(только СТАВИТЬ)* | ✅ |
| **ORDERED** | ❌ | ✅ | ✅ |
| **RECEIVED** | ❌ | ✅ | ✅ |
| **COMPLETED** | ❌ | ✅ | ✅ |

**Жирные статусы** - блокируются для Комплектатора

---

## 🔧 Реализация в коде

### lib/auth/permissions.ts

```typescript
export function canUserChangeStatus(
  userRole: UserRole,
  documentType: string,
  documentStatus?: string
): boolean {
  switch (documentType) {
    case 'quote':
      // КП НЕ блокируются для Комплектатора
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR;
    
    case 'invoice':
      // Комплектатор блокирован ПОСЛЕ PAID
      if (userRole === UserRole.COMPLECTATOR) {
        const blockedStatuses = ['PAID', 'ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];
        if (documentStatus && blockedStatuses.includes(documentStatus)) {
          return false;
        }
      }
      // EXECUTOR может менять Invoice только в статусах ORDERED, RECEIVED, COMPLETED
      if (userRole === UserRole.EXECUTOR) {
        const allowedStatuses = ['PAID', 'ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];
        if (documentStatus && !allowedStatuses.includes(documentStatus)) {
          return false;
        }
      }
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR || userRole === UserRole.EXECUTOR;
  }
}
```

---

## 📧 Уведомления

### Когда отправляются

1. **Invoice PAID**
   - Отправитель: Комплектатор
   - Получатели: Все `EXECUTOR`
   - Сообщение: "Счет [номер] оплачен. Можете создать заказ у поставщика"

2. **Invoice ORDERED**
   - Отправитель: Исполнитель (SupplierOrder)
   - Получатели: Все `COMPLECTATOR`
   - Сообщение: "Счет [номер] переведен в статус 'Заказ размещен'"

3. **Invoice RECEIVED_FROM_SUPPLIER**
   - Отправитель: Исполнитель (SupplierOrder)
   - Получатели: Все `COMPLECTATOR`
   - Сообщение: "Счет [номер] переведен в статус 'Получен от поставщика'"

4. **Invoice COMPLETED**
   - Отправитель: Исполнитель (SupplierOrder)
   - Получатели: Все `COMPLECTATOR`
   - Сообщение: "Счет [номер] переведен в статус 'Исполнен'"

5. **Quote ACCEPTED**
   - Отправитель: Комплектатор
   - Получатели: Все `COMPLECTATOR`
   - Сообщение: "Клиент принял коммерческое предложение [номер]"

---

## ✅ Итоговые правила

### Комплектатор может:
1. ✅ Менять ВСЕ статусы Quote (в т.ч. ACCEPTED)
2. ✅ Менять Invoice до PAID
3. ✅ Менять другие Invoice до PAID
4. ✅ Создавать новые Quote и Invoice
5. ❌ НЕ может менять Invoice после PAID

### Исполнитель может:
1. ✅ Переводить Invoice из PAID в ORDERED
2. ✅ Переводить Invoice из ORDERED в RECEIVED_FROM_SUPPLIER
3. ✅ Переводить Invoice из RECEIVED в COMPLETED
4. ✅ Создавать SupplierOrder
5. ✅ Менять статусы SupplierOrder

### Автоматическая синхронизация
```
SupplierOrder: ORDERED → Invoice: ORDERED (автоматически)
SupplierOrder: RECEIVED → Invoice: RECEIVED_FROM_SUPPLIER (автоматически)
SupplierOrder: COMPLETED → Invoice: COMPLETED (автоматически)
```

ВСЕ статусы применяются ко всем связанным документам.

