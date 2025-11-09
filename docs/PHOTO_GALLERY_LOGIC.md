# Логика галереи фото товаров и свойств

## Обзор архитектуры

Система галереи фото состоит из нескольких уровней:
1. **Хранение фото** - таблица `PropertyPhoto` в БД
2. **API routes** - загрузка и структурирование фото
3. **Компоненты** - отображение фото на клиенте
4. **Обработка путей** - нормализация путей к изображениям

---

## 1. Хранение фото в БД

### Таблица `PropertyPhoto`

Фото хранятся в таблице `PropertyPhoto` со следующей структурой:
- `categoryId` - ID категории (например, `'cmg50xcgs001cv7mn0tdyk1wo'` для "Межкомнатные двери")
- `propertyName` - название свойства (например, `'Артикул поставщика'` или `'Domeo_Название модели для Web'`)
- `propertyValue` - значение свойства (например, `'d23'` или `'DomeoDoors_Cameron_1'`)
- `photoPath` - путь к файлу (например, `'/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/1761773205544_4u6grm_d10.png'`)
- `photoType` - тип фото:
  - `'cover'` - обложка (главное фото)
  - `'gallery_1'`, `'gallery_2'`, ... - фото галереи (сортировка по номеру)

### Поиск фото

Фото ищутся по:
1. **Артикул поставщика** (основной способ) - например, `'d23'`
2. **Варианты артикула** - `'d23_1'`, `'d23_2'`, ... `'d23_10'`
3. **Название модели** (fallback) - если не найдено по артикулу

---

## 2. API Routes для загрузки фото

### 2.1. `/api/catalog/doors/complete-data` (GET)

**Назначение**: Получение полных данных о моделях дверей с фото

**Логика**:
1. Загружает все товары из категории "Межкомнатные двери"
2. Группирует товары по моделям (по `Артикул поставщика`)
3. Для каждой модели:
   - Ищет фото по артикулу (базовый + варианты `_1`, `_2`, ... `_10`)
   - Если не найдено, ищет по `Domeo_Название модели для Web`
   - Структурирует фото через `structurePropertyPhotos()`
4. Возвращает структуру:
   ```typescript
   {
     model: string,           // Название модели для отображения
     modelKey: string,        // Полное имя модели для поиска фото
     style: string,           // Стиль (Классика, Современная, и т.д.)
     photo: string | null,    // Обложка (для каталога)
     photos: {                // Полная структура фото
       cover: string | null,
       gallery: string[]
     },
     hasGallery: boolean,      // Флаг наличия галереи
     products: [...]          // Массив товаров модели
   }
   ```

**Кэширование**: 30 минут

### 2.2. `/api/catalog/doors/photos-batch` (POST)

**Назначение**: Batch загрузка фото для списка моделей

**Логика**:
1. Принимает массив названий моделей
2. Проверяет кэш для каждой модели
3. Для не кэшированных моделей:
   - Находит артикул поставщика для каждой модели
   - Ищет фото по артикулу (базовый + варианты)
   - Если не найдено, ищет по названию модели
   - Структурирует фото
   - **Нормализует пути**: добавляет `/uploads/` если отсутствует
4. Возвращает объект `{ photos: { [modelName]: {...} } }`

**Кэширование**: 30 минут

**Важно**: Пути нормализуются к формату `/uploads/...` (не `/uploadsproducts/...`)

### 2.3. `/api/catalog/doors/photos` (GET)

**Назначение**: Получение фото для одной модели (legacy)

**Логика**:
1. Ищет товары с указанной моделью
2. Извлекает фото из `properties_data.photos`
3. Поддерживает старый формат (массив) и новый (объект `{ cover, gallery }`)

**Кэширование**: 15 минут

---

## 3. Структурирование фото

### Функция `structurePropertyPhotos()` (`lib/property-photos.ts`)

**Входные данные**: Массив `PropertyPhotoInfo[]`

**Логика**:
1. **Ищет обложку**: фото с `photoType === 'cover'`
2. **Сортирует галерею**: фото с `photoType.startsWith('gallery_')` сортируются по номеру
3. **Fallback**: если нет явной обложки, первое фото галереи становится обложкой
4. **Legacy**: если остались фото без типа, сортирует по длине имени файла

**Выходные данные**:
```typescript
{
  cover: string | null,    // Путь к обложке
  gallery: string[]        // Массив путей к фото галереи
}
```

