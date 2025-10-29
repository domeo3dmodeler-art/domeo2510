# 📧 Логика системы уведомлений

## 🎯 Общее описание

Система уведомлений создает записи в БД для информирования пользователей о изменениях статусов документов.

**Особенности:**
- ❌ Email НЕ отправляется
- ❌ Клиенты НЕ получают уведомления (они не заходят в систему)
- ✅ Уведомления сохраняются в БД
- ✅ Отображаются через колокольчик в шапке (`NotificationBell`)

---

## 👥 Роли пользователей

### 1. **COMPLECTATOR** (Комплектатор)
**Что делает:**
- Создает КП и Счета
- Переводит Invoice в статус `PAID` (Оплачен)
- Переводит Quote в статус `SENT` (Отправлен)
- **НЕ меняет статусы** `ORDERED`, `RECEIVED_FROM_SUPPLIER`, `COMPLETED` в Invoice

**Получает уведомления:**
- Когда Invoice переходит в `ORDERED`
- Когда Invoice переходит в `RECEIVED_FROM_SUPPLIER`
- Когда Invoice переходит в `COMPLETED`
- Когда Quote переходит в `ACCEPTED`

### 2. **EXECUTOR** (Исполнитель)
**Что делает:**
- Создает SupplierOrder (заказы поставщику)
- Меняет статусы SupplierOrder (`ORDERED`, `RECEIVED_FROM_SUPPLIER`, `COMPLETED`)
- Автоматически синхронизирует статусы Invoice

**Получает уведомления:**
- Когда Invoice переводится в `PAID` (Комплектатором)

**⚠️ ВАЖНО:** После перевода счета в `PAID`, Комплектатор **блокируется** и НЕ может менять статусы до `COMPLETED`

### 3. **ACCEPTED** (КП принято)
**Кто меняет:** Только Комплектатор (клиент НЕ делает действий)

**Что происходит:**
- Комплектатор вручную переводит Quote в `ACCEPTED`
- Отправляются уведомления всем `COMPLECTATOR`
- Уведомление: "Клиент принял коммерческое предложение [номер]"

---

## 🔒 Блокировка статусов

### 📋 Заблокированные статусы
```typescript
const BLOCKED_STATUSES = ['ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];
```

### 🚫 Что это означает?

Эти статусы **НЕ МОГУТ** быть изменены **ВРУЧНУЮ** через UI. Они меняются **АВТОМАТИЧЕСКИ** через систему заказов поставщику.

### 💡 Логика блокировки

```typescript
// lib/validation/status-blocking.ts
export async function isStatusBlocked(documentId: string, documentType: 'invoice' | 'quote') {
  // 1. Получаем документ
  // 2. Если статус в списке BLOCKED_STATUSES → БЛОКИРУЕМ
  // 3. Иначе разрешаем
}
```

**Где используется:**
- ✅ `app/api/invoices/[id]/status/route.ts` - при изменении статуса Invoice
- ✅ `app/api/quotes/[id]/status/route.ts` - при изменении статуса Quote
- ✅ `app/complectator/dashboard/page.tsx` - отключение дропдауна в UI

---

## 📊 Матрица уведомлений по статусам

### Invoice (Счет)

| Статус | Кто меняет | Кому уведомление | Проверка блокировки |
|--------|------------|------------------|---------------------|
| DRAFT → SENT | Комплектатор | Нет | ❌ |
| SENT → PAID | Комплектатор | `EXECUTOR` ✅ | ❌ |
| **PAID → ORDERED** | **Нельзя вручную!** | - | ✅ **ЗАБЛОКИРОВАН** |
| **ORDERED → RECEIVED** | **Нельзя вручную!** | - | ✅ **ЗАБЛОКИРОВАН** |
| **RECEIVED → COMPLETED** | **Нельзя вручную!** | - | ✅ **ЗАБЛОКИРОВАН** |

⚠️ **Важно:** Статусы `ORDERED`, `RECEIVED_FROM_SUPPLIER`, `COMPLETED` меняются **ТОЛЬКО автоматически** через SupplierOrder

### Quote (КП)

| Статус | Кто меняет | Кому уведомление | Проверка блокировки |
|--------|------------|------------------|---------------------|
| DRAFT → SENT | Комплектатор | Нет (клиент не заходит) | ❌ |
| SENT → ACCEPTED | Комплектатор | `COMPLECTATOR` ✅ | ❌ |
| ACCEPTED → REJECTED | Комплектатор | Нет | ❌ |

### SupplierOrder (Заказ поставщику)

| Статус | Кто меняет | Кому уведомление | Синхронизация со счетом |
|--------|------------|------------------|-------------------------|
| PENDING → ORDERED | Исполнитель | `COMPLECTATOR` ✅ | Invoice → `ORDERED` ✅ |
| ORDERED → RECEIVED | Исполнитель | `COMPLECTATOR` ✅ | Invoice → `RECEIVED` ✅ |
| RECEIVED → COMPLETED | Исполнитель | `COMPLECTATOR` ✅ | Invoice → `COMPLETED` ✅ |

---

## 🔄 Полный жизненный цикл с уведомлениями

### Сценарий 1: КП → Счет → Заказ поставщику

