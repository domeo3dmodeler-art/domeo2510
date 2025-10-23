# Отчет об исправлении логики уведомлений и передачи информации между ролями

## Проблема
Пользователь сообщил о проблеме с логикой оповещений и передачей информации между ролями:

1. **Скрин 1**: Исполнитель изменил статус заказа `Заказ-1761169840674` по счету `Счет - INVOICE-1761169735063` на "Заказ размещен"
2. **Скрин 2**: У комплектатора появилось правильное уведомление о смене статуса счета
3. **Скрин 3**: Но в модальном окне открывался неправильный счет `ORD-001` вместо `INVOICE-1761169735063`

## Анализ проблемы
После анализа кода и базы данных была выявлена основная причина:

**В уведомлениях передавался неправильный `document_id`** - передавался ID заказа (`cmh2j1t0x000l11720s24x50v`) вместо ID счета (`cmh2izn0y000f1172fxmla0n7`).

### Цепочка связей документов:
```
Invoice (INVOICE-1761169735063) 
  ↓ parent_document_id
Order (ORD-001) 
  ↓ parent_document_id  
SupplierOrder (SUPPLIER-1761169840674)
```

## Исправления

### 1. Исправление передачи document_id в уведомлениях
**Файл**: `app/api/supplier-orders/[id]/status/route.ts`

**Изменение**: В строке 153 изменили:
```typescript
// Было:
document_id: order.id,

// Стало:
document_id: order.parent_document_id, // Передаем ID счета, а не заказа
```

### 2. Добавление кликабельной ссылки на счет
**Файл**: `app/executor/dashboard/page.tsx`

**Изменения**:
- Добавлены состояния для модального окна:
  ```typescript
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  ```

- Сделана ссылка на счет кликабельной:
  ```typescript
  <button
    onClick={(e) => {
      e.stopPropagation();
      setSelectedDocumentId(so.invoiceInfo.id);
      setIsModalOpen(true);
    }}
    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
  >
    Счет - {so.invoiceInfo.number}
  </button>
  ```

- Добавлен импорт и компонент модального окна:
  ```typescript
  import { DocumentQuickViewModal } from '@/components/documents/DocumentQuickViewModal';
  
  {/* Модальное окно документа */}
  {selectedDocumentId && (
    <DocumentQuickViewModal
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        setSelectedDocumentId(null);
      }}
      documentId={selectedDocumentId}
    />
  )}
  ```

## Тестирование

### Проверка данных в базе:
- ✅ Счет `INVOICE-1761169735063` найден с ID `cmh2izn0y000f1172fxmla0n7`
- ✅ Заказ `ORD-001` найден с ID `cmh2j1t0x000l11720s24x50v`
- ✅ Заказ поставщика `SUPPLIER-1761169840674` найден с правильными связями

### Проверка API:
- ✅ API `/api/documents/cmh2izn0y000f1172fxmla0n7` возвращает правильный счет
- ✅ API `/api/supplier-orders/[id]/status` теперь передает правильный `document_id`

### Проверка уведомлений:
- ✅ Новые уведомления содержат правильный ID счета
- ✅ Старые уведомления остались с неправильными ID (это нормально)

## Результат

**Проблема полностью решена:**

1. ✅ Исполнитель может изменять статус заказа поставщика
2. ✅ Комплектатор получает правильное уведомление о смене статуса счета
3. ✅ При клике на уведомление открывается правильный счет в модальном окне
4. ✅ Ссылка на счет в исполнительской панели теперь кликабельна и открывает правильный документ

## Технические детали

- **Логика связей**: Используется `parent_document_id` для последовательных связей (Invoice → Order → SupplierOrder)
- **Уведомления**: Теперь передают ID счета, а не заказа
- **Модальные окна**: Используют API `/api/documents/[id]` для получения данных документа
- **Компоненты**: Добавлен `DocumentQuickViewModal` для отображения документов

Все изменения протестированы и работают корректно.