---

## 4. Компоненты галереи

### 4.1. `ModernPhotoGallery` (`components/ModernPhotoGallery.tsx`)

**Назначение**: Современная галерея с зумом и миниатюрами

**Props**:
```typescript
{
  photos: { cover: string | null; gallery: string[] },
  productName: string,
  hasGallery: boolean,
  onToggleSidePanels?: (hide: boolean) => void
}
```

**Функциональность**:
- Отображение обложки и галереи
- Навигация стрелками (← →) и клавиатурой
- Зум изображения (клик или кнопка)
- Миниатюры под изображением (если `hasGallery === true`)
- Полноэкранный режим при зуме

**Обработка путей**:
```typescript
if (photo.startsWith('/uploads/')) {
  imageUrl = `/api${photo}`;
} else if (photo.startsWith('/uploadsproducts')) {
  imageUrl = `/api/uploads/products/${photo.substring(17)}`;
} else if (photo.startsWith('/uploads')) {
  imageUrl = `/api/uploads/${photo.substring(8)}`;
} else if (photo.startsWith('products/')) {
  imageUrl = `/api/uploads/${photo}`;
} else if (photo.startsWith('uploads/')) {
  imageUrl = `/api/${photo}`;
} else {
  imageUrl = `/api/uploads${photo}`;
}
```

### 4.2. `PhotoGallery` (`components/PhotoGallery.tsx`)

**Назначение**: Простая галерея с модальным окном

**Props**:
```typescript
{
  photos: { cover: string | null; gallery: string[] },
  productName?: string,
  className?: string,
  showModal?: boolean,
  showArrows?: boolean
}
```

**Функциональность**:
- Отображение обложки
- Превью остальных фото (если `!showArrows`)
- Модальное окно для просмотра (если `showModal === true`)
- Навигация стрелками (если `showArrows === true`)

**Важно**: Использует пути напрямую без преобразования (ожидает уже правильные пути)

---

## 5. Обработка путей к изображениям

### Проблема: Разные форматы путей

В системе используются разные форматы путей:
- `/uploads/products/...` - правильный формат
- `/uploadsproducts/...` - неправильный формат (без слеша)
- `products/...` - относительный путь
- `/uploads/...` - общий путь

### API Routes для обслуживания файлов

#### `/api/uploads/[...path]/route.ts`

**Назначение**: Основной route для обслуживания файлов из `public/uploads`

**Логика**:
1. Принимает путь вида `/api/uploads/products/...`
2. Преобразует `uploadsproducts/...` → `products/...`
3. Ищет файл в `public/uploads/{filePath}`
4. Возвращает файл с правильными MIME типами

#### `/api/uploadsproducts/[...path]/route.ts`

**Назначение**: Обработка legacy путей вида `/api/uploadsproducts/...`

**Логика**:
1. Принимает путь вида `/api/uploadsproducts/...`
2. Преобразует `uploadsproducts/...` → `products/...`
3. Ищет файл в `public/uploads/products/...`
4. Возвращает файл

**Важно**: Этот route создан для обратной совместимости с путями без слеша

---

## 6. Использование в `app/doors/page.tsx`

### Загрузка данных

1. **Загрузка моделей с фото**:
   ```typescript
   const response = await fetch('/api/catalog/doors/complete-data');
   const data = await response.json();
   setModels(data.models); // Модели уже содержат фото
   ```

2. **Batch загрузка фото** (если нужно обновить):
   ```typescript
   const response = await fetch('/api/catalog/doors/photos-batch', {
     method: 'POST',
     body: JSON.stringify({ models: modelNames })
   });
   const photoData = await response.json();
   // Объединяем фото с моделями
   ```

### Отображение фото

```typescript
{selectedModelCard?.photos && (selectedModelCard.photos.cover || selectedModelCard.photos.gallery.length > 0) ? (
  <ModernPhotoGallery
    photos={selectedModelCard.photos}
    productName={selectedModelCard.model}
    hasGallery={selectedModelCard.hasGallery || false}
    onToggleSidePanels={setHideSidePanels}
  />
) : selectedModelCard?.photo ? (
  <img src={/* преобразованный путь */} />
) : (
  <div>Нет фото</div>
)}
```

---

## 7. Проблемы и решения

### Проблема 1: Пути `/uploadsproducts/...` (без слеша)

