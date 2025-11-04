# Первое сообщение для нового чата

## Проект: Domeo - Система управления заказами и документами

### Технологический стек
- **Frontend/Backend**: Next.js 14 (App Router) с TypeScript
- **База данных**: PostgreSQL с Prisma ORM
- **Стилизация**: Tailwind CSS
- **Аутентификация**: JWT (токены в cookies и localStorage)
- **Контейнеризация**: Docker / Docker Compose (staging), Kubernetes (production)
- **Облако**: Yandex Cloud (Managed K8s, Container Registry)

### Инфраструктура

**Staging окружение:**
- Сервер: `130.193.40.35:3001`
- SSH ключ: `C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347`
- Путь на сервере: `/opt/domeo`
- Docker Compose файл: `docker-compose.staging.yml`
- Сервис: `staging-app`

**Deployment процесс:**
```bash
# Локально
git add -A
git commit -m "описание изменений"
git push origin main

# На сервере
ssh ubuntu@130.193.40.35
cd /opt/domeo
git pull origin main
docker compose -f docker-compose.staging.yml build staging-app
docker compose -f docker-compose.staging.yml up -d --force-recreate staging-app
```

### Основная архитектура данных

**Главная сущность - Order (Заказ):**
- Первичный документ, создается из корзины комплектатором
- Нумерация: "Заказ-XXX" (последовательная)
- Содержит: `cart_data`, `total_amount`, `cart_session_id`, `parent_document_id`
- Связан с: `Invoice` (один к одному), `Quote`, `SupplierOrder`

**Документы:**
- **Order** - основной документ, создается первым
- **Invoice** - счет, создается на основе Order
- **Quote** - коммерческое предложение, создается на основе Order
- **SupplierOrder** - заказ у поставщика, создается на основе Order

**Логика создания:**
1. Комплектатор создает **Order** из корзины (кнопка "Создать заказ")
2. На основе Order создаются остальные документы (Invoice, Quote, SupplierOrder)
3. Все документы связаны через `parent_document_id` и `order_id`

**Дедупликация:**
- Проверка по `cart_session_id`, `client_id`, `total_amount`, хешу `cart_data`
- Предотвращает создание дубликатов документов

### Роли и права

**Complectator (Комплектатор):**
- Создает Order из корзины
- Управляет статусами Order: Черновик, Отправлен, Оплачен/Заказ, Отменен
- Видит статусы Исполнителя, но не может их изменять
- ЛК: `/complectator/dashboard` - только список заказов (без вкладок Корзина и Заказы)

**Executor (Исполнитель):**
- Управляет статусами Order: Новый заказ, На проверке, Ждет замер, Ожидает счет, Выполнена
- Загружает файлы: проект/планировка, тех. задания, оптовые счета
- Экспортирует: "Оплаченный счет" (PDF), "Заказ из БД" (Excel)
- ЛК: `/executor/dashboard` - доска заказов с фильтрами по статусам

**Admin:**
- Полный доступ ко всем функциям

### API Endpoints

**Основные:**
- `POST /api/orders` - создание заказа
- `GET /api/orders?client_id=...` - список заказов клиента
- `GET /api/orders/[id]` - детали заказа
- `PUT /api/orders/[id]/status` - изменение статуса заказа
- `POST /api/documents/create` - создание документов (Invoice, Quote, SupplierOrder)
- `POST /api/orders/[id]/files` - загрузка файлов (тех. задания, оптовые счета)
- `POST /api/orders/[id]/project` - загрузка проекта/планировки

**Экспорт:**
- `POST /api/export/fast` - быстрый экспорт PDF/Excel из корзины
- `POST /api/documents/[id]/export?format=pdf` - экспорт документа в PDF
- `GET /api/supplier-orders/[id]/excel` - экспорт заказа у поставщика в Excel

### UI Компоненты

**Модальное окно заказа (Executor):**
- Блоки справа: Проект/планировка, Тех. задания, Оптовые счета
- Все блоки унифицированы с кнопкой "Загрузить" справа
- Списки загруженных файлов с возможностью скачивания
- Блок "Товары" внизу со списком товаров из заказа и итогом

**Корзина:**
- Компоненты: `EnhancedCartSidebar`, `QuickCartSidebar`, `CartSidebar`
- Кнопка "Создать заказ" для комплектатора
- Экспорт документов с автоматическим созданием Order при необходимости

### Текущее состояние проекта

**Последние изменения:**
- Рефакторинг UI модального окна заказа
- Унификация блоков справа
- Добавлен блок "Товары" с детализацией товаров из заказа
- Исправлены кнопки экспорта ("Оплаченный счет", "Заказ из БД")

**Важные файлы:**
- `components/executor/OrdersBoard.tsx` - доска заказов исполнителя и модальное окно
- `app/complectator/dashboard/ComplectatorDashboardComponent.tsx` - ЛК комплектатора
- `app/api/orders/route.ts` - API создания и получения заказов
- `lib/utils/document-statuses.ts` - централизованные статусы документов
- `prisma/schema.prisma` - схема базы данных

### Документация

- `docs/PROJECT_OVERVIEW.md` - полное описание проекта и инфраструктуры
- `docs/DOCUMENT_LOGIC_COMPLETE.md` - логика работы с документами

### Быстрый старт

1. Клонировать репозиторий
2. Установить зависимости: `npm install`
3. Настроить `.env` с переменными БД и JWT
4. Запустить миграции: `npx prisma migrate dev`
5. Запустить dev сервер: `npm run dev`

**Staging deployment:**
- Используется скрипт или ручные команды через SSH
- Автоматический пересбор Docker образа при изменении кода
- Health check: `http://localhost:3001/api/health`

### Важные замечания

- **Order-first логика**: Order всегда создается первым, остальные документы на его основе
- **Дедупликация**: Работает по `cart_session_id` и хешу `cart_data`
- **Статусы**: Комплектатор управляет своими статусами, Исполнитель - своими
- **Экспорт**: Кнопки экспорта должны быть активны и использовать существующие API endpoints

---

**Версия**: Текущая (после рефакторинга UI модального окна заказа)  
**Дата**: 2025-11-04  
**Статус**: Активная разработка

