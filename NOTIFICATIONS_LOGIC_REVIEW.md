# Полный обзор логики уведомлений в системе

## 📊 Текущее состояние

### 1. Файлы уведомлений

#### `lib/notifications.ts` - Основной файл уведомлений
**Функции**:
- `createNotification(data)` - создание уведомления
- `notifyUsersByRole(role, data)` - уведомление всех пользователей по роли
- `notifyUser(userId, data)` - уведомление конкретного пользователя

**Поля уведомления**:
- `user_id` - кому отправляется
- `client_id` - ID клиента (опционально)
- `document_id` - ID документа (опционально)
- `type` - тип уведомления
- `title` - заголовок
- `message` - сообщение
- `is_read` - прочитано/нет

#### `lib/notifications/status-notifications.ts` - Уведомления о статусах
**Старые статусы (удалить)**:
- `IN_PRODUCTION` → должно быть `ORDERED`
- `READY` → должно быть `RECEIVED_FROM_SUPPLIER`

**Текущие уведомления для Invoice**:
```typescript
'SENT': {
  recipients: ['client'],
  message: 'Вам отправлен счет на оплату'
},
'PAID': {
  recipients: ['complectator'], // ❌ НЕВЕРНО! должно быть executor
  message: 'Клиент оплатил счет'
},
'IN_PRODUCTION': {  // ❌ СТАРЫЙ СТАТУС
  recipients: ['executor'],
  message: 'Счет переведен в производство'
},
'RECEIVED_FROM_SUPPLIER': {
  recipients: ['complectator'],
  message: 'Товар получен от поставщика'
},
'COMPLETED': {
  recipients: ['complectator', 'client'],
  message: 'Заказ выполнен'
}
```

**Текущие уведомления для SupplierOrder**:
```typescript
'ORDERED': {
  recipients: ['complectator'],
  message: 'Заказ размещен у поставщика'
},
'IN_PRODUCTION': {  // ❌ СТАРЫЙ СТАТУС
  recipients: ['complectator'],
  message: 'Заказ в производстве у поставщика'
},
'READY': {  // ❌ СТАРЫЙ СТАТУС
  recipients: ['complectator'],
  message: 'Заказ готов у поставщика'
},
'COMPLETED': {
  recipients: ['complectator'],
  message: 'Заказ выполнен поставщиком'
}
```

### 2. Где отправляются уведомления

#### `app/api/invoices/[id]/status/route.ts`
**Строки 100-124**:
```typescript
if (status === 'PAID') {
  // Уведомляем всех исполнителей о том, что счет оплачен
  await notifyUsersByRole('executor', {
    clientId: existingInvoice.client_id,
    documentId: id,
    type: 'invoice_paid',
    title: 'Счет оплачен',
    message: `Счет ${existingInvoice.number} переведен в статус "Оплачен/Заказ". Теперь только Исполнитель может изменять статус.`
  });
} else if (['ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'].includes(status)) {
  // Уведомляем комплектатора о изменении статуса исполнителем
  await notifyUsersByRole('complectator', {
    clientId: existingInvoice.client_id,
    documentId: id,
    type: 'status_changed',
    title: 'Статус изменен',
    message: `Исполнитель изменил статус счета ${existingInvoice.number} на "${statusNames[status]}".`
  });
}
```

#### `app/api/supplier-orders/[id]/status/route.ts`
**Строки 127-137**:
```typescript
await prisma.notification.create({
  data: {
    user_id: parentUser.id,
    client_id: invoice.client_id,
    document_id: invoice.id,
    type: 'STATUS_CHANGE',
    title: 'Изменение статуса заказа',
    message: invoiceInfo,
    is_read: false
  }
});
```

⚠️ **ПРОБЛЕМА**: Уведомление отправляется `parentUser.id` (кто создал счет), а должно отправляться **комплектатору**, который создал счет.

### 3. Логика отправки по ролям

**Текущая логика**:
1. **Комплектатор** переводит Invoice в `PAID`
   - ✅ Уведомление отправляется `executor`

2. **Исполнитель** переводит SupplierOrder в `ORDERED`, `RECEIVED_FROM_SUPPLIER`, `COMPLETED`
   - ✅ Уведомление отправляется `complectator`
   
**НО**: Уведомление в SupplierOrder отправляется `parentUser.id`, который может быть любым пользователем.

---

## 🔍 Проблемы в текущей реализации

### Проблема 1: Неправильные статусы
- `status-notifications.ts` содержит старые статусы (`IN_PRODUCTION`, `READY`)
- Нужно заменить на `ORDERED`, `RECEIVED_FROM_SUPPLIER`

