# 🔄 Новая логика связей между документами

## 📋 Цепочка документов:

```
КП (Quote) 
  ↓ quote_id
Счет (Invoice) ← quote_id
  ↓ invoice_id
Заказ (Order) ← quote_id + invoice_id
  ↓ order_id
Заказ у поставщика (SupplierOrder) ← order_id + invoice_id
```

## 🎯 Детальная схема связей:

### 1. Quote (КП) - Исходный документ
- `id: string` (уникальный ID)
- `quote_id: null` (исходный документ)
- `client_id: string`
- **Связи:** → Invoice (через quote_id)

### 2. Invoice (Счет) - На основе КП
- `id: string` (уникальный ID)
- `quote_id: string` (ссылка на КП)
- `order_id: string` (ссылка на внутренний заказ)
- `client_id: string`
- **Связи:** ← Quote, → Order (через order_id)

### 3. Order (Заказ) - Внутренний документ
- `id: string` (уникальный ID)
- `quote_id: string` (ссылка на исходную КП)
- `invoice_id: string` (ссылка на счет)
- `client_id: string`
- **Связи:** ← Quote, ← Invoice, → SupplierOrder

### 4. SupplierOrder (Заказ у поставщика)
- `id: string` (уникальный ID)
- `order_id: string` (ссылка на внутренний заказ)
- `invoice_id: string` (ссылка на счет)
- `executor_id: string`
- **Связи:** ← Order, ← Invoice

## 🔗 Преимущества новой логики:

### ✅ Полная трассируемость:
- От КП до поставщика - полная цепочка
- Каждый документ знает о всех связанных
- Легко найти исходный документ

### ✅ Гибкость:
- Можно создать счет без КП (прямой заказ)
- Можно создать заказ у поставщика без счета
- Поддержка различных сценариев

### ✅ Отчетность:
- Полная история документооборота
- Аналитика по цепочкам
- Отслеживание статусов

## 🚀 Сценарии использования:

### Сценарий 1: Полная цепочка
1. **КП** → клиент принимает
2. **Счет** (quote_id = КП.id) → клиент оплачивает
3. **Заказ** (quote_id = КП.id, invoice_id = Счет.id) → создается автоматически
4. **Заказ у поставщика** (order_id = Заказ.id, invoice_id = Счет.id)

### Сценарий 2: Прямой заказ
1. **Счет** (quote_id = null) → клиент оплачивает
2. **Заказ** (quote_id = null, invoice_id = Счет.id)
3. **Заказ у поставщика** (order_id = Заказ.id, invoice_id = Счет.id)

### Сценарий 3: Заказ без счета
1. **КП** → клиент принимает
2. **Заказ** (quote_id = КП.id, invoice_id = null)
3. **Заказ у поставщика** (order_id = Заказ.id, invoice_id = null)

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
POST /api/documents/chain
{
  "type": "invoice",
  "quote_id": "quote_id",
  "client_id": "client_id",
  "items": [...]
}
```
