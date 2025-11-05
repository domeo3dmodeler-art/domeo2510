# ✅ HOT RELOAD НАСТРОЕН!

## 📋 Статус настройки

**Дата:** $(Get-Date -Format "yyyy-MM-dd HH:mm")

---

## ✅ Что сделано:

1. ✅ Создан `docker-compose.staging-dev.yml` с hot reload конфигурацией
2. ✅ Файлы скопированы на staging ВМ (`~/domeo-staging`)
3. ✅ Контейнер запущен в hot reload режиме

---

## 🌐 Доступ:

**Staging URL:** http://130.193.40.35:3001

---

## 🔄 Как использовать:

### Быстрая синхронизация кода:

```powershell
# Синхронизировать код (вручную через scp)
scp -r app ubuntu@130.193.40.35:~/domeo-staging/
scp -r components ubuntu@130.193.40.35:~/domeo-staging/
scp -r lib ubuntu@130.193.40.35:~/domeo-staging/

# Перезапустить контейнер для применения изменений
ssh ubuntu@130.193.40.35 "cd ~/domeo-staging && docker compose -f docker-compose.staging-dev.yml restart staging-app"
```

### Просмотр логов:

```powershell
ssh ubuntu@130.193.40.35 "cd ~/domeo-staging && docker compose -f docker-compose.staging-dev.yml logs -f staging-app"
```

---

## 📊 Управление контейнером:

### Статус:
```bash
ssh ubuntu@130.193.40.35 "cd ~/domeo-staging && docker compose -f docker-compose.staging-dev.yml ps"
```

### Перезапуск:
```bash
ssh ubuntu@130.193.40.35 "cd ~/domeo-staging && docker compose -f docker-compose.staging-dev.yml restart staging-app"
```

### Остановка:
```bash
ssh ubuntu@130.193.40.35 "cd ~/domeo-staging && docker compose -f docker-compose.staging-dev.yml down"
```

---

## ⚡ Преимущества:

- ✅ **Мгновенные изменения** - без пересборки Docker образа (5-15 минут → 30 секунд)
- ✅ **Hot Reload** - Next.js автоматически перезагружает страницу
- ✅ **Быстрая разработка** - видите изменения сразу
- ✅ **Реальные данные** - используете staging БД

---

**Готово к использованию!** 🚀

