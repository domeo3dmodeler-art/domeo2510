# 🚀 PowerShell скрипт для деплоя на Yandex Cloud VM
# Использование: .\scripts\deploy-to-yandex.ps1 -VMIP "your-vm-ip"

param(
    [Parameter(Mandatory=$true)]
    [string]$VMIP,
    
    [string]$SSHKey = "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347",
    [string]$Username = "ubuntu",
    [switch]$SkipCleanup,
    [switch]$SkipUpload
)

# Настройка цветов
$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" "Red"
    throw $Message
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️ $Message" "Yellow"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ️ $Message" "Cyan"
}

# Проверка подключения к VM
function Test-VMConnection {
    param([string]$IP, [string]$Key, [string]$User)
    
    Write-Info "Проверяем подключение к VM: $IP"
    
    try {
        $result = ssh -i $Key -o ConnectTimeout=10 -o StrictHostKeyChecking=no $User@$IP "echo 'Connection successful'" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Подключение к VM успешно"
            return $true
        } else {
            Write-Error "Не удалось подключиться к VM"
            return $false
        }
    } catch {
        Write-Error "Ошибка подключения: $($_.Exception.Message)"
        return $false
    }
}

# Очистка VM
function Clear-VM {
    param([string]$IP, [string]$Key, [string]$User)
    
    if ($SkipCleanup) {
        Write-Warning "Пропускаем очистку VM"
        return
    }
    
    Write-Info "Выполняем полную очистку VM..."
    
    # Загружаем скрипт очистки
    $cleanupScript = Get-Content "scripts/setup-yandex-vm.sh" -Raw
    
    # Выполняем очистку на VM
    $cleanupScript | ssh -i $Key -o StrictHostKeyChecking=no $User@$IP "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "VM очищена и настроена"
    } else {
        Write-Error "Ошибка при очистке VM"
    }
}

# Создание архива проекта
function New-ProjectArchive {
    Write-Info "Создаем архив проекта..."
    
    $excludeItems = @(
        "node_modules",
        ".next",
        ".git",
        "backups",
        "logs",
        "tmp",
        "*.log",
        "*.tmp"
    )
    
    $archiveName = "domeo-project-$(Get-Date -Format 'yyyyMMdd_HHmmss').tar.gz"
    
    # Создаем временный список файлов для архивации
    $tempFile = "temp-files.txt"
    Get-ChildItem -Recurse | Where-Object {
        $item = $_
        $shouldExclude = $false
        foreach ($exclude in $excludeItems) {
            if ($item.FullName -like "*$exclude*") {
                $shouldExclude = $true
                break
            }
        }
        return -not $shouldExclude
    } | ForEach-Object { $_.FullName } | Out-File $tempFile -Encoding UTF8
    
    # Создаем архив (используем tar если доступен, иначе PowerShell)
    if (Get-Command tar -ErrorAction SilentlyContinue) {
        tar -czf $archiveName -T $tempFile
    } else {
        Write-Warning "tar не найден, используем PowerShell архивацию"
        Compress-Archive -Path @(Get-Content $tempFile) -DestinationPath "$archiveName.zip" -Force
        $archiveName = "$archiveName.zip"
    }
    
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    
    Write-Success "Архив создан: $archiveName"
    return $archiveName
}

# Загрузка архива на VM
function Send-ProjectToVM {
    param([string]$ArchivePath, [string]$IP, [string]$Key, [string]$User)
    
    if ($SkipUpload) {
        Write-Warning "Пропускаем загрузку файлов"
        return
    }
    
    Write-Info "Загружаем проект на VM..."
    
    # Загружаем архив
    scp -i $Key -o StrictHostKeyChecking=no $ArchivePath $User@$IP:/tmp/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Архив загружен на VM"
    } else {
        Write-Error "Ошибка загрузки архива"
    }
}

