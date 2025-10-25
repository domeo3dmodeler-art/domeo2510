# Система правил работы с заказчиками и документами

## 🏗️ Архитектура системы

### Роли пользователей
- **ADMIN** - Полный доступ ко всем функциям
- **COMPLECTATOR** - Комплектатор (создание КП, счетов, заказов)
- **EXECUTOR** - Исполнитель (работа с заказами поставщиков)
- **GUEST** - Неавторизованный пользователь (только калькулятор)

### Типы документов
- **Quote (КП)** - Коммерческое предложение
- **Invoice (Счет)** - Счет на оплату
- **Order (Заказ)** - Заказ клиента
- **SupplierOrder** - Заказ у поставщика

---

## 👥 ПРАВИЛА РАБОТЫ С ЗАКАЗЧИКАМИ

### Создание заказчиков

#### Кто может создавать:
- ✅ **ADMIN** - полный доступ
- ✅ **COMPLECTATOR** - может создавать заказчиков для своих документов
- ❌ **EXECUTOR** - только просмотр
- ❌ **GUEST** - не может создавать заказчиков

#### Обязательные поля:
```typescript
{
  firstName: string,     // Имя
  lastName: string,      // Фамилия
  phone: string,         // Телефон
  address: string,       // Адрес
  objectId: string       // ID объекта
}
```

#### Опциональные поля:
```typescript
{
  middleName?: string,   // Отчество
  customFields: {        // Дополнительные поля
    email?: string,
    notes?: string,
    // ... другие поля
  }
}
```

### Редактирование заказчиков

#### Правила доступа:
- ✅ **ADMIN** - может редактировать всех заказчиков
- ✅ **COMPLECTATOR** - может редактировать данные всех заказчиков
- ❌ **EXECUTOR** - только просмотр

#### Ограничения:
- Нельзя изменить `objectId` если у заказчика есть документы
- При изменении контактных данных - уведомление всем связанным пользователям

### Удаление заказчиков

#### Кто может удалять:
- ✅ **ADMIN** - может удалять всех заказчиков
- ❌ **COMPLECTATOR** - не может удалять
- ❌ **EXECUTOR** - не может удалять

#### Условия удаления:
- Заказчик должен быть неактивен (`isActive = false`)
- У заказчика не должно быть активных документов
- Все связанные документы должны быть в статусе "ЗАВЕРШЕН" или "ОТМЕНЕН"

---

## 📄 ПРАВИЛА РАБОТЫ С ДОКУМЕНТАМИ

### Создание документов

#### КП (Коммерческое предложение)
- **Кто создает**: ADMIN, COMPLECTATOR
- **Статусы**: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `CANCELLED`
- **Связи**: Может быть родителем для Invoice (но не обязательно)
- **GUEST**: ❌ Не может создавать

#### Счет (Invoice)
- **Кто создает**: ADMIN, COMPLECTATOR
- **Статусы**: `DRAFT`, `SENT`, `PAID`, `CANCELLED`, `IN_PRODUCTION`, `RECEIVED_FROM_SUPPLIER`, `COMPLETED`
- **Связи**: Может быть родителем для Order
- **Важно**: Счет может создаваться как из КП, так и напрямую из корзины без КП
- **GUEST**: ❌ Не может создавать

#### Заказ (Order)
- **Кто создает**: ADMIN, COMPLECTATOR
- **Статусы**: `DRAFT`, `CONFIRMED`, `IN_PRODUCTION`, `READY`, `COMPLETED`, `CANCELLED`
- **Связи**: Может быть родителем для SupplierOrder
- **GUEST**: ❌ Не может создавать

#### Заказ поставщика (SupplierOrder)
- **Кто создает**: ADMIN, EXECUTOR
- **Статусы**: `PENDING`, `ORDERED`, `IN_PRODUCTION`, `READY`, `COMPLETED`, `CANCELLED`
- **Связи**: Создается на основе Order
- **Важно**: COMPLECTATOR НЕ может создавать заказы поставщиков
- **GUEST**: ❌ Не может создавать

### Редактирование документов

