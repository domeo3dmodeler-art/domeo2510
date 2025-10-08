# Исправление индивидуальных фото и размеров изображений

## Проблемы

Пользователь указал на две проблемы:

1. **Одно фото на все карточки** - сейчас фото ставится на все карточки, нужно иметь возможность вставить свое фото на каждую карточку
2. **Разные размеры изображений** - на карточках получаются разные размеры изображений, нужно чтобы они были одинакового размера

## Анализ проблем

### 🔍 **Проблема 1: Одно фото на все карточки**

#### **Текущее состояние:**
- Одно изображение (`propertyCardImage`) применяется ко всем карточкам свойств
- Нет возможности настроить индивидуальное изображение для каждой опции свойства
- Все карточки отображают одинаковое изображение

#### **Корневая причина:**
```typescript
// Только одно изображение для всех карточек
{displaySettings.propertyCardImage ? (
  <img src={displaySettings.propertyCardImage} alt={option.label} />
) : option.image ? (
  <img src={option.image} alt={option.label} />
) : (
  // Placeholder
)}
```

### 🔍 **Проблема 2: Разные размеры изображений**

#### **Текущее состояние:**
- Изображения имеют разные размеры в зависимости от исходного файла
- Нет единообразного стиля для всех изображений
- Карточки выглядят неаккуратно

#### **Корневые причины:**
1. **Отсутствие фиксированных размеров**: Изображения масштабируются по содержимому
2. **Разные соотношения сторон**: Исходные изображения имеют разные пропорции
3. **Отсутствие object-fit**: Изображения не обрезаются единообразно

## Решения

### ✅ **Решение 1: Добавлена поддержка индивидуальных изображений**

#### **Новый интерфейс DisplaySettings:**
```typescript
interface DisplaySettings {
  showImages: boolean;
  showCounts: boolean;
  cardLayout: 'horizontal' | 'vertical';
  columns: number;
  showProductCards: boolean;
  maxProducts: number;
  customColumns: boolean;
  customProducts: boolean;
  customColumnsValue: number;
  customProductsValue: number;
  propertyCardImage: string;
  maxElements: number;
  showAllElements: boolean;
  individualImages: { [key: string]: string }; // ✅ Индивидуальные изображения для каждой опции
}
```

#### **Настройки по умолчанию:**
```typescript
const displaySettings: DisplaySettings = {
  // ... существующие настройки ...
  individualImages: {}, // ✅ Индивидуальные изображения для каждой опции
  ...element.props.displaySettings
};
```

#### **Новая логика приоритета изображений:**
```typescript
// БЫЛО: только общее изображение
{displaySettings.propertyCardImage ? (
  <img src={displaySettings.propertyCardImage} alt={option.label} />
) : option.image ? (
  <img src={option.image} alt={option.label} />
) : (
  // Placeholder
)}

// СТАЛО: приоритет индивидуальных изображений
{displaySettings.individualImages[option.value] ? (
  <img
    src={displaySettings.individualImages[option.value]}
    alt={option.label} 
    className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
  />
) : displaySettings.propertyCardImage ? (
  <img
    src={displaySettings.propertyCardImage}
    alt={option.label} 
    className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
  />
) : option.image ? (
  <img 
    src={option.image}
    alt={option.label}
    className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
  />
) : (
  // Placeholder
)}
```

### ✅ **Решение 2: Исправлены размеры изображений**

#### **Фиксированные размеры с object-cover:**
```typescript
// Вертикальные карточки
className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}

// Горизонтальные карточки  
className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
```

#### **Контейнер с фиксированными пропорциями:**
```typescript
// Вертикальные карточки: квадратный контейнер
<div className={`${displaySettings.cardLayout === 'vertical' ? 'w-full aspect-square mb-3' : 'flex-shrink-0'}`}>

// Горизонтальные карточки: фиксированный размер
<div className={`${displaySettings.cardLayout === 'vertical' ? 'w-full aspect-square mb-3' : 'flex-shrink-0'}`}>
```

