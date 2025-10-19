# ПЛАН УЛУЧШЕНИЯ СИСТЕМЫ ИМПОРТА ТОВАРОВ

## ПРИОРИТЕТ 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ

### 1.1 Исправление кодировки UTF-8
**Проблема**: Русские символы отображаются как `??????`

**Решение**:
```typescript
// Добавить в lib/encoding-utils.ts
export function fixAllEncoding(data: any): any {
  if (typeof data === 'string') {
    return fixFieldsEncoding([data])[0];
  }
  if (Array.isArray(data)) {
    return data.map(fixAllEncoding);
  }
  if (typeof data === 'object' && data !== null) {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[fixAllEncoding(key)] = fixAllEncoding(value);
    }
    return result;
  }
  return data;
}
```

**Файлы для изменения**:
- `app/api/admin/templates/route.ts` - добавить `fixAllEncoding`
- `app/api/admin/import-templates/route.ts` - добавить `fixAllEncoding`
- Все API, работающие с шаблонами

### 1.2 Исправление ошибки rate limiter
**Проблема**: `uploadRateLimiter.checkLimit is not a function`

**Решение**: Уже исправлено в `app/api/admin/import/photos/route.ts`

## ПРИОРИТЕТ 2: УЛУЧШЕНИЕ ШАБЛОНОВ

### 2.1 Создание интерфейса редактирования шаблонов
**Текущее состояние**: Функция "в разработке"

**Решение**: Создать полноценный компонент `TemplateEditor`

```typescript
// components/admin/TemplateEditor.tsx
interface TemplateEditorProps {
  templateId: string;
  onSave: (template: ImportTemplate) => void;
  onCancel: () => void;
}

export default function TemplateEditor({ templateId, onSave, onCancel }: TemplateEditorProps) {
  // Редактор полей шаблона
  // Drag & drop для изменения порядка
  // Настройка типов полей
  // Валидация полей
}
```

### 2.2 Упрощение шаблона дверей
**Текущее состояние**: 22 обязательных поля

**Предлагаемая структура**:

#### Основные поля (обязательные):
1. **Артикул поставщика** - уникальный идентификатор
2. **Название модели** - `Domeo_Название модели для Web`
3. **Размеры** - Ширина/мм, Высота/мм, Толщина/мм
4. **Цены** - Цена РРЦ, Цена опт
5. **Поставщик** - название поставщика

#### Дополнительные поля (опциональные):
6. **Внешний вид** - Цвет, Стиль, Тип покрытия
7. **Конструкция** - Тип конструкции, Тип открывания
8. **Комплектация** - Кромка, Молдинг, Стекло
9. **Производство** - Коллекция, Фабрика

### 2.3 Автоматическое создание шаблонов
**Функция**: Создание шаблона на основе существующих товаров

```typescript
// app/api/admin/templates/auto-create/route.ts
export async function POST(req: NextRequest) {
  const { catalogCategoryId } = await req.json();
  
  // Анализируем существующие товары
  const products = await prisma.product.findMany({
    where: { catalog_category_id: catalogCategoryId },
    select: { properties_data: true }
  });
  
  // Извлекаем все уникальные поля
  const allFields = new Set();
  products.forEach(product => {
    const properties = JSON.parse(product.properties_data || '{}');
    Object.keys(properties).forEach(field => allFields.add(field));
  });
  
  // Создаем шаблон с найденными полями
  const template = await createTemplateFromFields(catalogCategoryId, Array.from(allFields));
  
  return NextResponse.json({ template });
}
```

## ПРИОРИТЕТ 3: УНИФИКАЦИЯ ИМПОРТА

### 3.1 Объединение API импорта
**Текущее состояние**: 
- `/api/admin/import/universal` - основной импорт
- `/api/admin/import-templates/import` - импорт по шаблону

**Решение**: Объединить в один API с параметрами

```typescript
// app/api/admin/import/unified/route.ts
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const mode = formData.get('mode') as string; // 'template' | 'universal'
  const templateId = formData.get('templateId') as string;
  
  if (mode === 'template' && templateId) {
    return await importWithTemplate(formData, templateId);
  } else {
    return await importUniversal(formData);
  }
}
```

