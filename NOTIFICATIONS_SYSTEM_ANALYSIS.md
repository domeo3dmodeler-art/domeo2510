# 📊 Полный анализ системы уведомлений

## 🏗️ Архитектура системы

### 1. База данных (Prisma Schema)

**Таблица `notifications`**:
```sql
model Notification {
  id          String   @id @default(cuid())
  user_id     String   // ID пользователя, которому отправлено уведомление
  client_id   String?  // ID клиента (опционально)
  document_id String?  // ID документа (опционально)
  type        String   // Тип уведомления (invoice_paid, status_changed, etc.)
  title       String   // Заголовок уведомления
  message     String   // Текст уведомления
  is_read     Boolean  @default(false)
  created_at  DateTime @default(now())
  
  // Связи
  user        User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  client      Client?  @relation(fields: [client_id], references: [id], onDelete: Cascade)
}
```

**Индексы**:
- `user_id` - для быстрого поиска уведомлений пользователя
- `is_read` - для фильтрации непрочитанных
- `created_at` - для сортировки

---

## 🔧 Основные компоненты

### 1. `lib/notifications.ts` - Базовая функциональность

**Функции**:
- `createNotification(data)` - создать уведомление в БД
- `notifyUsersByRole(role, data)` - отправить уведомления всем пользователям с ролью
- `notifyUser(userId, data)` - отправить уведомление конкретному пользователю

**Логика**:
```typescript
// 1. Получаем всех пользователей с ролью
const users = await prisma.user.findMany({
  where: { 
    role: role.toUpperCase(),  // Важно! UPPERCASE
    is_active: true
  }
});

// 2. Создаем уведомление для каждого
const notifications = await Promise.all(
  users.map(user => createNotification({...data, userId: user.id}))
);
```

### 2. `lib/notifications/status-notifications.ts` - Уведомления о статусах

**Назначение**: Централизованная конфигурация уведомлений для каждого типа документа

**Структура**:
```typescript
export const STATUS_NOTIFICATIONS = {
  quote: {
    'SENT': {
      recipients: ['complectator'],  // Кто получает
      message: 'КП отправлено'       // Что получают
    },
    'ACCEPTED': {
      recipients: ['complectator'],
      message: 'Клиент принял КП'
    }
  },
  invoice: {
    'PAID': {
      recipients: ['executor'],
      message: 'Счет оплачен'
    },
    'ORDERED': {
      recipients: ['complectator'],
      message: 'Заказ размещен'
    }
  }
  // ... и т.д.
}
```

**Проблема**: Эта конфигурация сейчас НЕ используется напрямую в коде.

### 3. `lib/notifications/notification-service.ts` - Продвинутый сервис

**Назначение**: Сервис с шаблонами, приоритетами, каналами доставки

**Особенности**:
- Singleton паттерн
- Шаблоны уведомлений
- Приоритеты (LOW, MEDIUM, HIGH, URGENT)
- Каналы доставки (IN_APP, EMAIL, SMS)
- Подписки на события
- Статистика

**Проблема**: Этот сервис НЕ используется в реальном коде. Он остается как заглушка.

### 4. API Endpoints

**GET `/api/notifications`** - получить уведомления пользователя
- Аутентификация через JWT (Authorization header или Cookie)
- Возвращает до 50 уведомлений
- Включает данные клиента

**POST `/api/notifications`** - создать уведомление
- Ручное создание уведомлений (для тестов)

---

## 📍 Где отправляются уведомления

### 1. Invoice Status (`app/api/invoices/[id]/status/route.ts`)

**События**:
- **PAID** → Уведомление всем EXECUTOR
- **ORDERED, RECEIVED_FROM_SUPPLIER, COMPLETED** → Уведомление всем COMPLECTATOR

**Код**:
```typescript
if (status === 'PAID') {
  await notifyUsersByRole('EXECUTOR', {
    clientId: existingInvoice.client_id,
    documentId: id,
    type: 'invoice_paid',
    title: 'Счет оплачен',
    message: `Счет ${existingInvoice.number} переведен в статус "Оплачен/Заказ".`
  });
} else if (['ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'].includes(status)) {
  await notifyUsersByRole('COMPLECTATOR', {
    clientId: existingInvoice.client_id,
    documentId: id,
    type: 'status_changed',
    title: 'Статус изменен',
    message: `Исполнитель изменил статус счета ${existingInvoice.number}...`
  });
}
```

### 2. Quote Status (`app/api/quotes/[id]/status/route.ts`)

**События**:
- **SENT** → Ничего (клиенты не заходят в систему)
- **ACCEPTED** → Уведомление всем COMPLECTATOR

**Код**:
```typescript
if (status === 'SENT') {
  console.log('📧 КП отправлено клиенту:', quoteWithClient.number);
} else if (status === 'ACCEPTED') {
  await notifyUsersByRole('COMPLECTATOR', {
    clientId: quoteWithClient.client_id,
    documentId: id,
    type: 'quote_accepted',
    title: 'КП принято',
    message: `Клиент принял коммерческое предложение ${quoteWithClient.number}.`
  });
}
```

### 3. Supplier Order Status (`app/api/supplier-orders/[id]/status/route.ts`)