### ✅ **Решение 3: Добавлен UI для настройки индивидуальных изображений**

#### **Новая секция в SimplifiedPropertyFilterPanel:**
```typescript
{/* Индивидуальные изображения для каждой опции */}
{element.props.propertyName && (
  <div className="p-3 bg-gray-50 rounded-lg">
    <h5 className="text-sm font-medium text-gray-900 mb-3">Индивидуальные изображения</h5>
    <p className="text-xs text-gray-500 mb-3">
      Настройте изображение для каждой опции свойства "{element.props.propertyName}"
    </p>
    
    <div className="space-y-3">
      {propertyOptions.length > 0 ? (
        <div className="space-y-3">
          {propertyOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-3 p-2 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                {option.count !== undefined && (
                  <div className="text-xs text-gray-500">{option.count} товаров</div>
                )}
              </div>
              
              {/* Поле для URL изображения */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="URL изображения"
                  value={displaySettings.individualImages[option.value] || ''}
                  onChange={(e) => {
                    const newIndividualImages = { ...displaySettings.individualImages };
                    if (e.target.value) {
                      newIndividualImages[option.value] = e.target.value;
                    } else {
                      delete newIndividualImages[option.value];
                    }
                    handleDisplaySettingsChange({ individualImages: newIndividualImages });
                  }}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Предварительный просмотр */}
              <div className="w-12 h-12 border border-gray-200 rounded overflow-hidden flex-shrink-0">
                {displaySettings.individualImages[option.value] ? (
                  <img
                    src={displaySettings.individualImages[option.value]}
                    alt={option.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">
            Опции свойства будут загружены после выбора свойства на шаге 2
          </p>
        </div>
      )}
    </div>
  </div>
)}
```

### ✅ **Решение 4: Добавлена загрузка опций свойства**

#### **Новый useEffect для загрузки опций:**
```typescript
// Загрузка опций свойства
useEffect(() => {
  const loadPropertyOptions = async () => {
    if (!element.props.propertyName || !element.props.categoryIds || element.props.categoryIds.length === 0) {
      setPropertyOptions([]);
      return;
    }

    setLoading(true);
    try {
      console.log('🔧 SimplifiedPropertyFilterPanel: Загружаем опции свойства:', {
        propertyName: element.props.propertyName,
        categoryIds: element.props.categoryIds
      });

      const response = await fetch('/api/catalog/properties/values-with-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyNames: [element.props.propertyName],
          categoryIds: element.props.categoryIds
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔧 SimplifiedPropertyFilterPanel: Опции свойства загружены:', data);
        setPropertyOptions(data.values || []);
      } else {
        console.error('🔧 SimplifiedPropertyFilterPanel: Ошибка загрузки опций свойства:', response.status);
        setPropertyOptions([]);
      }
    } catch (error) {
      console.error('🔧 SimplifiedPropertyFilterPanel: Ошибка загрузки опций свойства:', error);
      setPropertyOptions([]);
    } finally {
      setLoading(false);
    }
  };

  loadPropertyOptions();
}, [element.props.propertyName, element.props.categoryIds]);
```

## Логика работы

### 🔄 **Приоритет изображений:**

#### **1. Индивидуальное изображение (высший приоритет):**
- ✅ Используется `displaySettings.individualImages[option.value]`
- ✅ Уникальное изображение для каждой опции
- ✅ Настраивается через UI

#### **2. Общее изображение (средний приоритет):**
- ✅ Используется `displaySettings.propertyCardImage`
- ✅ Одно изображение для всех опций
- ✅ Настраивается через "Фото для карточки свойства"

#### **3. Изображение из опции (низший приоритет):**
- ✅ Используется `option.image`
- ✅ Изображение из базы данных
- ✅ Автоматически загружается

#### **4. Placeholder (по умолчанию):**
- ✅ Стандартная иконка
- ✅ Отображается если нет других изображений

### 📱 **Размеры изображений:**

