# Статус развертывания изменений логики статусов

## ✅ Выполнено

### 1. Изменения в коде
- ✅ SupplierOrder теперь создается от `invoiceId` (не от `orderId`)
- ✅ Заменены статусы: `IN_PRODUCTION` → `ORDERED`, `READY` → `RECEIVED_FROM_SUPPLIER`
- ✅ Обновлена синхронизация статусов
- ✅ Обновлены уведомления

### 2. Файлы изменены
- ✅ `app/api/supplier-orders/route.ts`
- ✅ `app/api/supplier-orders/[id]/status/route.ts`
- ✅ `app/api/invoices/[id]/status/route.ts`
- ✅ `lib/validation/status-transitions.ts`
- ✅ `lib/validation/status-blocking.ts`
- ✅ `lib/utils/status-labels.ts`

### 3. Создан SQL для миграции
- ✅ `migrations/fix-status-names.sql`

### 4. Изменения в Git
- ✅ Коммит: "Fix document status logic: SupplierOrder from Invoice, replace IN_PRODUCTION with ORDERED"
- ✅ Push в `develop` выполнен
- ✅ На сервере: `git pull origin develop` выполнен

## ⚠️ Требуется выполнить

### 1. Пересобрать Docker-контейнер
**На сервере**:
```bash
cd /opt/domeo
docker-compose -f docker-compose.staging.yml build --no-cache staging-app
docker-compose -f docker-compose.staging.yml up -d staging-app
```

### 2. Запустить миграцию БД
**На сервере**:
```bash
cd /opt/domeo
# Скопировать файл миграции в контейнер
docker cp migrations/fix-status-names.sql domeo-staging-postgres:/tmp/

# Выполнить миграцию
docker exec domeo-staging-postgres psql -U postgres -d domeo_db -f /tmp/fix-status-names.sql
```

Или выполнить вручную через psql:
```bash
docker exec -it domeo-staging-postgres psql -U postgres -d domeo_db
# Затем выполнить SQL из файла migrations/fix-status-names.sql
```

### 3. Проверить работу
После развертывания проверить:
- Создание SupplierOrder от Invoice
- Изменение статусов Комплектатором до PAID
- Изменение статусов Исполнителем после PAID
- Синхронизация статусов между Invoice и SupplierOrder
- Уведомления для Комплектатора

## 📝 Важно

После выполнения миграции БД старые статусы будут заменены:
- `IN_PRODUCTION` → `ORDERED`
- `READY` → `RECEIVED_FROM_SUPPLIER`

## 🔧 Команды для выполнения

Выполните на сервере:
```bash
cd /opt/domeo
docker-compose -f docker-compose.staging.yml build --no-cache staging-app
docker-compose -f docker-compose.staging.yml up -d staging-app

# Миграция БД
docker exec domeo-staging-postgres psql -U postgres -d domeo_db -c "UPDATE \"Invoice\" SET status = 'ORDERED' WHERE status = 'IN_PRODUCTION';"
docker exec domeo-staging-postgres psql -U postgres -d domeo_db -c "UPDATE \"Invoice\" SET status = 'RECEIVED_FROM_SUPPLIER' WHERE status = 'READY';"
docker exec domeo-staging-postgres psql -U postgres -d domeo_db -c "UPDATE \"SupplierOrder\" SET status = 'ORDERED' WHERE status = 'IN_PRODUCTION';"
docker exec domeo-staging-postgres psql -U postgres -d domeo_db -c "UPDATE \"SupplierOrder\" SET status = 'RECEIVED_FROM_SUPPLIER' WHERE status = 'READY';"
docker exec domeo-staging-postgres psql -U postgres -d domeo_db -c "UPDATE \"Quote\" SET status = 'ORDERED' WHERE status = 'IN_PRODUCTION';"
docker exec domeo-staging-postgres psql -U postgres -d domeo_db -c "UPDATE \"Order\" SET status = 'RECEIVED_FROM_SUPPLIER' WHERE status IN ('IN_PRODUCTION', 'READY');"
```

