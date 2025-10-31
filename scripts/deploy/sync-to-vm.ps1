# Скрипт синхронизации изменений: локально -> git -> ВМ
# Использование: .\sync-to-vm.ps1 [коммит-сообщение]

param(
    [string]$CommitMessage = "chore: sync changes to VM"
)

$ErrorActionPreference = "Stop"
$VM_IP = "130.193.40.35"
$SSH_KEY = "C:\Users\petr2\.ssh\ssh-key-1760763840626"
$VM_PATH = "/opt/domeo"
$BRANCH = "develop"

Write-Host "🔄 Синхронизация изменений: локально -> git -> ВМ" -ForegroundColor Cyan
Write-Host ""

# Шаг 1: Проверка локальных изменений
Write-Host "📋 Шаг 1: Проверка локальных изменений..." -ForegroundColor Yellow
$status = git status --short
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "✅ Нет локальных изменений для коммита" -ForegroundColor Green
} else {
    Write-Host "📝 Найдены изменения:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    
    # Шаг 2: Добавление изменений
    Write-Host "📦 Шаг 2: Добавление изменений в staging..." -ForegroundColor Yellow
    git add -A
    Write-Host "✅ Изменения добавлены" -ForegroundColor Green
    Write-Host ""
    
    # Шаг 3: Коммит
    Write-Host "💾 Шаг 3: Создание коммита..." -ForegroundColor Yellow
    git commit -m $CommitMessage
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Коммит создан: $CommitMessage" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка при создании коммита" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Шаг 4: Отправка в git
Write-Host "☁️  Шаг 4: Отправка в origin/$BRANCH..." -ForegroundColor Yellow
git push origin $BRANCH
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Изменения отправлены в git" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка при отправке в git" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Шаг 5: Обновление на ВМ
Write-Host "🖥️  Шаг 5: Обновление на ВМ ($VM_IP)..." -ForegroundColor Yellow
$sshCmd = "cd $VM_PATH && git stash && git pull origin $BRANCH && git stash pop"
$result = ssh -i "$SSH_KEY" ubuntu@$VM_IP $sshCmd 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ВМ обновлена успешно" -ForegroundColor Green
    Write-Host $result
} else {
    Write-Host "❌ Ошибка при обновлении ВМ" -ForegroundColor Red
    Write-Host $result
    exit 1
}
Write-Host ""

Write-Host "✨ Синхронизация завершена успешно!" -ForegroundColor Green

