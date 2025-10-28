# 🔍 ДИАГНОСТИЧЕСКИЙ ОТЧЕТ: Почему фото не отображаются

## 📋 ТЕКУЩАЯ СИТУАЦИЯ

Пользователь уже загружал фото, но они не отображаются на UI `/doors`.

## 🔄 ЛОГИКА ПОТОКА ДАННЫХ

### 1. Загрузка страницы (app/doors/page.tsx, строки 1183-1198)

```typescript
// 1. Получаем модели
const response = await fetch(`/api/catalog/doors/complete-data?style=...`);

// 2. Получаем фото batch
const photoResponse = await fetch('/api/catalog/doors/photos-batch', {
  method: 'POST',
  body: JSON.stringify({ models: modelNames })
});

// 3. Объединяем
const modelsWithPhotos = rows.map((model) => ({
  ...model,
  photo: photoData.photos[model.model]?.photo || model.photo,
  photos: photoData.photos[model.model]?.photos || model.photos
}));
```

### 2. API complete-data (app/api/catalog/doors/complete-data/route.ts)

**Строки 124-137**: Получает фото для каждой модели
```typescript
const modelPhotos = await getPropertyPhotos(
  'cmg50xcgs001cv7mn0tdyk1wo',
  'Domeo_Название модели для Web',
  modelData.modelKey
);
```

**Строки 147-148**: Возвращает
```typescript
photo: photoStructure.cover,  // Путь к обложке
photos: photoStructure        // Полная структура
```

### 3. API photos-batch (app/api/catalog/doors/photos-batch/route.ts)

**Строки 105-118**: Ищет фото
```typescript
let propertyPhotos = await getPropertyPhotos(
  'cmg50xcgs001cv7mn0tdyk1wo',
  'Domeo_Название модели для Web',
  normalizedPropertyValue  // lowercase имя модели
);

// Если не найдено, ищем по артикулу
if (propertyPhotos.length === 0) {
  propertyPhotos = await getPropertyPhotos(
    'cmg50xcgs001cv7mn0tdyk1wo',
    'Артикул поставщика',
    normalizedPropertyValue
  );
}
```

**Строки 122-130**: Формирует результат
```typescript
const photoStructure = structurePropertyPhotos(propertyPhotos);

const finalPhotoPath = photoStructure.cover 
  ? `/uploads/${photoStructure.cover}` 
  : null;
```

### 4. Функция structurePropertyPhotos (lib/property-photos.ts)

**Строки 67-80**: Ищет обложку
```typescript
const coverPhoto = photos.find(photo => photo.photoType === 'cover');

return {
  cover: coverPhoto.photoPath,  // ← Возвращает photoPath из БД
  gallery: [...]
};
```

## 🔍 ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Проблема 1: Неправильный путь в БД

**Что хранится в БД:**
```sql
SELECT photoPath FROM property_photo LIMIT 5;
```

**Ожидается:**
```
products/cmg50xcgs001cv7mn0tdyk1wo/1760252626120_xxx_d29.png
```

**Что получается в photos-batch:**
```typescript
finalPhotoPath = `/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/file.png`
```

**Проверка**: Путь должен начинаться с `/uploads/` для корректной отдачи файла.

### Проблема 2: Фото не найдено в БД

**Проверка**: Существуют ли записи в `property_photo`?

**Что ищет API**:
- По свойству `'Domeo_Название модели для Web'`
- По значению = полное имя модели (например, "DomeoDoors_Base_1")

**Что загружено**:
- По свойству `'Артикул поставщика'`
- По значению = артикул (например, "d29")

**Проблема**: Если фото загружены по артикулу, API сначала ищет по модели, а потом по артикулу (fallback). Но может быть несоответствие имен.

### Проблема 3: Неправильное определение обложки/галереи

**Пример**:
- Файл: `d29.png` → Должен быть `photoType = 'cover'`
- Файл: `d29_1.png` → Должен быть `photoType = 'gallery_1'`

**Проверка**: Правильно ли определен тип при импорте?

## 🎯 ПЛАН ДИАГНОСТИКИ

### Шаг 1: Проверить БД на сервере

```bash
# Подключиться к серверу
ssh user@130.193.40.35

# Войти в контейнер БД
docker exec -it domeo-staging-postgres psql -U postgres -d domeo

# Проверить записи
SELECT 
  propertyName,
  propertyValue,
  photoType,
  photoPath,
  createdAt
FROM property_photo 
WHERE categoryId = 'cmg50xcgs001cv7mn0tdyk1wo'
ORDER BY createdAt DESC
LIMIT 20;
```

### Шаг 2: Проверить логи API

```bash
# Логи контейнера
docker logs domeo-staging-app --tail 100 | grep "📸"

# Или конкретно для фото
docker logs domeo-staging-app --tail 500 | grep -E "(📸|Фото|photo)"
```

### Шаг 3: Проверить запрос через браузер

1. Открыть страницу: `http://130.193.40.35:3001/doors`
2. Открыть DevTools → Network
3. Найти запрос: `photos-batch`
4. Проверить ответ

### Шаг 4: Проверить физические файлы

```bash
# На сервере
docker exec domeo-staging-app ls -la public/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/ | head -20
```

## 🔧 ВОЗМОЖНЫЕ РЕШЕНИЯ

### Решение 1: Фото в БД, но неправильный путь

Исправить импорт фото, чтобы сохранялся правильный путь:
```typescript
photoPath: `products/${category}/${fileName}`  // Без /uploads в начале
```

### Решение 2: Фото не в БД

Нужно загрузить фото через UI:
1. Открыть: `http://130.193.40.35:3001/admin/catalog/import`
2. Раздел "Загрузка фотографий"
3. Категория: `cmg50xcgs001cv7mn0tdyk1wo`
4. Свойство: `Артикул поставщика`
5. Загрузить файлы: `d29.png`, `d29_1.png` и т.д.

### Решение 3: Неправильный поиск по модели

Исправить логику поиска, чтобы сначала искалось по артикулу:
```typescript
// Сначала ищем по артикулу
let propertyPhotos = await getPropertyPhotos(
  'cmg50xcgs001cv7mn0tdyk1wo',
  'Артикул поставщика',
  normalizedArticle
);

// Если не найдено, ищем по модели
if (propertyPhotos.length === 0) {
  propertyPhotos = await getPropertyPhotos(
    'cmg50xcgs001cv7mn0tdyk1wo',
    'Domeo_Название модели для Web',
    normalizedModelName
  );
}
```

## 📝 СЛЕДУЮЩИЕ ШАГИ

1. Проверить БД на сервере (Шаг 1)
2. Проверить логи API (Шаг 2)  
3. Проверить в браузере (Шаг 3)
4. Применить соответствующее решение

