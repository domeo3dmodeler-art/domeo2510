# 🚀 Шпаргалка по Workflow Domeo

## 🌐 Среды
- **Production**: `http://130.193.40.35:3000` (рабочая)
- **Staging**: `http://89.169.189.66:3001` (тестовая)

## 🔄 Основные команды

### **Разработка**
```bash
npm run dev                    # Локальная разработка
npm run git:feature           # Создать feature ветку
npm run lint                  # Проверить код
```

### **Деплой**
```bash
npm run deploy:staging:safe   # Деплой на staging
npm run deploy:prod:safe      # Деплой на production (ТОЛЬКО после тестирования!)
```

### **Синхронизация данных**
```bash
npm run sync:data production staging    # Копировать данные с prod на staging
npm run sync:data staging production    # Копировать данные со staging на prod
```

### **Мониторинг**
```bash
npm run health:staging        # Проверить staging
npm run health:prod          # Проверить production
```

## ⚠️ Правила безопасности

1. **НИКОГДА не изменяйте production VM напрямую**
2. **ВСЕГДА тестируйте на staging перед production**
3. **Используйте только безопасные скрипты для деплоя**

## 🚨 Экстренные команды

```bash
npm run rollback:prod         # Откат production
```

## 📞 Быстрые ссылки

- **Production**: http://130.193.40.35:3000
- **Staging**: http://89.169.189.66:3001
- **Документация**: DEVELOPMENT_WORKFLOW_FINAL.md
