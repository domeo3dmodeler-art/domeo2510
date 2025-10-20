# 📋 Система документооборота

## 🎯 Цель
Создать систему для хранения и управления связанными документами (КП, Счета, Заказы, Заказы у поставщика) с возможностью генерации документов на основе существующих.

## 🏗️ Архитектура решения

### 1. Улучшенная схема базы данных

**Основные изменения:**
- ✅ Добавлены foreign key связи между всеми документами
- ✅ `Invoice.quote_id` - прямая связь КП → Счет
- ✅ `SupplierOrder.order_id` - связь Заказ → Заказ у поставщика
- ✅ Новая таблица `DocumentHistory` для отслеживания изменений
- ✅ Новая таблица `DocumentTemplate` для шаблонов документов

**Связи документов:**
```
Quote (КП)
├── Order (Заказ) [quote_id]
│   ├── Invoice (Счет) [order_id]
│   └── SupplierOrder (Заказ у поставщика) [order_id]
└── Invoice (Счет) [quote_id] - прямая связь
```

### 2. API для документооборота

**`/api/documents/create`** - Создание документов на основе существующих:
- `POST` - Создание нового документа из исходного
- Поддерживаемые переходы:
  - КП → Заказ
  - КП → Счет
  - Заказ → Счет
  - Заказ → Заказ у поставщика

**`/api/documents/related`** - Получение связанных документов:
- `GET` - Получение связанных документов по типу и ID
- `POST` - Получение полного дерева документов клиента

### 3. Компонент DocumentTree

Интерактивное дерево документов с возможностями:
- 🔍 Просмотр связанных документов
- ➕ Создание новых документов на основе существующих
- 📥 Скачивание документов
- 📊 Отображение статусов и сумм

## 🚀 Внедрение

### Шаг 1: Применить миграцию базы данных

```bash
# Применить миграцию
npx prisma db push

# Или создать миграцию
npx prisma migrate dev --name enhance_document_relationships
```

### Шаг 2: Обновить Prisma схему

Добавить в `prisma/schema.prisma`:

```prisma
model Quote {
  // ... существующие поля
  orders       Order[]   @relation("QuoteToOrder")
  invoices     Invoice[] @relation("QuoteToInvoice")
}

model Order {
  // ... существующие поля
  quote         Quote?    @relation("QuoteToOrder", fields: [quote_id], references: [id])
  invoices      Invoice[] @relation("OrderToInvoice")
  supplier_orders SupplierOrder[] @relation("OrderToSupplierOrder")
}

model Invoice {
  // ... существующие поля
  quote_id     String?   // Новое поле
  quote          Quote?   @relation("QuoteToInvoice", fields: [quote_id], references: [id])
  order          Order?   @relation("OrderToInvoice", fields: [order_id], references: [id])
}

model SupplierOrder {
  // ... существующие поля
  order          Order     @relation("OrderToSupplierOrder", fields: [order_id], references: [id], onDelete: Cascade)
}

model DocumentHistory {
  id          String   @id @default(cuid())
  document_type String
  document_id String
  action      String
  old_value   String?
  new_value   String?
  user_id     String
  notes       String?
  created_at  DateTime @default(now())
  
  @@map("document_history")
}

model DocumentTemplate {
  id          String   @id @default(cuid())
  name        String
  type        String
  template_data String
  is_default  Boolean  @default(false)
  created_by  String
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  
  @@map("document_templates")
}
```

### Шаг 3: Интеграция в существующие компоненты

**В ComplectatorDashboard:**
```tsx
import DocumentTree from '../../../components/documents/DocumentTree';

// В деталях клиента добавить вкладку "Документооборот"
<DocumentTree 
  clientId={selectedClient}
  onDocumentSelect={(doc) => console.log('Selected:', doc)}
  onCreateDocument={(sourceType, sourceId, targetType) => {
    // Создание нового документа
    createDocumentFromSource(sourceType, sourceId, targetType);
  }}
/>
```

**В ExecutorDashboard:**
```tsx
// Аналогично добавить DocumentTree
```

### Шаг 4: API функции для создания документов

```typescript
// Функция для создания документа на основе существующего
const createDocumentFromSource = async (
  sourceType: string, 
  sourceId: string, 
  targetType: string,
  additionalData?: any
) => {
  try {
    const response = await fetch('/api/documents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceType,
        sourceId,
        targetType,
        userId: user.id,
        additionalData
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Document created:', result.document);
      // Обновить UI
      fetchClientDocuments(selectedClient);
    }
  } catch (error) {
    console.error('Error creating document:', error);
  }
};
```

## 📊 Преимущества решения

### 1. **Полная трассируемость**
- Каждый документ связан с исходным
- История всех изменений
- Возможность отследить весь жизненный цикл

### 2. **Гибкость создания документов**
- КП → Заказ → Счет → Заказ у поставщика
- КП → Счет (прямая связь)
- Любые комбинации на основе бизнес-логики

### 3. **Единое хранилище данных**
- Все документы в одной БД
- Консистентность данных
- Возможность аналитики и отчетности

### 4. **Масштабируемость**
- Легко добавить новые типы документов
- Шаблоны для быстрого создания
- API для интеграции с внешними системами

## 🔄 Примеры использования

### Создание заказа из КП:
```javascript
await createDocumentFromSource('quote', 'quote_id_123', 'order', {
  notes: 'Дополнительные условия заказа'
});
```

### Создание счета из заказа:
```javascript
await createDocumentFromSource('order', 'order_id_456', 'invoice', {
  due_date: '2025-02-15',
  notes: 'Счет на оплату заказа'
});
```

### Получение дерева документов клиента:
```javascript
const response = await fetch('/api/documents/related', {
  method: 'POST',
  body: JSON.stringify({ clientId: 'client_123' })
});
const { documentTree } = await response.json();
```

## 🎯 Следующие шаги

1. **Применить миграцию** к базе данных
2. **Интегрировать DocumentTree** в существующие dashboard'ы
3. **Добавить функции создания документов** в UI
4. **Создать шаблоны документов** для генерации PDF/Excel
5. **Добавить уведомления** об изменениях статусов
6. **Реализовать права доступа** для разных ролей

Система готова к внедрению и обеспечивает полный контроль над документооборотом! 🚀
