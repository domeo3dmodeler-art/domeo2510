# 🔗 Отчет об исправлении логики связей документов

## 📋 Проблема
Заказ поставщика `SUPPLIER-1761169840674` не отображал связанный счет и правильную сумму из-за неправильной логики связей документов.

## 🔧 Исправления

### 1. ✅ Исправлена цепочка связей документов
**Было:**
```
Счет (Invoice) ← не связан
Заказ (Order) ← parent_document_id: null
Заказ поставщика (SupplierOrder) ← parent_document_id: Order
```

**Стало:**
```
Счет (Invoice) 
  ↓ parent_document_id
Заказ (Order) ← parent_document_id: Invoice
  ↓ parent_document_id  
Заказ поставщика (SupplierOrder) ← parent_document_id: Order
```

### 2. ✅ Обновлена логика поиска счета в API
**Новая логика:** `SupplierOrder → Order → Invoice` через `parent_document_id`
**Fallback:** Поиск по `cart_session_id` для совместимости со старыми данными

### 3. ✅ Исправлены данные в БД
- **Заказ** `ORD-001` теперь ссылается на счет `INVOICE-1761169735063`
- **Заказ поставщика** `SUPPLIER-1761169840674` правильно ссылается на заказ
- **Сумма** заказа поставщика исправлена с 0 на 80400₽
- **cart_session_id** очищен у заказа поставщика (связь через parent_document_id)

## 📊 Результат

### API теперь возвращает:
```json
{
  "supplierOrders": [
    {
      "id": "cmh2j1u78000o1172hi5un42s",
      "number": "SUPPLIER-1761169840674",
      "total_amount": 80400,
      "parent_document_id": "cmh2j1t0x000l11720s24x50v",
      "cart_session_id": null,
      "invoiceInfo": {
        "id": "cmh2izn0y000f1172fxmla0n7",
        "number": "INVOICE-1761169735063",
        "total_amount": 80400
      }
    }
  ]
}
```

### В интерфейсе исполнителя:
- ✅ **Сумма заказа:** 80,400₽ (исправлено)
- ✅ **Связанный счет:** "Счет - INVOICE-1761169735063" (исправлено)
- ✅ **Логика связей:** Работает через `parent_document_id`

## 🎯 Универсальная логика связей

Теперь система правильно использует универсальную логику связей документов:

```
КП (Quote) 
  ↓ parent_document_id
Счет (Invoice) 
  ↓ parent_document_id
Заказ (Order) 
  ↓ parent_document_id
Заказ у поставщика (SupplierOrder)
```

**cart_session_id** используется только для группировки документов, созданных из одной корзины параллельно, а **parent_document_id** - для последовательной цепочки документов.

---
*Отчет создан: $(Get-Date)*
