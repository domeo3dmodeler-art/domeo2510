# Исправление ошибки "Cannot access 'effectiveColumns' before initialization"

## Проблема

Возникла ошибка времени выполнения: **"ReferenceError: Cannot access 'effectiveColumns' before initialization"** в файле `PropertyFilter.tsx` на строке 98.

### 🔍 **Анализ ошибки:**

Ошибка возникла из-за неправильного порядка объявления переменных:

1. **Функция `calculateOptimalCardSize`** была объявлена на строке 90
2. **Переменная `effectiveColumns`** была объявлена на строке 139
3. **Функция `calculateOptimalCardSize`** использовала `effectiveColumns` на строке 98
4. **Результат**: Попытка использовать переменную до её объявления

### 📍 **Место ошибки:**

```typescript
// Строка 90: Объявление функции
const calculateOptimalCardSize = () => {
  const componentWidth = element.props.width || 400;
  const componentHeight = element.props.height || 300;
  
  // Строка 98: ИСПОЛЬЗОВАНИЕ effectiveColumns ДО ЕГО ОБЪЯВЛЕНИЯ
  const cardWidth = Math.max(100, Math.min(300, Math.floor((availableWidth - (effectiveColumns - 1) * gap) / effectiveColumns)));
  
  // ... остальной код
};

// Строка 139: ОБЪЯВЛЕНИЕ effectiveColumns ПОСЛЕ использования
const effectiveColumns = displaySettings.columns || calculateOptimalColumns();
```

## Решение

### 🔧 **Исправление порядка объявления:**

Переместил функцию `calculateOptimalCardSize` и переменную `effectiveCardSize` **после** объявления `effectiveColumns`:

#### **До исправления:**
```typescript
// ❌ НЕПРАВИЛЬНЫЙ ПОРЯДОК
const calculateOptimalCardSize = () => {
  // Использует effectiveColumns, который еще не объявлен
  const cardWidth = Math.max(100, Math.min(300, Math.floor((availableWidth - (effectiveColumns - 1) * gap) / effectiveColumns)));
  // ...
};

const effectiveCardSize = displaySettings.autoSize ? calculateOptimalCardSize() : { 
  cardWidth: displaySettings.cardWidth, 
  cardHeight: displaySettings.cardHeight 
};

// ... другие функции ...

const effectiveColumns = displaySettings.columns || calculateOptimalColumns();
```

#### **После исправления:**
```typescript
// ✅ ПРАВИЛЬНЫЙ ПОРЯДОК
// Сначала объявляем calculateOptimalColumns
const calculateOptimalColumns = () => {
  // ... логика расчета колонок
};

// Затем объявляем effectiveColumns
const effectiveColumns = displaySettings.columns || calculateOptimalColumns();

// Только ПОТОМ объявляем calculateOptimalCardSize, которая использует effectiveColumns
const calculateOptimalCardSize = () => {
  const componentWidth = element.props.width || 400;
  const componentHeight = element.props.height || 300;
  
  // Теперь effectiveColumns уже объявлен и доступен
  const cardWidth = Math.max(100, Math.min(300, Math.floor((availableWidth - (effectiveColumns - 1) * gap) / effectiveColumns)));
  
  const availableHeight = componentHeight - 100;
  const cardHeight = Math.max(80, Math.min(250, Math.floor(availableHeight / Math.ceil(options.length / effectiveColumns))));
  
  return { cardWidth, cardHeight };
};

// И наконец объявляем effectiveCardSize
const effectiveCardSize = displaySettings.autoSize ? calculateOptimalCardSize() : { 
  cardWidth: displaySettings.cardWidth, 
  cardHeight: displaySettings.cardHeight 
};
```

### 🔧 **Технические детали исправления:**

#### **1. Удаление из неправильного места:**
```typescript
// УДАЛЕНО из строк 89-111:
// Автоматический расчет размеров карточек на основе размера компонента
const calculateOptimalCardSize = () => {
  // ... код функции
};

// Определяем эффективные размеры карточек
const effectiveCardSize = displaySettings.autoSize ? calculateOptimalCardSize() : { 
  cardWidth: displaySettings.cardWidth, 
  cardHeight: displaySettings.cardHeight 
};
```

