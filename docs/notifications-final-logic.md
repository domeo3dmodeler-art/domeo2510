# 📧 Финальная логика системы уведомлений

## ✅ Подтвержденные факты

1. ✅ ACCEPTED - Комплектатор меняет **ВРУЧНУЮ**
2. ✅ Роли EXECUTOR и COMPLECTATOR **СУЩЕСТВУЮТ** в БД
3. ✅ Email уведомления **НЕ** отправляются
4. ✅ Клиенты **НЕ ЗАХОДЯТ** в систему
5. ✅ Старые уведомления **НЕ АРХИВИРУЮТСЯ** (остаются навсегда)

---

## 🔒 БЛОКИРОВКА ПОСЛЕ PAID

### ❌ Проблема в текущем коде

**Было:**
```typescript
// lib/auth/permissions.ts
export function canUserChangeStatus(userRole: UserRole, documentType: string) {
  switch (documentType) {
    case 'invoice':
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR; // ❌
  }
}
```

**Проблема:** COMPLECTATOR может менять статусы Invoice **ПОСЛЕ** PAID, что **НАРУШАЕТ** бизнес-логику.

### ✅ Исправление

**Стало:**
```typescript
export function canUserChangeStatus(
  userRole: UserRole,
  documentType: string,
  documentStatus?: string  // ✅ Новый параметр
): boolean {
  switch (documentType) {
    case 'invoice':
      // Комплектатор ЗАБЛОКИРОВАН после PAID
      if (userRole === UserRole.COMPLECTATOR) {
        const blockedStatuses = ['PAID', 'ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];
        if (documentStatus && blockedStatuses.includes(documentStatus)) {
          return false; // ✅ БЛОКИРОВКА
        }
      }
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR || userRole === UserRole.EXECUTOR;
  }
}
```

---

## 📊 Матрица уведомлений (финальная)

### Invoice (Счет)

| Статус | Кто меняет | Кто получает уведомление | Блокировка Комплектатора |
|--------|------------|---------------------------|--------------------------|
| DRAFT | Комплектатор | Нет | ❌ |
| SENT | Комплектатор | Нет | ❌ |
| **PAID** | Комплектатор | Все `EXECUTOR` | ✅ **БЛОКИРОВАН** |
| **ORDERED** | Только автоматически | Все `COMPLECTATOR` | ✅ **БЛОКИРОВАН** |
| **RECEIVED** | Только автоматически | Все `COMPLECTATOR` | ✅ **БЛОКИРОВАН** |
| **COMPLETED** | Только автоматически | Все `COMPLECTATOR` | ✅ **БЛОКИРОВАН** |

### Quote (КП)

| Статус | Кто меняет | Кто получает уведомление | Блокировка Комплектатора |
|--------|------------|---------------------------|--------------------------|
| DRAFT | Комплектатор | Нет | ❌ |
| SENT | Комплектатор | Нет (клиент не заходит) | ❌ |
| **ACCEPTED** | **Комплектатор ВРУЧНУЮ** | Все `COMPLECTATOR` | ✅ **БЛОКИРОВАН** |
| REJECTED | Комплектатор | Нет | ❌ |

---

## 🔄 Полный жизненный цикл

```
1. Комплектатор создает Quote
   → Статус: DRAFT
   → Уведомлений: Нет

2. Комплектатор отправляет Quote
   → Статус: SENT  
   → Уведомлений: Нет (клиент не получает)

3. Комплектатор **ВРУЧНУЮ** переводит Quote в ACCEPTED ⚠️
   → Статус: ACCEPTED
   → Уведомление: 📧 Всем COMPLECTATOR
   → "Клиент принял коммерческое предложение [номер]"
   → ✅ Комплектатор ЗАБЛОКИРОВАН для изменений этого КП

4. Комплектатор создает Invoice из Quote
   → Статус: DRAFT
   → Уведомлений: Нет

5. Комплектатор отправляет Invoice
   → Статус: SENT
   → Уведомлений: Нет

6. Комплектатор переводит Invoice в PAID
   → Статус: PAID
   → Уведомление: 📧 Всем EXECUTOR
   → "Счет оплачен. Можете создать заказ у поставщика"
   → ✅ Комплектатор ЗАБЛОКИРОВАН для изменений этого СЧЕТА
   → ⚠️ Другие счета КП может менять

7. Исполнитель видит уведомление
   → Создает SupplierOrder

8. Исполнитель переводит SupplierOrder в ORDERED
   → Статус: ORDERED
   → Уведомление: 📧 Всем COMPLECTATOR
   → "Заказ размещен у поставщика"
   → Автоматическая синхронизация: Invoice → ORDERED
   → ✅ Дропдаун в UI для Комплектатора ЗАБЛОКИРОВАН

9. Исполнитель переводит SupplierOrder в RECEIVED_FROM_SUPPLIER
   → Статус: RECEIVED_FROM_SUPPLIER
   → Уведомление: 📧 Всем COMPLECTATOR
   → "Товар получен от поставщика"
   → Автоматическая синхронизация: Invoice → RECEIVED_FROM_SUPPLIER

10. Исполнитель переводит SupplierOrder в COMPLETED
    → Статус: COMPLETED
    → Уведомление: 📧 Всем COMPLECTATOR
    → "Заказ выполнен поставщиком"
    → Автоматическая синхронизация: Invoice → COMPLETED
    → ✅ Комплектатор РАЗБЛОКИРОВАН (может менять другие документы)
```

---

## 🔧 Детали реализации

### 1. Блокировка статусов (isStatusBlocked)

```typescript
// lib/validation/status-blocking.ts
const BLOCKED_STATUSES = ['ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];
```

**Применяется для:**
- Отключение дропдауна в UI
- Отключение кнопки "Изменить статус" в API

**НЕ применяется для:**
- PAID (блокировка через permissions.ts)
- ACCEPTED (блокировка через permissions.ts)

### 2. Блокировка по ролям (canUserChangeStatus)

```typescript
// lib/auth/permissions.ts
// COMPLECTATOR заблокирован ПОСЛЕ следующих статусов:
// Invoice: PAID, ORDERED, RECEIVED_FROM_SUPPLIER, COMPLETED
// Quote: ACCEPTED
```

**Применяется для:**
- Предотвращение API запросов
- Проверка перед показом UI элементов

### 3. Дублирование уведомлений

```typescript
// lib/notifications.ts
// Проверка: есть ли такое же уведомление в последние 5 минут?
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

**Защита от:**
- Двойного клика по кнопке
- Повторной отправки при ошибке
- Автоматической синхронизации + ручного изменения

---

## ✅ Результат

### Правильная логика блокировки

1. **Комплектатор после PAID:**
   - ✅ Не может менять ЭТОТ счет (PAID, ORDERED, RECEIVED, COMPLETED)
   - ✅ Не может создавать SupplierOrder для ЭТОГО счета
   - ✅ Может работать с ДРУГИМИ счетами (до PAID)
   - ✅ Может создавать новые Quote и Invoice
   - ✅ Может менять другие Quote (до ACCEPTED)

2. **Исполнитель:**
   - ✅ Может создавать SupplierOrder
   - ✅ Может менять статусы SupplierOrder
   - ✅ Может видеть все Invoice (только чтение)
   - ✅ Может видеть Invoice после COMPLETED

3. **Уведомления:**
   - ✅ Отправляются правильно по ролям
   - ✅ НЕ дублируются (защита 5 минут)
   - ✅ Логируются в консоль
   - ✅ Отображаются в колокольчике

