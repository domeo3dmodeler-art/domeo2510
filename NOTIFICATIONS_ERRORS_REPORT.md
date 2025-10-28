# 🔍 Отчет о проблемах в логике уведомлений

## ❌ Критические проблемы

### 1. Проблема с ролью 'client' в Quotes

**Файл**: `app/api/quotes/[id]/status/route.ts`

**Проблема**: 
```typescript
await notifyUsersByRole('client', {
  clientId: quoteWithClient.client_id,
  documentId: id,
  ...
});
```

**Ошибка**: 
- `notifyUsersByRole` ищет пользователей с ролью `CLIENT`
- Но в таблице `users` **НЕТ пользователей с ролью `CLIENT`**
- Клиенты хранятся в таблице `clients`, а не `users`

**Решение**: 
- Для уведомления клиента нужно получить `client.user_id` (если есть)
- Или создать специальную функцию для уведомления клиентов по `client_id`

### 2. Неправильные роли в Invoice

**Файл**: `app/api/invoices/[id]/status/route.ts`

**Строка 102**: `await notifyUsersByRole('executor', {...})`
**Строка 117**: `await notifyUsersByRole('complectator', {...})`

**Проблема**: 
- Роли должны быть в UPPERCASE: `'EXECUTOR'`, `'COMPLECTATOR'`
- Но функция `notifyUsersByRole` делает `.toUpperCase()`, так что это не проблема
- Но нужно проверить, есть ли пользователи с такими ролями

### 3. Дублирование функции notifyUsersByRole

**Файл**: `lib/notifications/status-notifications.ts` (строки 103-105)

```typescript
async function notifyUsersByRole(role: string, message: string, documentId: string) {
  // Реализация уведомления пользователей по роли
  console.log(`Уведомление роли ${role}: ${message}`);
}
```

**Проблема**: 
- Это **заглушка**, а не настоящая имплементация
- Она просто логирует в консоль, не создает уведомления в БД

### 4. Неправильная логика в SupplierOrder

**Файл**: `app/api/supplier-orders/[id]/status/route.ts`

**Проблема**:
- Уведомления отправляются при изменении статуса SupplierOrder
- Но статус SupplierOrder меняется Исполнителем
- Уведомления должны отправляться **комплектатору** (заказ у поставщика)
- Но комплектатор должен знать только когда заказ пришел (RECEIVED_FROM_SUPPLIER), а не на каждое изменение

---

## 🔧 Правильная логика уведомлений

### Invoice (Счет)

**PAID** → Исполнитель (EXECUTOR)
- ✅ Правильно: Уведомляем исполнителей, что можно создать заказ у поставщика
- Кто меняет: Комплектатор
- Кто получает: Все исполнители

**ORDERED, RECEIVED_FROM_SUPPLIER, COMPLETED** → Комплектатор
- ❌ НЕПРАВИЛЬНО: Эти статусы не должны меняться вручную
- Статусы должны меняться автоматически через SupplierOrder
- Уведомления должны отправляться из SupplierOrder, а не из Invoice

### SupplierOrder (Заказ поставщику)

**Правильная логика**:
1. **ORDERED** → Уведомляем комплектатора: "Заказ размещен у поставщика"
2. **RECEIVED_FROM_SUPPLIER** → Уведомляем комплектатора: "Товар получен от поставщика"
3. **COMPLETED** → Уведомляем комплектатора: "Заказ выполнен поставщиком"

**Текущая проблема**:
- В `app/api/supplier-orders/[id]/status/route.ts` уведомления отправляются
- НО статусы Invoice уже синхронизированы в функции `synchronizeDocumentStatuses`
- Поэтому уведомления отправляются ПОСЛЕ синхронизации, что правильно

### Quote (КП)

**SENT** → Клиент
- ❌ ПРОБЛЕМА: `notifyUsersByRole('client')` не работает
- Клиенты НЕ являются пользователями системы
- Нужно либо:
  1. Отправить уведомление конкретному пользователю (если у клиента есть user_id)
  2. Отправить email клиенту
  3. Пропустить уведомление (т.к. клиенты не заходят в систему)

**ACCEPTED** → Комплектатор
- ✅ Правильно: Уведомляем комплектатора, что КП принято

---

## 🛠️ Что нужно исправить

### 1. Исправить уведомление клиента в Quotes

**Вариант А**: Убрать уведомление клиенту (т.к. клиенты не заходят в систему)
```typescript
if (status === 'SENT') {
  // Клиенты не заходят в систему, пропускаем уведомление
  console.log('📧 КП отправлено клиенту:', quoteWithClient.number);
}
```

**Вариант Б**: Отправить уведомление user_id клиента (если есть)
```typescript
if (status === 'SENT') {
  const client = await prisma.client.findUnique({
    where: { id: quoteWithClient.client_id },
    select: { user_id: true }
  });
  
  if (client && client.user_id) {
    await notifyUser(client.user_id, {
      clientId: quoteWithClient.client_id,
      documentId: id,
      type: 'quote_sent',
      title: 'КП отправлено',
      message: `Коммерческое предложение ${quoteWithClient.number} отправлено клиенту.`
    });
  }
}
```

### 2. Проверить наличие пользователей с ролями

**Проверить в БД**:
- Есть ли пользователи с ролью `EXECUTOR`?
- Есть ли пользователи с ролью `COMPLECTATOR`?

**Если нет пользователей с нужными ролями**:
- Уведомления не будут отправляться
- Нужно создать тестовых пользователей или изменить роли существующих

### 3. Удалить заглушку notifyUsersByRole из status-notifications.ts

**Файл**: `lib/notifications/status-notifications.ts`

**Строки 103-106**: Заглушка функции, которую нужно удалить
```typescript
async function notifyUsersByRole(role: string, message: string, documentId: string) {
  // Реализация уведомления пользователей по роли
  console.log(`Уведомление роли ${role}: ${message}`);
}
```

**Решение**: Удалить эту функцию, т.к. настоящая имплементация уже есть в `lib/notifications.ts`

---

## 📊 План исправлений

1. ✅ Убрать уведомление клиента из Quotes (т.к. клиенты не заходят в систему)
2. ✅ Удалить заглушку `notifyUsersByRole` из `status-notifications.ts`
3. ✅ Проверить логи в staging на наличие ошибок

