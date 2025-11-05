# ✅ Готово к деплою на Staging

**⚠️ ВАЖНО**: Работаем ТОЛЬКО со staging ВМ. Production НЕ ТРОГАЕМ!

## ✅ Что исправлено:

1. ✅ ESLint исправления (~121 файл)
2. ✅ TypeScript синтаксические ошибки (4 файла):
   - `app/components/documents/DocumentTree.tsx`
   - `app/components/documents/SimpleDocumentList.tsx`
   - `app/components/QuotesList.tsx`
   - `components/constructor/ProfessionalBlock.tsx`
3. ✅ Компиляция прошла успешно

## 📋 Следующие шаги:

### 1. Закоммитить изменения

```powershell
# Сохраняем изменения в stash (на случай конфликтов)
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
ssh -i "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347" ubuntu@130.193.40.35
cd /opt/domeo
git pull origin develop
docker compose build --no-cache app
docker compose up -d
sleep 10
curl http://localhost:3001/api/health
```

### 3. Проверка

```powershell
# Health check
Invoke-WebRequest -Uri "http://130.193.40.35:3001/api/health" -UseBasicParsing

# Открыть в браузере
# http://130.193.40.35:3001/
```

---

## ⚠️ ЧТО НЕ ДЕЛАТЬ:

- ❌ НЕ трогать production (158.160.202.117)
- ❌ НЕ делать деплой на K8s
- ❌ НЕ изменять main ветку напрямую

## ✅ ЧТО ДЕЛАТЬ:

- ✅ Работать только со staging ВМ (130.193.40.35)
- ✅ Использовать ветку develop
- ✅ Создавать бэкап перед деплоем (скрипт делает автоматически)