### 3.2 Улучшенная валидация
**Добавить проверки**:
- Обязательные поля
- Типы данных (числа, даты, списки)
- Уникальность артикулов
- Корректность ссылок на категории

```typescript
interface ValidationRule {
  field: string;
  type: 'required' | 'number' | 'date' | 'enum' | 'unique';
  value?: any;
  message: string;
}

const validationRules: ValidationRule[] = [
  { field: 'Артикул поставщика', type: 'required', message: 'Артикул обязателен' },
  { field: 'Ширина/мм', type: 'number', message: 'Ширина должна быть числом' },
  { field: 'Цвет', type: 'enum', value: ['Белый', 'Дуб', 'Орех'], message: 'Неверный цвет' }
];
```

## ПРИОРИТЕТ 4: ГИБКИЙ ЭКСПОРТ

### 4.1 Настраиваемые поля экспорта
**Текущее состояние**: Жестко заданные поля

**Решение**: Создать систему конфигурации экспорта

```typescript
// app/api/admin/export/config/route.ts
interface ExportConfig {
  fields: Array<{
    key: string;
    label: string;
    source: 'product' | 'properties';
    propertyKey?: string;
    format?: 'text' | 'number' | 'currency' | 'date';
  }>;
}

const defaultExportConfig: ExportConfig = {
  fields: [
    { key: 'sku', label: 'SKU', source: 'product' },
    { key: 'name', label: 'Название', source: 'product' },
    { key: 'supplier_sku', label: 'Артикул поставщика', source: 'properties', propertyKey: 'Артикул поставщика' },
    { key: 'width', label: 'Ширина/мм', source: 'properties', propertyKey: 'Ширина/мм', format: 'number' },
    { key: 'price', label: 'Цена РРЦ', source: 'properties', propertyKey: 'Цена РРЦ', format: 'currency' }
  ]
};
```

### 4.2 Предустановленные конфигурации
- **Прайс-лист** - основные поля для клиентов
- **Заказ поставщику** - поля для заказа
- **Каталог** - полная информация о товарах
- **Калькулятор** - поля для расчета стоимости

## ПРИОРИТЕТ 5: ПОЛЬЗОВАТЕЛЬСКИЙ ИНТЕРФЕЙС

### 5.1 Мастер импорта
**Создать пошаговый мастер**:
1. **Выбор файла** - загрузка Excel/CSV
2. **Выбор категории** - выбор категории каталога
3. **Настройка полей** - маппинг полей файла на поля системы
4. **Предварительный просмотр** - проверка данных перед импортом
5. **Импорт** - выполнение импорта с отчетом

### 5.2 Управление шаблонами
**Интерфейс для**:
- Создания новых шаблонов
- Редактирования существующих шаблонов
- Копирования шаблонов между категориями
- Экспорта/импорта шаблонов

### 5.3 История импорта
**Расширить функционал**:
- Детальные отчеты об импорте
- Возможность отката импорта
- Статистика по импортам
- Уведомления об ошибках

## ПЛАН РЕАЛИЗАЦИИ

### Неделя 1: Критические исправления
- [ ] Исправить кодировку UTF-8
- [ ] Протестировать исправления
- [ ] Обновить существующие шаблоны

### Неделя 2: Улучшение шаблонов
- [ ] Создать интерфейс редактирования шаблонов
- [ ] Упростить шаблон дверей
- [ ] Добавить автоматическое создание шаблонов

### Неделя 3: Унификация импорта
- [ ] Объединить API импорта
- [ ] Улучшить валидацию
- [ ] Создать мастер импорта

### Неделя 4: Гибкий экспорт
- [ ] Реализовать настраиваемые поля экспорта
- [ ] Создать предустановленные конфигурации
- [ ] Обновить интерфейс экспорта

## ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### После реализации:
1. **Стабильность**: Исправлены критические ошибки
2. **Удобство**: Простой и понятный интерфейс импорта
3. **Гибкость**: Настраиваемые шаблоны и экспорт
4. **Надежность**: Улучшенная валидация и обработка ошибок
5. **Производительность**: Оптимизированные запросы к базе данных
