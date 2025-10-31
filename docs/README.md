# 📚 Документация проекта Domeo

> **Статус**: После аудита и реорганизации (2025-11-01)

Эта папка содержит всю актуальную документацию по проекту Domeo.

---

## 📖 Основные документы

### 🏗️ Архитектура и инфраструктура

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** ⭐ - Полная архитектура приложения, модули, API, инфраструктура
- **[AGENT_ONBOARDING.md](./AGENT_ONBOARDING.md)** ⭐ - Инфраструктура и текущее состояние проекта (онбординг)
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Структура проекта

### 🚀 Разработка и деплой

- **[DEVELOPMENT_WORKFLOW_COMPLETE.md](./DEVELOPMENT_WORKFLOW_COMPLETE.md)** ⭐ - Полный Workflow доработки проекта (пошаговый процесс)
- **[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)** - Workflow разработки (краткое описание)
- **[LOCAL_DEVELOPMENT_SETUP.md](./LOCAL_DEVELOPMENT_SETUP.md)** - Настройка локальной разработки
- **[DEPLOY.md](./DEPLOY.md)** - Руководство по деплою (Yandex Cloud K8s)
- **[README-DEVELOPMENT.md](./README-DEVELOPMENT.md)** - Руководство для разработчиков
- **[README_WORKFLOW.md](./README_WORKFLOW.md)** - Git workflow процесса

### 🏛️ Система правил и бизнес-логика

- **[SYSTEM_RULES_AND_PERMISSIONS.md](./SYSTEM_RULES_AND_PERMISSIONS.md)** ⭐ - Полные правила работы с заказчиками и документами
- **[SYSTEM_FLOW_DIAGRAM.md](./SYSTEM_FLOW_DIAGRAM.md)** - Диаграммы и схемы процессов системы
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Практическое руководство по внедрению правил
- **[DOCUMENT_LINKS_LOGIC.md](./DOCUMENT_LINKS_LOGIC.md)** - Логика связей документов
- **[notifications-logic-final.md](./notifications-logic-final.md)** - Финальная логика системы уведомлений

### 👥 Пользовательские инструкции

- **[USER_INSTRUCTIONS.md](./USER_INSTRUCTIONS.md)** - Инструкции для пользователей системы
- **[HOW_TO_UPLOAD_PHOTOS.md](./HOW_TO_UPLOAD_PHOTOS.md)** - Как загрузить фото товаров

### 📊 Отчеты и аналитика

- **[TODO_ROADMAP.md](./TODO_ROADMAP.md)** ⭐ - План доработки проекта (актуальные задачи)
- **[DOCUMENT_AUDIT_REPORT.md](./DOCUMENT_AUDIT_REPORT.md)** - Отчет об аудите документов (2025-11-01)
- **[TESTING_REPORT.md](./TESTING_REPORT.md)** - Отчет о тестировании системы
- **[AUDIT_REPORT.md](./AUDIT_REPORT.md)** - Отчет аудита системы
- **[ACTION_PLAN.md](./ACTION_PLAN.md)** - План действий

### 🔧 Справочники

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Быстрая справка

---

## 🎯 Ключевые правила системы

### Роли пользователей:
- **ADMIN** - Полный доступ ко всем функциям
- **COMPLECTATOR** - Создание КП, счетов, заказов; редактирование клиентов
- **EXECUTOR** - Работа с заказами поставщиков
- **GUEST** - Неавторизованный пользователь (только калькулятор)

### Важные ограничения:
- ✅ **COMPLECTATOR НЕ может создавать заказы поставщиков**
- ✅ **Пользователи могут удалять только созданные ими документы**
- ✅ **Счет может создаваться как из КП, так и напрямую из корзины**
- ✅ **COMPLECTATOR может редактировать данные всех клиентов**

### Типы документов:
**КП (Quote)** → **Счет (Invoice)** → **Заказ (Order)** → **Заказ поставщика (SupplierOrder)**

---

## 📁 Структура документации

### Актуальные документы (⭐ обязательны к прочтению):
1. **ARCHITECTURE.md** - полная архитектура
2. **AGENT_ONBOARDING.md** - инфраструктура и состояние
3. **SYSTEM_RULES_AND_PERMISSIONS.md** - бизнес-правила

### Для разработчиков:
- `DEVELOPMENT_WORKFLOW.md` - процесс разработки
- `LOCAL_DEVELOPMENT_SETUP.md` - локальная настройка
- `DEPLOY.md` - деплой
- `README-DEVELOPMENT.md` - руководство разработчика

### Для пользователей:
- `USER_INSTRUCTIONS.md` - инструкции
- `HOW_TO_UPLOAD_PHOTOS.md` - загрузка фото

### Справочные:
- `QUICK_REFERENCE.md` - быстрая справка
- `PROJECT_STRUCTURE.md` - структура проекта

---

## ✅ Проведенный аудит (2025-11-01)

### Удалены устаревшие документы:
- ❌ Отчеты о фиксах (выполнены):
  - `COMPREHENSIVE_DEDUPLICATION_FIX_REPORT.md`
  - `DEDUPLICATION_FINAL_REPORT.md`
  - `FINAL_DEDUPLICATION_REPORT.md`
  - `DOCUMENT_LINKS_FIX_REPORT.md`
  - `NOTIFICATION_FIX_REPORT.md`
  - `EXCEL_PERFORMANCE_OPTIMIZATION_REPORT.md`
  - `PHONE_VALIDATION_IMPLEMENTATION_REPORT.md`
  - `SYSTEM_RULES_IMPLEMENTATION_REPORT.md`
  - `DEPLOY_PREPARATION_REPORT.md`
- ❌ Дубликаты:
  - `notifications-final-logic.md` (дубликат)
  - `PUSH_TEST.md` (тестовый файл)
  - `SYSTEM_RULES_AND_PERMISSIONS.md` из корня (дубликат)

### Перемещены из корня в docs:
- ✅ `ARCHITECTURE.md` → `docs/ARCHITECTURE.md`
- ✅ `AGENT_ONBOARDING.md` → `docs/AGENT_ONBOARDING.md`
- ✅ `DEPLOY.md` → `docs/DEPLOY.md`
- ✅ `DEVELOPMENT_WORKFLOW.md` → `docs/DEVELOPMENT_WORKFLOW.md`
- ✅ `LOCAL_DEVELOPMENT_SETUP.md` → `docs/LOCAL_DEVELOPMENT_SETUP.md`
- ✅ `HOW_TO_UPLOAD_PHOTOS.md` → `docs/HOW_TO_UPLOAD_PHOTOS.md`
- ✅ `README_WORKFLOW.md` → `docs/README_WORKFLOW.md`

**Всего перемещено**: 7 документов

### Удалены из корня:
- ❌ `DEPLOYMENT_STATUS.md` (устаревший статус)

**Всего удалено**: 12 документов (9 отчетов о фиксах + 3 дубликата/тестовых)

---

## 📝 Планы на будущее

- Составить полный свод документов по проекту
- Обновить ссылки в корневом README.md
- Создать индексную страницу документации

---

**Последнее обновление**: 2025-11-01  
**Статус**: ✅ Аудит завершен, документы актуализированы
