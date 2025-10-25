#!/bin/bash

# 🌿 Инициализация Git репозитория для безопасного workflow
# Использование: ./init-git-workflow.sh

set -e

echo "🌿 Инициализация Git workflow..."

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Запустите скрипт из корня проекта"
    exit 1
fi

# Инициализируем Git если нужно
if [ ! -d ".git" ]; then
    echo "📦 Инициализируем Git репозиторий..."
    git init
    git add .
    git commit -m "Initial commit: Domeo project setup"
fi

# Создаем ветку develop если её нет
if ! git show-ref --verify --quiet refs/heads/develop; then
    echo "🌿 Создаем ветку develop..."
    git checkout -b develop
    git push -u origin develop
fi

# Переключаемся на develop
git checkout develop

# Создаем .gitignore если его нет
if [ ! -f ".gitignore" ]; then
    echo "📝 Создаем .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/
build/

# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Backup files
*.backup.*
*.bak
*.tar.gz

# SSH keys
*.pem
*.key
staging_key
production_key

# Temporary files
tmp/
temp/
EOF
fi

# Добавляем .gitignore
git add .gitignore
git commit -m "Add .gitignore" || true

# Создаем README для workflow
if [ ! -f "README.md" ]; then
    echo "📖 Создаем README.md..."
    cat > README.md << 'EOF'
# 🏠 Domeo - Система конфигурации дверей

## 🚀 Быстрый старт

### Локальная разработка:
```bash
# Windows
.\dev-safe.ps1

# Linux/Mac
./dev-safe.sh
```

### Деплой на staging:
```bash
./deploy-staging-safe.sh
```

### Деплой на production:
```bash
./deploy-production-safe.sh
```

## 📋 Workflow

1. **Разработка** - создавайте feature ветки от `develop`
2. **Тестирование** - мержите в `develop` для деплоя на staging
3. **Production** - мержите `develop` в `main` и создавайте теги

## 🛡️ Безопасность

- Никогда не коммитьте напрямую в `main`
- Всегда тестируйте на staging перед production
- Используйте теги для production релизов

## 📚 Документация

- [Безопасный Workflow](SAFE_WORKFLOW.md)
- [GitHub Workflow](GITHUB_WORKFLOW.md)
EOF
fi

# Добавляем README
git add README.md
git commit -m "Add README with workflow documentation" || true

echo "✅ Git workflow инициализирован!"
echo ""
echo "🌿 Ветки:"
echo "  - main (production)"
echo "  - develop (staging)"
echo ""
echo "🚀 Следующие шаги:"
echo "  1. git remote add origin <your-github-repo-url>"
echo "  2. git push -u origin main"
echo "  3. git push -u origin develop"
echo "  4. Настройте GitHub Actions secrets:"
echo "     - STAGING_HOST"
echo "     - STAGING_SSH_KEY"
echo "     - PROD_HOST"
echo "     - PROD_SSH_KEY"
echo ""
echo "📋 Теперь можете создавать feature ветки:"
echo "  git checkout -b feature/new-feature"