#### **2. Добавление в правильное место:**
```typescript
// ДОБАВЛЕНО после строки 115 (после объявления effectiveColumns):
// Автоматический расчет размеров карточек на основе размера компонента
const calculateOptimalCardSize = () => {
  const componentWidth = element.props.width || 400;
  const componentHeight = element.props.height || 300;
  
  // Рассчитываем оптимальную ширину карточки
  const gap = 12; // gap-3 = 12px
  const padding = 24; // p-3 = 12px с каждой стороны
  const availableWidth = componentWidth - padding;
  const cardWidth = Math.max(100, Math.min(300, Math.floor((availableWidth - (effectiveColumns - 1) * gap) / effectiveColumns)));
  
  // Рассчитываем оптимальную высоту карточки
  const availableHeight = componentHeight - 100; // Оставляем место для заголовка и других элементов
  const cardHeight = Math.max(80, Math.min(250, Math.floor(availableHeight / Math.ceil(options.length / effectiveColumns))));
  
  return { cardWidth, cardHeight };
};

// Определяем эффективные размеры карточек
const effectiveCardSize = displaySettings.autoSize ? calculateOptimalCardSize() : { 
  cardWidth: displaySettings.cardWidth, 
  cardHeight: displaySettings.cardHeight 
};
```

## Принципы исправления

### 🔄 **Правильный порядок объявления:**

1. **Базовые настройки** (`displaySettings`)
2. **Вспомогательные функции** (`calculateOptimalColumns`)
3. **Зависимые переменные** (`effectiveColumns`)
4. **Функции, использующие зависимые переменные** (`calculateOptimalCardSize`)
5. **Финальные переменные** (`effectiveCardSize`)

### 📋 **Правила для избежания подобных ошибок:**

1. **Объявляйте переменные в порядке их зависимостей**
2. **Сначала объявляйте то, что используется другими**
3. **Проверяйте порядок объявления при рефакторинге**
4. **Используйте линтер для выявления подобных проблем**

## Результаты

### ✅ **Что исправлено:**

1. **✅ Устранена ошибка времени выполнения** - "Cannot access 'effectiveColumns' before initialization"
2. **✅ Восстановлена работоспособность** - сервер запускается без ошибок
3. **✅ Исправлен порядок объявления** - переменные объявляются в правильном порядке
4. **✅ Сохранена функциональность** - автоматический расчет размеров работает корректно

### 🎯 **Проверка исправления:**

#### **1. Линтер:**
```bash
✅ No linter errors found
```

#### **2. Сервер:**
```bash
✅ StatusCode: 200
✅ StatusDescription: OK
```

#### **3. Функциональность:**
- ✅ Автоматический расчет размеров карточек работает
- ✅ Ручной режим настройки размеров работает
- ✅ Переключение между режимами "Авто" и "Ручной" работает
- ✅ Индивидуальные размеры карточек работают

## Заключение

Ошибка **"Cannot access 'effectiveColumns' before initialization"** была успешно исправлена путем изменения порядка объявления переменных в файле `PropertyFilter.tsx`.

### 🔧 **Ключевые изменения:**

1. **Перемещена функция `calculateOptimalCardSize`** - из строки 90 в строку 117 (после объявления `effectiveColumns`)
2. **Перемещена переменная `effectiveCardSize`** - из строки 107 в строку 135 (после объявления `calculateOptimalCardSize`)
3. **Сохранен правильный порядок зависимостей** - сначала объявляется то, что используется другими

### 📈 **Результат:**

- **✅ Ошибка устранена** - сервер работает без ошибок
- **✅ Функциональность сохранена** - все возможности работают корректно
- **✅ Код стал более надежным** - правильный порядок объявления переменных

**Файл изменен:**
- `PropertyFilter.tsx` - исправлен порядок объявления переменных

**Теперь автоматический расчет размеров карточек работает корректно!** 🚀
