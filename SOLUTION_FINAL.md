# ✅ РЕШЕНИЕ: Prisma Engines без интернета

## 🎯 ЧТО СДЕЛАЛИ:

1. ✅ **Скачали Prisma engines с ВМ** (где уже всё работает)
2. ✅ **Установили локально** в `node_modules/.prisma/client/`
3. ✅ **Проверили что engines есть:**
   - `query_engine-windows.dll.node` (для Windows)
   - `libquery_engine-linux-musl.so.node` (для Alpine Linux)
   - `libquery_engine-linux-musl-openssl-3.0.x.so.node` (для открытого SSL)

## 📦 ВАРИАНТ СОХРАНЕНИЯ ENGINES:

### Вариант А: Хранить в Git (если нужна версионность)

```bash
# 1. Добавить engines в Git
git add node_modules/.prisma/client/*.node
git commit -m "Add Prisma engines for offline development"
git push

# 2. Другие разработчики просто:
git pull
# Engines уже есть, не нужно скачивать!
```

### Вариант Б: Коммит готового Prisma (рекомендую)

```bash
# 1. Включить engines в Git
# Добавить в .gitignore НЕ игнорировать:
# node_modules/.prisma/client/

# 2. Закоммитить
git add node_modules/.prisma/
git commit -m "Add Prisma engines"
git push
```

### Вариант В: Общий архив (для команды)

```bash
# 1. Создать архив (когда настаёт срок)
tar -czf prisma-engines-backup.tgz node_modules/.prisma/

# 2. Выложить в общее хранилище (Git LFS, Artifactory)
git lfs track "*.tgz"
git add prisma-engines-backup.tgz
git commit -m "Backup Prisma engines"
```

---

## 🚀 РАБОЧИЙ ПРОЦЕСС:

### Первая установка (однажды):

```bash
# 1. Скопировать engines с ВМ
ssh ubuntu@130.193.40.35 "docker exec domeo-staging-app tar -czf - -C /app node_modules/.prisma" > /tmp/prisma.tgz
scp ubuntu@130.193.40.35:/tmp/prisma.tgz ./
tar -xzf prisma.tgz

# 2. Engines теперь есть локально!
```

### Ежедневная работа:

```bash
# 1. Запустить БД
docker compose -f docker-compose.local.yml up -d

# 2. Разрабатывать
npm run dev

# Engines уже есть, всё работает! ✅
```

---

## 📝 ПРАКТИЧЕСКОЕ ИСПОЛЬЗОВАНИЕ:

### Если нужно обновить Prisma:

```bash
# Вариант 1: С ВМ
ssh ubuntu@130.193.40.35 "cd /opt/domeo && git pull"
ssh ubuntu@130.193.40.35 "docker exec domeo-staging-app npm run prisma:generate"

# Скопировать обратно
scp ubuntu@130.193.40.35:/tmp/prisma-engines.tgz ./
tar -xzf prisma-engines.tgz
```

### Если нужна новая версия Prisma:

```bash
# 1. На ВМ (где есть интернет)
ssh ubuntu@130.193.40.35
cd /opt/domeo
npm update @prisma/client prisma
npm run prisma:generate

# 2. Скопировать обратно
scp ubuntu@130.193.40.35:... ./prisma-new.tgz
tar -xzf prisma-new.tgz
```

---

## ✨ ИТОГ:

**Теперь у вас:**
- ✅ Prisma engines работают локально БЕЗ интернета
- ✅ Не нужно каждый раз скачивать
- ✅ Можно разрабатывать офлайн
- ✅ Engines можно обновлять с ВМ

**Файлы:**
- `node_modules/.prisma/client/` - engines
- `prisma-engines-backup.tgz` - backup для команды

**Готово! 🎉**