#### **Вертикальные карточки:**
```css
/* Контейнер */
.w-full.aspect-square.mb-3

/* Изображение */
.w-full.h-full.object-cover.rounded-lg.border.border-gray-200
```

#### **Горизонтальные карточки:**
```css
/* Контейнер */
.flex-shrink-0

/* Изображение */
.w-12.h-12.object-cover.rounded-lg.border.border-gray-200
```

### 🎯 **Состояния компонента:**

#### **Состояние 1: Индивидуальные изображения**
- ✅ Каждая опция имеет свое изображение
- ✅ Настраивается через UI
- ✅ Приоритет над общими изображениями

#### **Состояние 2: Общие изображения**
- ✅ Все опции используют одно изображение
- ✅ Настраивается через "Фото для карточки свойства"
- ✅ Приоритет над изображениями из базы

#### **Состояние 3: Изображения из базы**
- ✅ Используются изображения из `option.image`
- ✅ Автоматически загружаются
- ✅ Приоритет над placeholder

#### **Состояние 4: Placeholder**
- ✅ Стандартная иконка
- ✅ Отображается по умолчанию
- ✅ Единообразный стиль

## Преимущества решений

### ✅ **Для пользователей:**

1. **Гибкость**: Можно настроить индивидуальное изображение для каждой опции
2. **Единообразие**: Все изображения имеют одинаковый размер
3. **Простота**: Интуитивный UI для настройки изображений
4. **Предварительный просмотр**: Видно как будет выглядеть изображение

### ✅ **Для разработчиков:**

1. **Расширяемость**: Легко добавить новые типы изображений
2. **Поддержка**: Простая логика приоритета изображений
3. **Отладка**: Логирование для диагностики проблем
4. **Консистентность**: Единообразный стиль для всех изображений

## Технические детали

### 🔧 **Файлы изменены:**

#### **PropertyFilter.tsx:**
```typescript
// 1. Обновлен интерфейс DisplaySettings
interface DisplaySettings {
  // ... существующие поля ...
  individualImages: { [key: string]: string }; // Индивидуальные изображения для каждой опции
}

// 2. Обновлены настройки по умолчанию
const displaySettings: DisplaySettings = {
  // ... существующие настройки ...
  individualImages: {}, // Индивидуальные изображения для каждой опции
  ...element.props.displaySettings
};

// 3. Обновлена логика приоритета изображений
{displaySettings.individualImages[option.value] ? (
  <img
    src={displaySettings.individualImages[option.value]}
    alt={option.label} 
    className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
  />
) : displaySettings.propertyCardImage ? (
  <img
    src={displaySettings.propertyCardImage}
    alt={option.label} 
    className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
  />
) : option.image ? (
  <img 
    src={option.image}
    alt={option.label}
    className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
  />
) : (
  // Placeholder
)}
```

#### **SimplifiedPropertyFilterPanel.tsx:**
```typescript
// 1. Обновлен интерфейс DisplaySettings
interface DisplaySettings {
  // ... существующие поля ...
  individualImages: { [key: string]: string }; // Индивидуальные изображения для каждой опции
}

// 2. Добавлено состояние для опций свойства
const [propertyOptions, setPropertyOptions] = useState<any[]>([]);

// 3. Добавлена загрузка опций свойства
useEffect(() => {
  const loadPropertyOptions = async () => {
    // ... логика загрузки ...
  };
  loadPropertyOptions();
}, [element.props.propertyName, element.props.categoryIds]);

// 4. Добавлен UI для настройки индивидуальных изображений
{/* Индивидуальные изображения для каждой опции */}
{element.props.propertyName && (
  <div className="p-3 bg-gray-50 rounded-lg">
    <h5 className="text-sm font-medium text-gray-900 mb-3">Индивидуальные изображения</h5>
    <p className="text-xs text-gray-500 mb-3">
      Настройте изображение для каждой опции свойства "{element.props.propertyName}"
    </p>
    
    <div className="space-y-3">
      {propertyOptions.length > 0 ? (
        <div className="space-y-3">
          {propertyOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-3 p-2 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                {option.count !== undefined && (
                  <div className="text-xs text-gray-500">{option.count} товаров</div>
                )}
              </div>
              
              {/* Поле для URL изображения */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="URL изображения"
                  value={displaySettings.individualImages[option.value] || ''}
                  onChange={(e) => {
                    const newIndividualImages = { ...displaySettings.individualImages };
                    if (e.target.value) {
                      newIndividualImages[option.value] = e.target.value;
                    } else {
                      delete newIndividualImages[option.value];
                    }
                    handleDisplaySettingsChange({ individualImages: newIndividualImages });
                  }}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Предварительный просмотр */}
              <div className="w-12 h-12 border border-gray-200 rounded overflow-hidden flex-shrink-0">
                {displaySettings.individualImages[option.value] ? (
                  <img
                    src={displaySettings.individualImages[option.value]}
                    alt={option.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">
            Опции свойства будут загружены после выбора свойства на шаге 2
          </p>
        </div>
      )}
    </div>
  </div>
)}
```