#### Общие правила:
- Документы можно редактировать только в статусе `DRAFT`
- После отправки (`SENT`) - только изменение статуса
- Завершенные документы (`COMPLETED`) - только просмотр

#### Права по ролям:

**ADMIN:**
- ✅ Может редактировать все документы
- ✅ Может изменять статусы всех документов
- ✅ Может отменять любые документы

**COMPLECTATOR:**
- ✅ Может редактировать свои КП, счета, заказы
- ✅ Может изменять статусы своих документов
- ❌ Не может редактировать заказы поставщиков

**EXECUTOR:**
- ❌ Не может редактировать КП, счета, заказы
- ✅ Может изменять статусы заказов поставщиков
- ✅ Может создавать заказы поставщиков

### Удаление документов

#### Кто может удалять:
- ✅ **ADMIN** - может удалять все документы
- ✅ **COMPLECTATOR** - может удалять только созданные им документы
- ✅ **EXECUTOR** - может удалять только созданные им документы

#### Условия удаления:
- Документ должен быть в статусе `DRAFT` или `CANCELLED`
- Пользователь может удалять только документы, созданные им самим
- У документа не должно быть дочерних документов
- Документ не должен быть связан с активными процессами

---

## 👤 ПРАВИЛА ДЛЯ НЕАВТОРИЗОВАННЫХ ПОЛЬЗОВАТЕЛЕЙ (GUEST)

### Доступные функции:
- ✅ **Калькулятор дверей** - полный доступ к расчету цен
- ✅ **Просмотр каталога** - просмотр товаров и цен
- ✅ **Расчет стоимости** - получение цен на двери и комплектующие

### Ограничения:
- ❌ **НЕ видит кнопки "Заказчики"** - интерфейс скрыт
- ❌ **НЕ может создавать документы** - КП, счета, заказы недоступны
- ❌ **НЕ может сохранять корзину** - только расчет без сохранения
- ❌ **НЕ может просматривать существующие документы**

### Техническая реализация:
- Middleware разрешает доступ к `/doors` без авторизации
- UI скрывает элементы управления документами
- API блокирует создание документов для неавторизованных
- Калькулятор работает в "гостевом" режиме

---

## 🔄 ПРАВИЛА ИЗМЕНЕНИЯ СТАТУСОВ

### КП (Quote) - Статусы и переходы

```
DRAFT → SENT → ACCEPTED/REJECTED
  ↓
CANCELLED
```

**Правила переходов:**
- `DRAFT` → `SENT`: Только COMPLECTATOR, ADMIN
- `SENT` → `ACCEPTED`: Только клиент (через внешний интерфейс)
- `SENT` → `REJECTED`: Только клиент (через внешний интерфейс)
- Любой статус → `CANCELLED`: Только ADMIN, COMPLECTATOR

### Счет (Invoice) - Статусы и переходы

```
DRAFT → SENT → PAID → IN_PRODUCTION → RECEIVED_FROM_SUPPLIER → COMPLETED
  ↓
CANCELLED
```

**Правила переходов:**
- `DRAFT` → `SENT`: Только COMPLECTATOR, ADMIN
- `SENT` → `PAID`: Только клиент (через внешний интерфейс)
- `PAID` → `IN_PRODUCTION`: Только ADMIN, COMPLECTATOR
- `IN_PRODUCTION` → `RECEIVED_FROM_SUPPLIER`: Только ADMIN, EXECUTOR
- `RECEIVED_FROM_SUPPLIER` → `COMPLETED`: Только ADMIN, EXECUTOR
- Любой статус → `CANCELLED`: Только ADMIN

### Заказ (Order) - Статусы и переходы

```
DRAFT → CONFIRMED → IN_PRODUCTION → READY → COMPLETED
  ↓
CANCELLED
```

**Правила переходов:**
- `DRAFT` → `CONFIRMED`: Только COMPLECTATOR, ADMIN
- `CONFIRMED` → `IN_PRODUCTION`: Только ADMIN, EXECUTOR
- `IN_PRODUCTION` → `READY`: Только ADMIN, EXECUTOR
- `READY` → `COMPLETED`: Только ADMIN, EXECUTOR
- Любой статус → `CANCELLED`: Только ADMIN

