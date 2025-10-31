# 🔄 Рабочий процесс: Локально -> Git -> ВМ

## 📋 Порядок работы

### 1. **Вносим изменения локально**
   - Редактируйте файлы в локальной копии репозитория
   - Тестируйте изменения

### 2. **Коммитим и отправляем в Git**
   ```powershell
   # Автоматический вариант (рекомендуется):
   .\sync-to-vm.ps1 "описание изменений"
   
   # Или вручную:
   git add .
   git commit -m "описание изменений"
   git push origin develop
   ```

### 3. **Синхронизация на ВМ**
   ```powershell
   # Автоматический вариант (уже включен в sync-to-vm.ps1):
   ssh -i "C:\Users\petr2\.ssh\ssh-key-1760763840626" ubuntu@130.193.40.35 "cd /opt/domeo && git stash && git pull origin develop && git stash pop"
   
   # Или используйте скрипт:
   .\sync-to-vm.ps1
   ```

## 🚀 Быстрый старт

### Вариант 1: Автоматическая синхронизация (рекомендуется)
```powershell
.\sync-to-vm.ps1 "feat: добавлена новая функция"
```

### Вариант 2: Пошаговая синхронизация
```powershell
# 1. Проверка статуса
git status

# 2. Добавление изменений
git add .

# 3. Коммит
git commit -m "описание изменений"

# 4. Отправка в git
git push origin develop

# 5. Обновление на ВМ
ssh -i "C:\Users\petr2\.ssh\ssh-key-1760763840626" ubuntu@130.193.40.35 "cd /opt/domeo && git pull origin develop"
```

## 📝 Важные файлы

- **Ветка по умолчанию**: `develop`
- **Путь на ВМ**: `/opt/domeo`
- **IP ВМ**: `130.193.40.35`
- **SSH ключ**: `C:\Users\petr2\.ssh\ssh-key-1760763840626`

## ⚠️ Обработка конфликтов

Если на ВМ есть локальные изменения:
```bash
# На ВМ:
cd /opt/domeo
git stash           # Сохранить локальные изменения
git pull origin develop
git stash pop       # Вернуть локальные изменения
```

## 🔍 Проверка статуса

```powershell
# Локально
git status
git log --oneline -5

# На ВМ
ssh -i "C:\Users\petr2\.ssh\ssh-key-1760763840626" ubuntu@130.193.40.35 "cd /opt/domeo && git status && git log --oneline -5"
```


