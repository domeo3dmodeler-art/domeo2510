# 📚 Документация системы

Эта папка содержит всю актуальную документацию по системе управления заказчиками и документами.

## 📋 Основные документы

### 🏗️ Система правил и архитектура
- **[SYSTEM_RULES_AND_PERMISSIONS.md](./SYSTEM_RULES_AND_PERMISSIONS.md)** - Полные правила работы с заказчиками и документами
- **[SYSTEM_FLOW_DIAGRAM.md](./SYSTEM_FLOW_DIAGRAM.md)** - Диаграммы и схемы процессов системы
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Практическое руководство по внедрению правил

### 🔧 Техническая документация
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Структура проекта
- **[README-DEVELOPMENT.md](./README-DEVELOPMENT.md)** - Инструкции для разработчиков
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Быстрая справка

### 📊 Отчеты и аналитика
- **[TESTING_REPORT.md](./TESTING_REPORT.md)** - Отчет о тестировании системы
- **[AUDIT_REPORT.md](./AUDIT_REPORT.md)** - Отчет аудита системы
- **[ACTION_PLAN.md](./ACTION_PLAN.md)** - План действий

### 🐛 Исправления и оптимизации
- **[COMPREHENSIVE_DEDUPLICATION_FIX_REPORT.md](./COMPREHENSIVE_DEDUPLICATION_FIX_REPORT.md)** - Исправление дедупликации
- **[DEDUPLICATION_FINAL_REPORT.md](./DEDUPLICATION_FIX_REPORT.md)** - Финальный отчет по дедупликации
- **[FINAL_DEDUPLICATION_REPORT.md](./FINAL_DEDUPLICATION_REPORT.md)** - Окончательный отчет
- **[DOCUMENT_LINKS_FIX_REPORT.md](./DOCUMENT_LINKS_FIX_REPORT.md)** - Исправление связей документов
- **[DOCUMENT_LINKS_LOGIC.md](./DOCUMENT_LINKS_LOGIC.md)** - Логика связей документов
- **[EXCEL_PERFORMANCE_OPTIMIZATION_REPORT.md](./EXCEL_PERFORMANCE_OPTIMIZATION_REPORT.md)** - Оптимизация Excel
- **[NOTIFICATION_FIX_REPORT.md](./NOTIFICATION_FIX_REPORT.md)** - Исправление уведомлений
- **[SYSTEM_RULES_IMPLEMENTATION_REPORT.md](./SYSTEM_RULES_IMPLEMENTATION_REPORT.md)** - Применение правил системы
- **[PHONE_VALIDATION_IMPLEMENTATION_REPORT.md](./PHONE_VALIDATION_IMPLEMENTATION_REPORT.md)** - Реализация валидации телефонов

### 🚀 Развертывание
- **[DEPLOY_PREPARATION_REPORT.md](./DEPLOY_PREPARATION_REPORT.md)** - Подготовка к развертыванию

### 👥 Пользовательские инструкции
- **[USER_INSTRUCTIONS.md](./USER_INSTRUCTIONS.md)** - Инструкции для пользователей

## 🎯 Ключевые правила системы

### Роли пользователей:
- **ADMIN** - Полный доступ ко всем функциям
- **COMPLECTATOR** - Создание КП, счетов, заказов; редактирование клиентов
- **EXECUTOR** - Работа с заказами поставщиков

### Важные ограничения:
- ✅ **COMPLECTATOR НЕ может создавать заказы поставщиков**
- ✅ **Пользователи могут удалять только созданные ими документы**
- ✅ **Счет может создаваться как из КП, так и напрямую из корзины**
- ✅ **COMPLECTATOR может редактировать данные всех клиентов**

### Типы документов:
- **КП (Quote)** → **Счет (Invoice)** → **Заказ (Order)** → **Заказ поставщика (SupplierOrder)**

## 📝 Статус документов

### Актуальные (нужно сохранить):
- SYSTEM_RULES_AND_PERMISSIONS.md
- SYSTEM_FLOW_DIAGRAM.md  
- IMPLEMENTATION_GUIDE.md
- PROJECT_STRUCTURE.md
- README-DEVELOPMENT.md
- USER_INSTRUCTIONS.md

### Требуют проверки:
- Все отчеты об исправлениях
- Отчеты о тестировании
- Планы действий

### Возможно устаревшие:
- Некоторые технические отчеты
- Дублирующиеся документы

---

**Последнее обновление**: 23.10.2025  
**Статус**: Требует ревизии и актуализации