**События**:
- **ORDERED, RECEIVED_FROM_SUPPLIER, COMPLETED** → Уведомление всем COMPLECTATOR

**Код**:
```typescript
await notifyUsersByRole('COMPLECTATOR', {
  clientId: invoice.client_id,
  documentId: invoice.id,
  type: 'status_changed',
  title: 'Изменение статуса заказа',
  message: invoiceInfo
});
```

### 4. Universal Document Status (`app/api/documents/[id]/status/route.ts`)

**События**: Вызывает `sendStatusNotification` (из `status-notifications.ts`)

**Проблема**: Эта функция импортирует `notifyUsersByRole` динамически, что может вызвать проблемы.

---

## ❌ Проблемы в текущей реализации

### 1. Двойная система уведомлений

**Проблема**: Есть ДВЕ разные системы уведомлений:
1. **Простая** (`lib/notifications.ts`) - используется ✅
2. **Продвинутая** (`lib/notifications/notification-service.ts`) - НЕ используется ❌

**Результат**: 50% кода мертвый код (dead code)

### 2. Не используется конфигурация из `status-notifications.ts`

**Проблема**: 
- В `status-notifications.ts` есть красивая конфигурация для всех статусов
- Но она НЕ используется в реальном коде
- Вместо этого уведомления хардкодятся в каждом API роуте

**Результат**: Дублирование логики, сложность поддержки

### 3. Статусы Invoice меняются вручную

**Проблема**: 
- В Invoice API есть уведомления для `ORDERED`, `RECEIVED_FROM_SUPPLIER`, `COMPLETED`
- НО эти статусы не должны меняться вручную!
- Они должны меняться автоматически через SupplierOrder

**Результат**: Уведомления могут отправляться дважды (один раз при ручном изменении, второй раз при автоматическом)

### 4. Нет проверки наличия пользователей с ролями

**Проблема**: 
- `notifyUsersByRole` создает уведомления для всех пользователей с ролью
- Но если нет ни одного пользователя с этой ролью - уведомления не создаются
- Ошибка не фиксируется

**Результат**: Уведомления могут "теряться" без уведомления разработчика

### 5. Нет истории уведомлений

**Проблема**:
- Уведомления только в БД
- Нет логирования отправки уведомлений
- Если уведомление не создалось - невозможно отследить причину

---

## 📊 Текущий поток уведомлений

```
Invoice PAID (Комплектатор меняет)
  ↓
  уведомление всем EXECUTOR
    ↓
    Исполнитель создает SupplierOrder
      ↓
      SupplierOrder ORDERED
        ↓
        уведомление всем COMPLECTATOR
        синхронизация Invoice → ORDERED
      ↓
      SupplierOrder RECEIVED_FROM_SUPPLIER
        ↓
        уведомление всем COMPLECTATOR
        синхронизация Invoice → RECEIVED_FROM_SUPPLIER
      ↓
      SupplierOrder COMPLETED
        ↓
        уведомление всем COMPLECTATOR
        синхронизация Invoice → COMPLETED
```

---

## ✅ Что работает правильно

1. ✅ Базовая система уведомлений работает
2. ✅ Уведомления сохраняются в БД
3. ✅ API для получения уведомлений работает
4. ✅ Уведомления отправляются при изменении статусов
5. ✅ Поддержка фильтрации по ролям

---

## 🔍 Рекомендации

### 1. Удалить неиспользуемый код

- `lib/notifications/notification-service.ts` - полностью
- `lib/notifications/quote-notifications.ts` - полностью
- `lib/notifications/types.ts` - может быть оставить для будущего расширения
- `lib/notificationUtils.ts` - проверить, используется ли

### 2. Использовать конфигурацию из `status-notifications.ts`

**Вместо**:
```typescript
if (status === 'PAID') {
  await notifyUsersByRole('EXECUTOR', {...});
}
```

**Должно быть**:
```typescript
await sendStatusNotification(
  documentId, 'invoice', documentNumber, 
  oldStatus, newStatus, clientId
);
```

### 3. Добавить логирование

```typescript
export async function notifyUsersByRole(role: string, data: Omit<NotificationData, 'userId'>) {
  const users = await prisma.user.findMany({
    where: { role: role.toUpperCase(), is_active: true }
  });
  
  console.log(`📢 Уведомление роли ${role}: найдено ${users.length} пользователей`);
  
  if (users.length === 0) {
    console.warn(`⚠️ Нет активных пользователей с ролью ${role}`);
    return [];
  }
  
  // ... create notifications
}
```

### 4. Добавить проверку дублирования

```typescript
// В SupplierOrder - НЕ отправлять уведомление если статус уже такой
if (status === currentStatus) {
  console.log('⚠️ Статус не изменился, уведомление не требуется');
  return;
}
```

---

## 📝 Итоговая оценка

**Работает**: ✅ Базовая функциональность
**Не работает**: ❌ Продвинутые фичи (приоритеты, каналы, шаблоны)
**Проблемы**: ⚠️ Дублирование логики, мертвый код, нет логирования

**Оценка**: 6/10

Система работает для базовых нужд, но требует рефакторинга для масштабируемости.