# Распаковка и настройка на VM
function Setup-ProjectOnVM {
    param([string]$ArchiveName, [string]$IP, [string]$Key, [string]$User)
    
    Write-Info "Настраиваем проект на VM..."
    
    $setupCommands = @"
# Переходим в директорию приложения
cd /opt/domeo

# Удаляем старые файлы
rm -rf *

# Распаковываем архив
tar -xzf /tmp/$ArchiveName --strip-components=1

# Удаляем архив
rm /tmp/$ArchiveName

# Устанавливаем права
chown -R ubuntu:ubuntu /opt/domeo
chmod +x scripts/*.sh

# Создаем необходимые директории
mkdir -p uploads
mkdir -p logs
mkdir -p backups

# Устанавливаем права на директории
chown -R ubuntu:ubuntu uploads logs backups

echo "Project setup completed"
"@
    
    $setupCommands | ssh -i $Key -o StrictHostKeyChecking=no $User@$IP "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Проект настроен на VM"
    } else {
        Write-Error "Ошибка настройки проекта"
    }
}

# Настройка переменных окружения на VM
function Set-EnvironmentOnVM {
    param([string]$IP, [string]$Key, [string]$User)
    
    Write-Info "Настраиваем переменные окружения на VM..."
    
    $envCommands = @"
# Создаем production .env файл
cd /opt/domeo

# Копируем пример
cp env.example .env.production

# Настраиваем базовые переменные
sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env.production
sed -i 's/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/domeo:your_password@db:5432\/domeo/' .env.production
sed -i 's/NEXTAUTH_URL=.*/NEXTAUTH_URL=http:\/\/$VMIP/' .env.production

# Генерируем случайный секрет
SECRET=\$(openssl rand -base64 32)
sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\$SECRET/" .env.production

echo "Environment configured"
"@
    
    $envCommands | ssh -i $Key -o StrictHostKeyChecking=no $User@$IP "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Переменные окружения настроены"
    } else {
        Write-Warning "Ошибка настройки переменных окружения"
    }
}

# Запуск приложения на VM
function Start-ApplicationOnVM {
    param([string]$IP, [string]$Key, [string]$User)
    
    Write-Info "Запускаем приложение на VM..."
    
    $startCommands = @"
cd /opt/domeo

# Останавливаем старые контейнеры
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# Собираем и запускаем
docker-compose -f docker-compose.production.yml up -d --build

# Ждем запуска
sleep 30

# Проверяем статус
docker-compose -f docker-compose.production.yml ps

echo "Application started"
"@
    
    $startCommands | ssh -i $Key -o StrictHostKeyChecking=no $User@$IP "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Приложение запущено на VM"
    } else {
        Write-Error "Ошибка запуска приложения"
    }
}

# Проверка работоспособности
function Test-ApplicationOnVM {
    param([string]$IP)
    
    Write-Info "Проверяем работоспособность приложения..."
    
    # Ждем запуска
    Start-Sleep -Seconds 10
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://$IP:3000/api/health" -Method GET -TimeoutSec 5
            if ($response.StatusCode -eq 204) {
                Write-Success "Приложение работает! Health check пройден"
                break
            }
        } catch {
            Write-Info "Попытка $attempt/$maxAttempts : приложение еще не готово..."
            Start-Sleep -Seconds 5
            $attempt++
        }
    }
    
    if ($attempt -gt $maxAttempts) {
        Write-Error "Приложение не отвечает после $maxAttempts попыток"
    }
    
    # Дополнительные проверки
    try {
        Invoke-WebRequest -Uri "http://$IP:3000" -Method GET -TimeoutSec 5 | Out-Null
        Write-Success "Веб-интерфейс доступен"
    } catch {
        Write-Warning "Веб-интерфейс недоступен"
    }
}

# Основная функция
function Main {
    Write-ColorOutput "🚀 Начинаем деплой на Yandex Cloud VM: $VMIP" "Magenta"
    
    # Проверяем наличие SSH ключа
    if (-not (Test-Path $SSHKey)) {
        Write-Error "SSH ключ не найден: $SSHKey"
    }
    
    # Проверяем подключение
    if (-not (Test-VMConnection $VMIP $SSHKey $Username)) {
        Write-Error "Не удалось подключиться к VM"
    }
    
    # Очищаем VM
    Clear-VM $VMIP $SSHKey $Username
    
    # Создаем архив
    $archiveName = New-ProjectArchive
    
    # Загружаем на VM
    Send-ProjectToVM $archiveName $VMIP $SSHKey $Username
    
    # Настраиваем проект
    Setup-ProjectOnVM $archiveName $VMIP $SSHKey $Username
    
    # Настраиваем окружение
    Set-EnvironmentOnVM $VMIP $SSHKey $Username
    
    # Запускаем приложение
    Start-ApplicationOnVM $VMIP $SSHKey $Username
    
    # Проверяем работоспособность
    Test-ApplicationOnVM $VMIP
    
    # Удаляем локальный архив
    Remove-Item $archiveName -ErrorAction SilentlyContinue
    
    Write-Success "Деплой завершен успешно!"
    Write-Success "Приложение доступно по адресу: http://$VMIP:3000"
    Write-Success "Статус: http://$VMIP:3000/api/health"
}

# Запуск основной функции
try {
    Main
} catch {
    Write-Error "Произошла ошибка: $($_.Exception.Message)"
    exit 1
}
