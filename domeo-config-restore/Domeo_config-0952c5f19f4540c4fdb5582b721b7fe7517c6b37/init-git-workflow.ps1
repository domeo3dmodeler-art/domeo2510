# 🌿 Инициализация Git репозитория для безопасного workflow (PowerShell)
# Использование: .\init-git-workflow.ps1

Write-Host "🌿 Инициализация Git workflow..." -ForegroundColor Green

# Проверяем, что мы в правильной директории
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Запустите скрипт из корня проекта" -ForegroundColor Red
    exit 1
}

# Инициализируем Git если нужно
if (-not (Test-Path ".git")) {
    Write-Host "📦 Инициализируем Git репозиторий..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit: Domeo project setup"
}

# Создаем ветку develop если её нет
try {
    git show-ref --verify --quiet refs/heads/develop
    $developExists = $true
} catch {
    $developExists = $false
}

if (-not $developExists) {
    Write-Host "🌿 Создаем ветку develop..." -ForegroundColor Yellow
    git checkout -b develop
    git push -u origin develop
}

# Переключаемся на develop
git checkout develop

# Создаем .gitignore если его нет
if (-not (Test-Path ".gitignore")) {
    Write-Host "📝 Создаем .gitignore..." -ForegroundColor Yellow
    @"
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
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
}

# Добавляем .gitignore
git add .gitignore
git commit -m "Add .gitignore" -ErrorAction SilentlyContinue

# Создаем README для workflow
if (-not (Test-Path "README.md")) {
    Write-Host "📖 Создаем README.md..." -ForegroundColor Yellow
    @"
# 🏠 Domeo - Система конфигурации дверей

## 🚀 Быстрый старт

### Локальная разработка:
``````bash
# Windows
.\dev-safe.ps1

# Linux/Mac
./dev-safe.sh
``````

### Деплой на staging:
``````bash
./deploy-staging-safe.sh
``````

### Деплой на production:
``````bash
./deploy-production-safe.sh
``````

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
"@ | Out-File -FilePath "README.md" -Encoding UTF8
}

# Добавляем README
git add README.md
git commit -m "Add README with workflow documentation" -ErrorAction SilentlyContinue

Write-Host "✅ Git workflow инициализирован!" -ForegroundColor Green
Write-Host ""
Write-Host "🌿 Ветки:" -ForegroundColor Cyan
Write-Host "  - main (production)" -ForegroundColor White
Write-Host "  - develop (staging)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Следующие шаги:" -ForegroundColor Cyan
Write-Host "  1. git remote add origin <your-github-repo-url>" -ForegroundColor White
Write-Host "  2. git push -u origin main" -ForegroundColor White
Write-Host "  3. git push -u origin develop" -ForegroundColor White
Write-Host "  4. Настройте GitHub Actions secrets:" -ForegroundColor White
Write-Host "     - STAGING_HOST" -ForegroundColor Gray
Write-Host "     - STAGING_SSH_KEY" -ForegroundColor Gray
Write-Host "     - PROD_HOST" -ForegroundColor Gray
Write-Host "     - PROD_SSH_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Теперь можете создавать feature ветки:" -ForegroundColor Cyan
Write-Host "  git checkout -b feature/new-feature" -ForegroundColor White