```
1. Комплектатор создает Quote
   Статус: DRAFT
   Уведомления: Нет

2. Комплектатор отправляет Quote (SENT)
   Статус: SENT
   Уведомления: Нет (клиент не заходит в систему)
   
3. Комплектатор переводит Quote в ACCEPTED ⚠️
   Статус: ACCEPTED
   Уведомления: 📧 Всем COMPLECTATOR → "Клиент принял КП [номер]"
   Актор: Комплектатор (клиент НЕ делает действий)

4. Комплектатор создает Invoice из Quote
   Статус: DRAFT
   Уведомления: Нет

5. Комплектатор отправляет Invoice (SENT)
   Статус: SENT
   Уведомления: Нет

6. Комплектатор переводит Invoice в PAID
   Статус: PAID
   Уведомления: 📧 Всем EXECUTOR → "Счет оплачен. Можете создать заказ у поставщика"
   
7. ⚠️ Комплектатор ЗАБЛОКИРОВАН
   Не может менять статусы до COMPLETED
   UI: дропдаун заблокирован

8. Исполнитель создает SupplierOrder
   Status: PENDING
   Уведомления: Нет

9. Исполнитель переводит SupplierOrder в ORDERED
   Статус: ORDERED
   Уведомления: 📧 Всем COMPLECTATOR → "Заказ размещен у поставщика"
   Синхронизация: Invoice.status → ORDERED ✅
   
10. Исполнитель переводит SupplierOrder в RECEIVED_FROM_SUPPLIER
    Статус: RECEIVED_FROM_SUPPLIER
    Уведомления: 📧 Всем COMPLECTATOR → "Товар получен от поставщика"
    Синхронизация: Invoice.status → RECEIVED_FROM_SUPPLIER ✅
    
11. Исполнитель переводит SupplierOrder в COMPLETED
    Статус: COMPLETED
    Уведомления: 📧 Всем COMPLECTATOR → "Заказ выполнен поставщиком"
    Синхронизация: Invoice.status → COMPLETED ✅
```

---

## 🔍 Технические детали

### Проверка блокировки статуса

**API Route:** `app/api/invoices/[id]/status/route.ts`

```typescript
// Проверяем блокировку статуса
const isBlocked = await isStatusBlocked(id, 'invoice');
if (isBlocked) {
  console.log('🔒 Статус счета заблокирован для ручного изменения');
  return NextResponse.json({
    error: 'Статус счета заблокирован для ручного изменения. Статус изменяется автоматически через связанные заказы поставщику.',
    blocked: true,
    currentStatus: getStatusLabel(existingInvoice.status, 'invoice')
  }, { status: 403 });
}
```

### Frontend проверка блокировки

**Dashboard:** `app/complectator/dashboard/page.tsx`

```typescript
const showStatusDropdown = async (type: 'quote'|'invoice', id: string, event: React.MouseEvent) => {
  // ...
  const isBlocked = await isStatusBlocked(id, type);
  if (isBlocked) {
    toast.error('Статус документа заблокирован для ручного изменения.');
    return;
  }
  // Показать дропдаун
};
```

---

## ✅ Вопросы для уточнения

### 1. Роли в системе
❓ Существуют ли в БД реальные пользователи с ролями `EXECUTOR` и `COMPLECTATOR`?
- Где создаются эти пользователи?
- Нужно ли создать тестовых пользователей?

### 2. Блокировка COMPLECTATOR после PAID
❓ **КРИТИЧЕСКИЙ ВОПРОС:** После перевода Invoice в `PAID`, Комплектатор **полностью блокируется**?
- Не может менять другие счета?
- Не может редактировать КП?
- Может только читать?

### 3. ACCEPTED статус
❓ Комплектатор меняет Quote в `ACCEPTED` **вручную**?
- Есть ли кнопка "КП принято"?
- Или это автоматически при подтверждении клиента?

### 4. Разрешение на отмену
❓ Можно ли отменить статусы?
- `ACCEPTED` → `REJECTED`?
- `PAID` → `CANCELLED`?
- `ORDERED` → `CANCELLED`?

### 5. Архив уведомлений
❓ Старые уведомления:
- Остаются навсегда в БД?
- Нужно ли автоматическое удаление через 30 дней?
- Нужен ли архив (статус "archived")?

### 6. Desktop notifications
❓ Нужны ли браузерные уведомления?
- Всплывающие при открытом браузере?
- Даже когда пользователь не на сайте?

### 7. Уведомления в реальном времени
❓ Нужен ли WebSocket/Polling?
- Обновление счетчика без перезагрузки?
- Появление новых уведомлений без обновления страницы?

---

## 📝 Итоговая карта уведомлений

```
Invoice PAID 
  ↓
  Уведомление: EXECUTOR (все исполнители)
  ↓
  Блокировка COMPLECTATOR (не может менять статусы Invoice)
  ↓
SupplierOrder ORDERED
  ↓
  Уведомление: COMPLECTATOR (все комплектаторы)
  ↓
  Автоматическая синхронизация: Invoice → ORDERED
  ↓
SupplierOrder RECEIVED_FROM_SUPPLIER
  ↓
  Уведомление: COMPLECTATOR
  ↓
  Автоматическая синхронизация: Invoice → RECEIVED_FROM_SUPPLIER
  ↓
SupplierOrder COMPLETED
  ↓
  Уведомление: COMPLECTATOR
  ↓
  Автоматическая синхронизация: Invoice → COMPLETED
  ↓
  🎉 Разблокировка COMPLECTATOR
```

---

## 🚀 Следующие шаги

1. ✅ Создать тестовых пользователей: EXECUTOR и COMPLECTATOR
2. ✅ Протестировать блокировку статусов в UI
3. ✅ Протестировать уведомления
4. ❓ Уточнить бизнес-логику блокировки COMPLECTATOR
5. ❓ Уточнить реальный процесс ACCEPTED