### Проблема 2: Неправильный получатель в SupplierOrder
- Уведомление отправляется `parentUser.id` (кто создал счет)
- Должно отправляться всем **комплектаторам** (не только создателю)

### Проблема 3: Несогласованность
- Invoice: использует `notifyUsersByRole('executor')` → работает ✅
- SupplierOrder: использует `prisma.notification.create()` → работает только для одного пользователя ❌

### Проблема 4: Отсутствие уведомлений для Quote
- В `app/api/quotes/[id]/status/route.ts` **нет отправки уведомлений**
- При изменении статуса Quote пользователи не получают уведомления

---

## ✅ Правильная логика уведомлений

### Invoice → PAID
**Кто меняет**: Комплектатор
**Кто получает**: Все исполнители (executor)
**Сообщение**: "Счет [номер] оплачен. Вы можете создать заказ у поставщика."

### Invoice → ORDERED
**Кто меняет**: Исполнитель (через SupplierOrder)
**Кто получает**: Все комплектаторы
**Сообщение**: "Заказ для счета [номер] размещен у поставщика."

### Invoice → RECEIVED_FROM_SUPPLIER
**Кто меняет**: Исполнитель (через SupplierOrder)
**Кто получает**: Все комплектаторы
**Сообщение**: "Товар по счету [номер] получен от поставщика."

### Invoice → COMPLETED
**Кто меняет**: Исполнитель (через SupplierOrder)
**Кто получает**: Все комплектаторы + клиент
**Сообщение**: "Заказ по счету [номер] выполнен."

### Quote → SENT
**Кто меняет**: Комплектатор
**Кто получает**: Клиент
**Сообщение**: "Вам отправлено коммерческое предложение."

### Quote → ACCEPTED
**Кто меняет**: Клиент/Комплектатор
**Кто получает**: Все комплектаторы
**Сообщение**: "Клиент принял коммерческое предложение [номер]."

---

## 🛠️ Что нужно исправить

### 1. Обновить status-notifications.ts
```typescript
invoice: {
  'SENT': {
    recipients: ['client'],
    message: 'Вам отправлен счет на оплату'
  },
  'PAID': {
    recipients: ['executor'],  // ✅ Исправили
    message: 'Счет оплачен. Вы можете создать заказ у поставщика.'
  },
  'ORDERED': {  // ✅ Добавили вместо IN_PRODUCTION
    recipients: ['complectator'],
    message: 'Заказ размещен у поставщика.'
  },
  'RECEIVED_FROM_SUPPLIER': {
    recipients: ['complectator'],
    message: 'Товар получен от поставщика.'
  },
  'COMPLETED': {
    recipients: ['complectator', 'client'],
    message: 'Заказ выполнен.'
  }
}
```

### 2. Обновить app/api/supplier-orders/[id]/status/route.ts
```typescript
// Заменить на:
await notifyUsersByRole('complectator', {
  clientId: invoice.client_id,
  documentId: invoice.id,
  type: 'status_changed',
  title: 'Изменение статуса заказа',
  message: invoiceInfo
});
```

### 3. Добавить уведомления в app/api/quotes/[id]/status/route.ts
```typescript
// После обновления статуса
if (status === 'SENT') {
  await notifyUsersByRole('client', {
    clientId: quote.client_id,
    documentId: id,
    type: 'quote_sent',
    title: 'КП отправлено',
    message: `Коммерческое предложение ${quote.number} отправлено клиенту.`
  });
} else if (status === 'ACCEPTED') {
  await notifyUsersByRole('complectator', {
    clientId: quote.client_id,
    documentId: id,
    type: 'quote_accepted',
    title: 'КП принято',
    message: `Клиент принял коммерческое предложение ${quote.number}.`
  });
}
```

---

## 📝 Итоговая схема уведомлений

```
Комплектатор:
  Quote (SENT) → Уведомление клиенту
  Quote (ACCEPTED) → Уведомление комплектатору
  Invoice (PAID) → Уведомление исполнителю

Исполнитель:
  SupplierOrder (ORDERED) → Уведомление комплектатору
  SupplierOrder (RECEIVED_FROM_SUPPLIER) → Уведомление комплектатору
  SupplierOrder (COMPLETED) → Уведомление комплектатору + клиенту

Клиент:
  Получает уведомления о SENT и COMPLETED
```

---

## 🚀 Следующие шаги

1. ✅ Исправить `status-notifications.ts` - заменить старые статусы
2. ✅ Исправить `app/api/supplier-orders/[id]/status/route.ts` - использовать `notifyUsersByRole`
3. ✅ Добавить уведомления в `app/api/quotes/[id]/status/route.ts`
4. ✅ Протестировать все уведомления