### 📊 **Структура данных:**

#### **До исправления:**
```typescript
{
  // ... существующие настройки ...
  propertyCardImage: string; // Только одно изображение для всех
}
```

#### **После исправления:**
```typescript
{
  // ... существующие настройки ...
  propertyCardImage: string; // Общее изображение
  individualImages: { [key: string]: string }; // Индивидуальные изображения
}
```

## Результаты исправлений

### ✅ **Что исправлено:**

1. **✅ Индивидуальные изображения** - каждая опция может иметь свое изображение
2. **✅ Единообразные размеры** - все изображения имеют одинаковый размер
3. **✅ UI для настройки** - добавлен интерфейс для настройки индивидуальных изображений
4. **✅ Приоритет изображений** - логичная система приоритета изображений
5. **✅ Предварительный просмотр** - можно видеть как будет выглядеть изображение

### 🎯 **Новое поведение:**

#### **1. Индивидуальные изображения:**
- ✅ Каждая опция может иметь свое изображение
- ✅ Настраивается через UI в панели настроек
- ✅ Приоритет над общими изображениями
- ✅ Предварительный просмотр в настройках

#### **2. Единообразные размеры:**
- ✅ Все изображения имеют одинаковый размер
- ✅ Используется `object-cover` для правильного обрезания
- ✅ Фиксированные контейнеры с `aspect-square`
- ✅ Единообразные границы и скругления

#### **3. UI для настройки:**
- ✅ Секция "Индивидуальные изображения" в панели настроек
- ✅ Поле ввода URL для каждой опции
- ✅ Предварительный просмотр изображения
- ✅ Автоматическая загрузка опций свойства

#### **4. Приоритет изображений:**
- ✅ Индивидуальное изображение (высший приоритет)
- ✅ Общее изображение (средний приоритет)
- ✅ Изображение из базы (низший приоритет)
- ✅ Placeholder (по умолчанию)

### 📱 **Пользовательский опыт:**

1. **Гибкость**: Можно настроить индивидуальное изображение для каждой опции
2. **Единообразие**: Все изображения имеют одинаковый размер
3. **Простота**: Интуитивный UI для настройки изображений
4. **Предварительный просмотр**: Видно как будет выглядеть изображение

## Заключение

Обе проблемы решены:

1. **✅ Индивидуальные изображения** - каждая опция может иметь свое изображение
2. **✅ Единообразные размеры** - все изображения имеют одинаковый размер

**Теперь можно настраивать индивидуальные изображения для каждой карточки!** 🚀

**Ключевые принципы решения:**
- **Гибкость**: Можно настроить индивидуальное изображение для каждой опции
- **Единообразие**: Все изображения имеют одинаковый размер
- **Простота**: Интуитивный UI для настройки изображений
- **Предварительный просмотр**: Видно как будет выглядеть изображение
- **Приоритет**: Логичная система приоритета изображений
- **Консистентность**: Единообразный стиль для всех изображений
