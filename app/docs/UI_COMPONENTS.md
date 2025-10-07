# UI Компоненты Domeo

## Обзор

Единая дизайн-система для проекта Domeo, основанная на лучших практиках UI/UX дизайна. Все компоненты следуют единому стилю и обеспечивают консистентность интерфейса.

## Дизайн-токены

### Цвета
- **Primary**: Черно-желтая схема (black, yellow-400)
- **Secondary**: Серые оттенки для второстепенных элементов
- **Status**: Красный (ошибки), зеленый (успех), синий (информация)

### Типографика
- **Шрифт**: Inter (основной), JetBrains Mono (моноширинный)
- **Размеры**: xs (12px) → 4xl (36px)
- **Веса**: normal (400), medium (500), semibold (600), bold (700)

### Отступы
- **Базовые**: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px

### Радиусы
- **Кнопки**: `rounded-none` (острые углы)
- **Карточки**: `rounded-lg` (8px)
- **Модальные окна**: `rounded-lg` (8px)

## Компоненты

### Button

Основной компонент кнопок с несколькими вариантами.

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md">
  Основная кнопка
</Button>

<Button variant="secondary" size="sm">
  Вторичная кнопка
</Button>

<Button variant="ghost" size="lg">
  Призрачная кнопка
</Button>
```

**Варианты:**
- `primary` - черный фон, белый текст, hover → желтый
- `secondary` - прозрачный фон, черная рамка, hover → черный фон
- `ghost` - прозрачный фон, серая рамка
- `danger` - красный фон для опасных действий
- `success` - зеленый фон для успешных действий

**Размеры:**
- `sm` - маленький (px-2 py-1 text-xs)
- `md` - средний (px-3 py-2 text-sm)
- `lg` - большой (px-6 py-3 text-base)

### Card

Универсальный компонент карточек для группировки контента.

```tsx
import { Card } from '@/components/ui';

<Card variant="base" padding="md">
  <h3>Заголовок карточки</h3>
  <p>Содержимое карточки</p>
</Card>

<Card variant="interactive" padding="lg">
  Интерактивная карточка
</Card>
```

**Варианты:**
- `base` - базовая карточка с тенью
- `elevated` - приподнятая карточка
- `interactive` - интерактивная карточка с hover эффектами

**Отступы:**
- `sm` - маленький (p-3)
- `md` - средний (p-6)
- `lg` - большой (p-8)

### Input

Поле ввода с поддержкой лейблов, ошибок и подсказок.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Название"
  placeholder="Введите название"
  error="Поле обязательно для заполнения"
  helperText="Максимум 100 символов"
/>
```

**Свойства:**
- `label` - лейбл поля
- `error` - сообщение об ошибке
- `helperText` - подсказка
- `variant` - `base` | `error`

### Select

Выпадающий список с поддержкой опций.

```tsx
import { Select } from '@/components/ui';

<Select
  label="Категория"
  placeholder="Выберите категорию"
  options={[
    { value: 'doors', label: 'Двери' },
    { value: 'windows', label: 'Окна' }
  ]}
/>
```

### Checkbox

Чекбокс с поддержкой лейблов и состояний.

```tsx
import { Checkbox } from '@/components/ui';

<Checkbox
  label="Согласен с условиями"
  checked={isChecked}
  onChange={handleChange}
/>
```

### Modal

Модальное окно с поддержкой заголовка, контента и футера.

```tsx
import { Modal, Button } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Подтверждение"
  size="md"
  footer={
    <div className="flex space-x-3">
      <Button variant="secondary" onClick={handleClose}>
        Отмена
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Подтвердить
      </Button>
    </div>
  }
>
  <p>Вы уверены, что хотите выполнить это действие?</p>
</Modal>
```

**Размеры:**
- `sm` - маленький (max-w-sm)
- `md` - средний (max-w-md)
- `lg` - большой (max-w-lg)
- `xl` - очень большой (max-w-xl)

### DataTable

Таблица данных с поддержкой сортировки и кастомного рендеринга.

```tsx
import { DataTable } from '@/components/ui';

const columns = [
  {
    key: 'name',
    label: 'Название',
    sortable: true,
    render: (value, row) => (
      <div className="font-medium">{value}</div>
    )
  },
  {
    key: 'status',
    label: 'Статус',
    render: (value) => (
      <Badge variant={value === 'active' ? 'success' : 'error'}>
        {value}
      </Badge>
    )
  }
];

<DataTable
  columns={columns}
  data={data}
  loading={loading}
  onSort={handleSort}
  onRowClick={handleRowClick}
/>
```

### Badge

Бейдж для отображения статусов и меток.

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success" size="sm">
  Активен
</Badge>

<Badge variant="error" size="md">
  Ошибка
</Badge>
```

**Варианты:**
- `default` - серый
- `success` - зеленый
- `warning` - желтый
- `error` - красный
- `info` - синий

### Alert

Уведомление с поддержкой разных типов и возможности закрытия.

```tsx
import { Alert } from '@/components/ui';

<Alert
  variant="success"
  title="Успешно!"
  onClose={handleClose}
>
  Операция выполнена успешно
</Alert>
```

### LoadingSpinner

Спиннер загрузки с настраиваемым размером и цветом.

```tsx
import { LoadingSpinner } from '@/components/ui';

<LoadingSpinner size="lg" color="black" text="Загрузка..." />
```

## Использование

### Импорт компонентов

```tsx
// Импорт отдельных компонентов
import { Button, Card, Input } from '@/components/ui';

// Импорт дизайн-токенов
import { designTokens, createComponentStyles } from '@/components/ui';
```

### Кастомизация

Все компоненты поддерживают кастомизацию через `className`:

```tsx
<Button 
  variant="primary" 
  className="w-full mt-4"
>
  Кастомная кнопка
</Button>
```

### Состояния

Компоненты автоматически обрабатывают состояния:
- `disabled` - отключенное состояние
- `loading` - состояние загрузки
- `error` - состояние ошибки

## Лучшие практики

1. **Консистентность**: Используйте одинаковые компоненты для одинаковых функций
2. **Доступность**: Все компоненты поддерживают клавиатурную навигацию
3. **Производительность**: Компоненты оптимизированы для перерендеринга
4. **Типизация**: Все компоненты полностью типизированы TypeScript

## Расширение

Для добавления новых компонентов:

1. Создайте файл в `components/ui/`
2. Используйте дизайн-токены из `lib/design/tokens.ts`
3. Добавьте экспорт в `components/ui/index.ts`
4. Обновите документацию

## Примеры

Полные примеры использования можно найти в:
- `app/app/admin/categories/page.tsx`
- `app/app/admin/page.tsx`
- `app/components/category-builder/`
