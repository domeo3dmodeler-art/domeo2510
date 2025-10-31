# 🚀 Workflow разработки

## ✅ Что работает СЕЙЧАС:

### 1. ВМ (staging) - ✅ Healthy
- Приложение запущено
- База данных работает
- Health check проходит

### 2. Git - ✅ Синхронизирован
- Код в `develop` ветке
- Автоматический деплой работает

---

## 📋 RECOMMENDED WORKFLOW:

### Подход 1: Разработка без локального запуска (рекомендую)

```bash
# 1. Правим код локально
code app/api/auth/route.ts

# 2. Проверяем что проект собирается
npm run build

# 3. Коммитим и пушим
git add .
git commit -m "Fix: описание проблемы"
git push origin develop

# 4. Код автоматически деплоится на ВМ

# 5. Тестируем на staging
curl http://130.193.40.35:3001/api/health
```

### Подход 2: Разработка через SSH на ВМ (для отладки)

```bash
# 1. Заходим на ВМ
ssh ubuntu@130.193.40.35

# 2. Заходим в контейнер
docker exec -it domeo-staging-app sh

# 3. Смотрим логи
docker logs domeo-staging-app -f

# 4. Правим код локально, пушим
git push origin develop

# 5. На ВМ
cd /opt/domeo
git pull
docker compose -f docker-compose.staging.yml up -d --build
```

---

## 🔧 ТЕКУЩИЕ ЗАДАЧИ:

### ✅ Сделано:
1. Исправлен health check (добавили curl в Dockerfile)
2. ВМ работает и healthy
3. Код синхронизирован через Git

### ⏳ Что можно улучшить (опционально):

1. **Локальная разработка** - если нужно:
   - Настроить VPN или прокси
   - Или использовать Docker Compose для разработки
   - Или работать только на ВМ

2. **Схема БД** - применена на ВМ:
   - Проверить что на ВМ все таблицы созданы
   - При необходимости применить миграции

3. **Автоматизация деплоя**:
   - Настроить GitHub Actions для автодеплоя
   - Или оставить ручной деплой через SSH

---

## 🎯 РЕКОМЕНДАЦИЯ:

**Используйте Подход 1** (без локального запуска):

- ✅ Быстро
- ✅ Не требует дополнительной настройки
- ✅ Тестируете на реальном окружении
- ✅ Нет проблем с сетью

**Когда нужно тестировать локально:**
- Используйте Docker Compose (docker-compose.dev.yml)
- Или работайте напрямую на ВМ

---

## 📝 Пример работы:

```bash
# 1. Правим файл
code app/api/users/route.ts

# 2. Коммитим
git add app/api/users/route.ts
git commit -m "Fix: исправил логику пользователей"
git push origin develop

# 3. Обновляем ВМ
ssh ubuntu@130.193.40.35 "cd /opt/domeo && git pull && docker compose -f docker-compose.staging.yml up -d --build"

# 4. Проверяем
curl http://130.193.40.35:3001/api/users
```

**Готово!** 🎉

