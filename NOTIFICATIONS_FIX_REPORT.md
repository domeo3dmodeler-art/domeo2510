# Отчет об исправлении логики уведомлений

## 🔧 Выполненные изменения

### 1. Исправлен `lib/notifications/status-notifications.ts`

#### Invoice (Счета):
- ✅ **PAID** - получатель изменен с `complectator` на `executor`
- ✅ Удален статус `IN_PRODUCTION` (заменен на `ORDERED`)
- ✅ Добавлен статус `ORDERED` - получатель: `complectator`
- ✅ Обновлен статус `RECEIVED_FROM_SUPPLIER` - получатель: `complectator`

#### Order (Заказы):
- ✅ Удалены статусы `IN_PRODUCTION` и `READY`
- ✅ Добавлен статус `RECEIVED_FROM_SUPPLIER` - получатель: `complectator`

#### SupplierOrder (Заказы поставщику):
- ✅ Удалены статусы `IN_PRODUCTION` и `READY`
- ✅ Добавлен статус `RECEIVED_FROM_SUPPLIER` - получатель: `complectator`
- ✅ `ORDERED` получатель: `complectator`
- ✅ `COMPLETED` получатель: `complectator`

### 2. Исправлен `app/api/supplier-orders/[id]/status/route.ts`

**Проблема**: Уведомление отправлялось только `parentUser.id` (одному пользователю)

**Решение**: 
- ✅ Добавлен импорт `notifyUsersByRole` из `@/lib/notifications`
- ✅ Заменено `prisma.notification.create()` на `notifyUsersByRole('COMPLECTATOR', {...})`
- ✅ Теперь уведомления получают **все комплектаторы**, а не только создатель счета

**Код до**:
```typescript
await prisma.notification.create({
  data: {
    user_id: parentUser.id,  // ❌ Только один пользователь
    client_id: invoice.client_id,
    document_id: invoice.id,
    type: 'STATUS_CHANGE',
    title: 'Изменение статуса заказа',
    message: invoiceInfo,
    is_read: false
  }
});
```

**Код после**:
```typescript
// Уведомляем всех комплектаторов ✅
await notifyUsersByRole('COMPLECTATOR', {
  clientId: invoice.client_id,
  documentId: invoice.id,
  type: 'status_changed',
  title: 'Изменение статуса заказа',
  message: invoiceInfo
});
```

### 3. Добавлены уведомления в `app/api/quotes/[id]/status/route.ts`

**Проблема**: При изменении статуса КП уведомления не отправлялись

**Решение**: Добавлена логика отправки уведомлений для двух статусов:

1. **SENT** (КП отправлено):
   - Получатель: клиент
   - Сообщение: "Коммерческое предложение [номер] отправлено вам."

2. **ACCEPTED** (КП принято):
   - Получатель: комплектаторы
   - Сообщение: "Клиент принял коммерческое предложение [номер]."

**Код**:
```typescript
if (status === 'SENT') {
  await notifyUsersByRole('client', {
    clientId: quoteWithClient.client_id,
    documentId: id,
    type: 'quote_sent',
    title: 'КП отправлено',
    message: `Коммерческое предложение ${quoteWithClient.number} отправлено вам.`
  });
} else if (status === 'ACCEPTED') {
  await notifyUsersByRole('complectator', {
    clientId: quoteWithClient.client_id,
    documentId: id,
    type: 'quote_accepted',
    title: 'КП принято',
    message: `Клиент принял коммерческое предложение ${quoteWithClient.number}.`
  });
}
```

---

## 📊 Правильная логика уведомлений после изменений

### Счет (Invoice)
| Статус | Кто меняет | Кто получает | Сообщение |
|--------|------------|--------------|-----------|
| SENT | Комплектатор | Клиент | "Вам отправлен счет на оплату" |
| PAID | Комплектатор | Исполнитель | "Счет оплачен. Вы можете создать заказ у поставщика." |
| ORDERED | Исполнитель (через SupplierOrder) | Комплектатор | "Заказ размещен у поставщика." |
| RECEIVED_FROM_SUPPLIER | Исполнитель (через SupplierOrder) | Комплектатор | "Товар получен от поставщика." |
| COMPLETED | Исполнитель (через SupplierOrder) | Комплектатор + Клиент | "Заказ выполнен." |

### КП (Quote)
| Статус | Кто меняет | Кто получает | Сообщение |
|--------|------------|--------------|-----------|
| SENT | Комплектатор | Клиент | "Коммерческое предложение [номер] отправлено вам." |
| ACCEPTED | Клиент/Комплектатор | Комплектатор | "Клиент принял коммерческое предложение [номер]." |
| REJECTED | Клиент/Комплектатор | Комплектатор | "Клиент отклонил коммерческое предложение" |

### Заказ поставщику (SupplierOrder)
| Статус | Кто меняет | Кто получает | Сообщение |
|--------|------------|--------------|-----------|
| ORDERED | Исполнитель | Комплектатор | "Заказ размещен у поставщика." |
| RECEIVED_FROM_SUPPLIER | Исполнитель | Комплектатор | "Товар получен от поставщика." |
| COMPLETED | Исполнитель | Комплектатор | "Заказ выполнен поставщиком." |

---

## ✅ Результат

1. ✅ Удалены устаревшие статусы (`IN_PRODUCTION`, `READY`)
2. ✅ Добавлены правильные статусы (`ORDERED`, `RECEIVED_FROM_SUPPLIER`)
3. ✅ Исправлены получатели уведомлений
4. ✅ SupplierOrder теперь отправляет уведомления всем комплектаторам
5. ✅ Добавлены уведомления для Quote
6. ✅ Логика уведомлений согласована во всей системе

---

## 🚀 Следующие шаги

1. Отправить изменения на staging
2. Протестировать уведомления в staging
3. Запустить миграцию БД для обновления старых статусов

