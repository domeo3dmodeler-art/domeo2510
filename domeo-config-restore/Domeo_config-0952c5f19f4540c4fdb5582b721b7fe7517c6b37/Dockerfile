# Multi-stage build для оптимизации размера образа
FROM node:20-alpine AS deps
WORKDIR /app

# Устанавливаем зависимости для сборки
RUN apk add --no-cache libc6-compat

# Копируем файлы зависимостей
COPY package.json package-lock.json* ./

# Устанавливаем зависимости
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Стадия сборки
FROM node:20-alpine AS builder
WORKDIR /app

# Устанавливаем зависимости для сборки
RUN apk add --no-cache libc6-compat

# Копируем файлы зависимостей
COPY package.json package-lock.json* ./

# Устанавливаем все зависимости (включая dev)
RUN npm ci --legacy-peer-deps

# Копируем исходный код
COPY . .

# Генерируем Prisma клиент
RUN npx prisma generate

# Собираем приложение
RUN npm run build:prod

# Финальная стадия
FROM node:20-alpine AS runner
WORKDIR /app

# Устанавливаем системные зависимости
RUN apk add --no-cache libc6-compat openssl

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем production зависимости
COPY --from=deps /app/node_modules ./node_modules

# Копируем собранное приложение
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Устанавливаем права доступа
RUN chown -R nextjs:nodejs /app
USER nextjs

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Открываем порт
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Запускаем приложение
CMD ["node", "server.js"]
