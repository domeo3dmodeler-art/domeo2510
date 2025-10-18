# 🧪 Настройка тестовой среды на VM

## 🎯 Цель
Создать тестовую среду на отдельной VM для безопасного тестирования изменений перед production.

## 📋 План действий

### 1. Создайте staging VM на Yandex Cloud
```bash
# Создайте новую VM с теми же характеристиками что и production
# Ubuntu 20.04, 2 vCPU, 4GB RAM, 20GB SSD
# Откройте порты: 22, 3001, 80, 443
```

### 2. Настройте SSH доступ
```bash
# Создайте SSH ключ для staging
ssh-keygen -t rsa -b 4096 -f staging_key -N ""

# Скопируйте публичный ключ на staging VM
ssh-copy-id -i staging_key.pub ubuntu@<STAGING_IP>

# Или вручную:
cat staging_key.pub | ssh ubuntu@<STAGING_IP> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. Настройте staging VM
```bash
# Запустите скрипт настройки
./setup-staging-vm.sh
```

### 4. Синхронизируйте изменения с production
```bash
# Получите изменения с production VM
./sync-from-production.ps1

# Проверьте изменения
git diff

# Добавьте и закоммитьте
git add .
git commit -m "sync: production changes from VM"

# Отправьте в feature ветку
git push origin feature/sync-production-changes
```

### 5. Протестируйте на staging
```bash
# Деплой на staging
./deploy-staging-safe.sh

# Проверьте работу
curl http://<STAGING_IP>:3001/api/health
```

## 🔄 Workflow с тестовой средой

### **Новый безопасный процесс:**

1. **Разработка локально** → `feature/new-feature`
2. **Тестирование на staging VM** → `develop` → staging VM
3. **Production деплой** → `main` → production VM

### **Структура веток:**
```
main (production VM) ←── develop (staging VM) ←── feature/new-feature (local)
     ↑                        ↑                           ↑
   Только готовое          Тестирование                Разработка
   Стабильный код          Проверки на VM             Эксперименты
```

## 🛠️ Управление staging VM

### **Основные команды:**
```bash
# Статус сервиса
ssh -i staging_key ubuntu@<STAGING_IP> 'sudo systemctl status domeo-staging'

# Логи
ssh -i staging_key ubuntu@<STAGING_IP> 'sudo journalctl -u domeo-staging -f'

# Перезапуск
ssh -i staging_key ubuntu@<STAGING_IP> 'sudo systemctl restart domeo-staging'

# Остановка
ssh -i staging_key ubuntu@<STAGING_IP> 'sudo systemctl stop domeo-staging'
```

### **Обновление staging:**
```bash
# Автоматический деплой
./deploy-staging-safe.sh

# Или вручную
git checkout develop
git pull origin develop
./deploy-staging-safe.sh
```

## 🔧 Настройка переменных окружения

### **Создайте файл .env.staging:**
```bash
# Staging Environment
NODE_ENV=staging
NEXT_PUBLIC_BASE_URL=http://<STAGING_IP>:3001

# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="staging-jwt-secret-key"

# File Storage (используйте отдельный bucket для staging)
YANDEX_ACCESS_KEY_ID="your-access-key"
YANDEX_SECRET_ACCESS_KEY="your-secret-key"
YANDEX_BUCKET_NAME="domeo-staging"
YANDEX_REGION="ru-central1"
```

## 🚨 Важные моменты

### **Безопасность:**
- Используйте отдельные SSH ключи для staging и production
- Используйте отдельный Yandex bucket для staging
- Не используйте production данные в staging

### **Мониторинг:**
- Настройте отдельные алерты для staging
- Используйте отдельные логи
- Мониторьте использование ресурсов

### **Бэкапы:**
- Staging VM должна иметь свои бэкапы
- Не полагайтесь на staging как на основной бэкап production

## 📊 Преимущества тестовой среды

✅ **Безопасность** - тестирование без риска для production  
✅ **Качество** - выявление проблем до production  
✅ **Скорость** - быстрые итерации разработки  
✅ **Надежность** - стабильные production релизы  
✅ **Команда** - возможность тестирования несколькими разработчиками  

## 🎯 Следующие шаги

1. **Создайте staging VM** на Yandex Cloud
2. **Настройте SSH доступ** с отдельным ключом
3. **Запустите setup-staging-vm.sh** для настройки
4. **Синхронизируйте изменения** с production VM
5. **Протестируйте workflow** на staging
6. **Настройте автоматические деплои** через GitHub Actions