### Заказ поставщика (SupplierOrder) - Статусы и переходы

```
PENDING → ORDERED → IN_PRODUCTION → READY → COMPLETED
  ↓
CANCELLED
```

**Правила переходов:**
- `PENDING` → `ORDERED`: Только ADMIN, EXECUTOR
- `ORDERED` → `IN_PRODUCTION`: Только ADMIN, EXECUTOR
- `IN_PRODUCTION` → `READY`: Только ADMIN, EXECUTOR
- `READY` → `COMPLETED`: Только ADMIN, EXECUTOR
- Любой статус → `CANCELLED`: Только ADMIN

---

## 🔔 СИСТЕМА УВЕДОМЛЕНИЙ

### При изменении статуса документа

#### КП (Quote):
- `SENT` → Уведомление клиенту
- `ACCEPTED` → Уведомление COMPLECTATOR
- `REJECTED` → Уведомление COMPLECTATOR

#### Счет (Invoice):
- `SENT` → Уведомление клиенту
- `PAID` → Уведомление COMPLECTATOR
- `IN_PRODUCTION` → Уведомление EXECUTOR
- `RECEIVED_FROM_SUPPLIER` → Уведомление COMPLECTATOR
- `COMPLETED` → Уведомление COMPLECTATOR и клиенту

#### Заказ (Order):
- `CONFIRMED` → Уведомление EXECUTOR
- `IN_PRODUCTION` → Уведомление COMPLECTATOR
- `READY` → Уведомление COMPLECTATOR
- `COMPLETED` → Уведомление COMPLECTATOR и клиенту

#### Заказ поставщика (SupplierOrder):
- `ORDERED` → Уведомление COMPLECTATOR
- `IN_PRODUCTION` → Уведомление COMPLECTATOR
- `READY` → Уведомление COMPLECTATOR
- `COMPLETED` → Уведомление COMPLECTATOR

---

## 🔒 БЕЗОПАСНОСТЬ И АУДИТ

### Логирование действий
Все действия записываются в `DocumentHistory`:
- Создание документа
- Изменение статуса
- Редактирование содержимого
- Удаление документа

### Проверка прав доступа
- Middleware проверяет JWT токен
- API endpoints проверяют права доступа
- Frontend скрывает недоступные действия

### Валидация данных
- Обязательные поля проверяются на сервере
- Статусы валидируются по списку разрешенных
- Связи между документами проверяются

---

## 📋 РЕКОМЕНДАЦИИ ПО РЕАЛИЗАЦИИ

### 1. Создать middleware для проверки прав
```typescript
export function checkPermission(permission: string) {
  return (req: NextRequest) => {
    const userRole = getUserRole(req);
    const permissions = getRolePermissions(userRole);
    return permissions.includes(permission);
  };
}
```

### 2. Добавить валидацию статусов
```typescript
const STATUS_TRANSITIONS = {
  'quote': {
    'DRAFT': ['SENT', 'CANCELLED'],
    'SENT': ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    // ...
  }
};
```

### 3. Реализовать систему уведомлений
```typescript
export async function notifyStatusChange(
  documentId: string,
  documentType: string,
  oldStatus: string,
  newStatus: string,
  userId: string
) {
  // Логика уведомлений
}
```

### 4. Добавить аудит действий
```typescript
export async function logDocumentAction(
  documentId: string,
  action: string,
  userId: string,
  details: any
) {
  await prisma.documentHistory.create({
    data: {
      document_id: documentId,
      user_id: userId,
      action,
      details: JSON.stringify(details),
      created_at: new Date()
    }
  });
}
```

---

## 🎯 ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### Высокий приоритет:
1. ✅ Система ролей уже реализована
2. ✅ Базовые права доступа работают
3. 🔄 Нужно добавить валидацию статусов
4. 🔄 Нужно улучшить систему уведомлений

### Средний приоритет:
1. Аудит всех действий
2. Расширенная валидация данных
3. Система шаблонов документов

### Низкий приоритет:
1. Расширенная аналитика
2. Интеграция с внешними системами
3. Автоматизация процессов