**Причина**: В БД могут храниться пути в формате `/uploadsproducts/...` вместо `/uploads/products/...`

**Решение**:
1. API routes нормализуют пути к `/uploads/...`
2. Компоненты преобразуют `/uploadsproducts/...` → `/api/uploads/products/...`
3. Создан отдельный route `/api/uploadsproducts/[...path]` для обратной совместимости

### Проблема 2: Фото не загружаются в галерее

**Возможные причины**:
1. Пути в БД в неправильном формате
2. Файлы не существуют по указанным путям
3. Ошибка преобразования путей в компонентах

**Решение**:
- Добавлено логирование в `ModernPhotoGallery` для отладки
- Проверка существования файлов в API routes
- Единая нормализация путей на всех уровнях

### Проблема 3: Поиск фото по артикулу

**Логика**:
- Сначала ищется по базовому артикулу (например, `'d23'`)
- Затем ищутся варианты (`'d23_1'`, `'d23_2'`, ... `'d23_10'`)
- Если не найдено, ищется по названию модели

**Важно**: Поиск выполняется без учета регистра (`toLowerCase()`)

---

## 8. Рекомендации

### Для разработчиков

1. **Всегда нормализуйте пути** перед сохранением в БД к формату `/uploads/products/...`
2. **Используйте `structurePropertyPhotos()`** для структурирования фото
3. **Проверяйте существование файлов** перед возвратом путей
4. **Используйте кэширование** для оптимизации производительности

### Для администраторов

1. **Проверяйте пути в БД** - они должны быть в формате `/uploads/products/...`
2. **Убедитесь, что файлы существуют** в `public/uploads/products/...`
3. **Используйте правильные `photoType`**:
   - `'cover'` для обложки
   - `'gallery_1'`, `'gallery_2'`, ... для галереи

### Для отладки

1. Проверьте логи в консоли браузера (F12)
2. Проверьте логи сервера для API routes
3. Используйте `clientLogger.debug()` для отслеживания путей
4. Проверьте существование файлов на сервере

---

## 9. Примеры использования

### Пример 1: Загрузка фото для модели

```typescript
// В API route
const propertyPhotos = await getPropertyPhotos(
  'cmg50xcgs001cv7mn0tdyk1wo', // ID категории
  'Артикул поставщика',         // Свойство
  'd23'                         // Значение (артикул)
);

const photoStructure = structurePropertyPhotos(propertyPhotos);
// Результат:
// {
//   cover: '/uploads/products/.../photo.png',
//   gallery: ['/uploads/products/.../photo2.png', ...]
// }
```

### Пример 2: Отображение галереи

```typescript
<ModernPhotoGallery
  photos={{
    cover: '/uploads/products/.../cover.png',
    gallery: ['/uploads/products/.../gallery1.png', ...]
  }}
  productName="DomeoDoors_Cameron_1"
  hasGallery={true}
/>
```

### Пример 3: Преобразование пути

```typescript
function normalizeImagePath(photo: string): string {
  if (photo.startsWith('/uploads/')) {
    return `/api${photo}`;
  } else if (photo.startsWith('/uploadsproducts')) {
    return `/api/uploads/products/${photo.substring(17)}`;
  } else if (photo.startsWith('/uploads')) {
    return `/api/uploads/${photo.substring(8)}`;
  } else {
    return `/api/uploads${photo}`;
  }
}
```

---

## 10. Схема потока данных

```
БД (PropertyPhoto)
  ↓
getPropertyPhotos() → PropertyPhotoInfo[]
  ↓
structurePropertyPhotos() → { cover, gallery }
  ↓
API Route (normalize paths) → { cover: '/uploads/...', gallery: [...] }
  ↓
Client Component (transform paths) → { cover: '/api/uploads/...', gallery: [...] }
  ↓
<img src="/api/uploads/..." />
  ↓
API Route (/api/uploads/[...path]) → File from public/uploads/
```

---

## Заключение

Система галереи фото построена на многоуровневой архитектуре с нормализацией путей на каждом уровне. Основные компоненты:
- **Хранение**: `PropertyPhoto` таблица в БД
- **Загрузка**: API routes с кэшированием
- **Структурирование**: `structurePropertyPhotos()`
- **Отображение**: `ModernPhotoGallery` и `PhotoGallery` компоненты
- **Обслуживание**: API routes для статических файлов

Важно следить за форматом путей и использовать единую нормализацию на всех уровнях.

