# 🚀 Быстрый деплой исправлений на Staging (только!)

**⚠️ ВАЖНО**: Работаем ТОЛЬКО со staging ВМ. Production НЕ ТРОГАЕМ!

## 📋 План действий:

### 1. Закоммитить изменения в develop

```powershell
# Сохраняем изменения в stash (если нужно)
git stash

# Переключаемся на develop
git checkout develop
git pull origin develop

# Возвращаем изменения
git stash pop

# Коммитим
git add .
git commit -m "fix: apply ESLint fixes and TypeScript improvements"

# Отправляем в develop
git push origin develop
```

### 2. Деплой на Staging ВМ

**Используйте скрипт:**
```powershell
.\scripts\deploy-fixes-to-staging.ps1
```

**Или вручную:**
```powershell
ssh -i "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347" ubuntu@130.193.40.35 @"
    cd /opt/domeo
    
    # Создаем бэкап (на всякий случай)
    mkdir -p /tmp/domeo-backup-$(date +%Y%m%d_%H%M%S)
    
    # Получаем изменения
    git fetch origin
    git pull origin develop
    
    # Пересобираем и перезапускаем
    docker compose build --no-cache app
    docker compose up -d
    
    # Проверяем
    sleep 10
    curl http://localhost:3001/api/health
"@
```

### 3. Проверка

```powershell
# Health check staging
Invoke-WebRequest -Uri "http://130.193.40.35:3001/api/health" -UseBasicParsing

# Открыть в браузере
# http://130.193.40.35:3001/
```

---

## ⚠️ ЧТО НЕ ДЕЛАТЬ:

- ❌ НЕ трогать production (158.160.202.117)
- ❌ НЕ делать деплой на K8s
- ❌ НЕ изменять main ветку напрямую
- ❌ НЕ изменять DATABASE_URL на staging ВМ

## ✅ ЧТО ДЕЛАТЬ:

- ✅ Работать только со staging ВМ (130.193.40.35)
- ✅ Использовать ветку develop
- ✅ Создавать бэкап перед деплоем
- ✅ Проверять health check после деплоя

