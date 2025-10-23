# 🔄 Универсальная логика связей между документами

## 📋 Цепочка документов:

```
КП (Quote) 
  ↓ parent_document_id
Счет (Invoice) ← parent_document_id (ссылка на КП)
  ↓ parent_document_id  
Заказ (Order) ← parent_document_id (ссылка на КП или Счет)
  ↓ parent_document_id
Заказ у поставщика (SupplierOrder) ← parent_document_id (ссылка на Заказ)
```

## 🎯 Детальная схема связей:

### 1. Quote (КП) - Исходный документ
- `id: string` (уникальный ID)
- `parent_document_id: null` (исходный документ)
- `cart_session_id: string` (сессия корзины для группировки)
- `client_id: string`
- **Связи:** → Invoice, Order, SupplierOrder (через parent_document_id)

### 2. Invoice (Счет) - На основе КП
- `id: string` (уникальный ID)
- `parent_document_id: string` (ссылка на КП)
- `cart_session_id: string` (та же сессия корзины)
- `client_id: string`
- **Связи:** ← Quote, → Order, SupplierOrder (через parent_document_id)

### 3. Order (Заказ) - Внутренний документ
- `id: string` (уникальный ID)
- `parent_document_id: string` (ссылка на КП или Счет)
- `cart_session_id: string` (та же сессия корзины)
- `client_id: string`
- **Связи:** ← Quote/Invoice, → SupplierOrder (через parent_document_id)

### 4. SupplierOrder (Заказ у поставщика)
- `id: string` (уникальный ID)
- `parent_document_id: string` (ссылка на Заказ)
- `cart_session_id: string` (та же сессия корзины)
- `executor_id: string`
- **Связи:** ← Order (через parent_document_id)

## 🔗 Преимущества универсальной логики:

### ✅ Универсальность:
- Одно поле `parent_document_id` для всех типов связей
- `cart_session_id` для группировки документов одной сессии
- Простая и понятная структура

### ✅ Гибкость:
- Можно создать счет без КП (прямой заказ)
- Можно создать заказ у поставщика без счета
- Поддержка различных сценариев

### ✅ Дедупликация:
- Строгая проверка по всем полям: `parent_document_id`, `cart_session_id`, `client_id`, `total_amount`, `cart_data`
- Предотвращение создания дубликатов документов
- Сохранение целостности данных

## 🚀 Сценарии использования:

### Сценарий 1: Полная цепочка
1. **КП** (parent_document_id: null, cart_session_id: "session_123")
2. **Счет** (parent_document_id: "quote_id", cart_session_id: "session_123")
3. **Заказ** (parent_document_id: "quote_id", cart_session_id: "session_123")
4. **Заказ у поставщика** (parent_document_id: "order_id", cart_session_id: "session_123")

### Сценарий 2: Прямой заказ
1. **Счет** (parent_document_id: null, cart_session_id: "session_456")
2. **Заказ** (parent_document_id: "invoice_id", cart_session_id: "session_456")
3. **Заказ у поставщика** (parent_document_id: "order_id", cart_session_id: "session_456")

### Сценарий 3: Заказ без счета
1. **КП** (parent_document_id: null, cart_session_id: "session_789")
2. **Заказ** (parent_document_id: "quote_id", cart_session_id: "session_789")
3. **Заказ у поставщика** (parent_document_id: "order_id", cart_session_id: "session_789")

## 📊 API для работы со связями:

### Получить полную цепочку документа:
```
GET /api/documents/{id}/chain
```

### Получить связанные документы:
```
GET /api/documents/{id}/related?type=all|quote|invoice|order|supplier_order
```

### Создать документ с автоматическими связями:
```
POST /api/documents/create
{
  "type": "invoice",
  "parent_document_id": "quote_id",
  "cart_session_id": "session_123",
  "client_id": "client_id",
  "items": [...]
}
```

## 🔍 Логика дедупликации:

### Строгие критерии совпадения:
1. **parent_document_id** - точное совпадение (включая null)
2. **cart_session_id** - точное совпадение (включая null)
3. **client_id** - точное совпадение
4. **total_amount** - точное совпадение
5. **cart_data** - содержит одинаковый хеш содержимого

### Алгоритм дедупликации:
1. Создается хеш содержимого корзины (`createContentHash`)
2. Поиск существующего документа по всем критериям
3. Если найден - возвращается существующий документ
4. Если не найден - создается новый документ
