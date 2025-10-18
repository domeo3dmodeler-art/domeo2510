# PowerShell скрипт для деплоя на Yandex Cloud VM
param(
    [Parameter(Mandatory=$true)]
    [string]$VMIP,
    
    [string]$SSHKey = "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347",
    [string]$Username = "ubuntu"
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Red
    throw $Message
}

# Проверка подключения к VM
Write-Info "Проверяем подключение к VM: $VMIP"
try {
    $result = ssh -i $SSHKey -o ConnectTimeout=10 -o StrictHostKeyChecking=no $Username@$VMIP "echo 'Connection successful'"
    Write-Success "Подключение к VM успешно"
} catch {
    Write-Error "Не удалось подключиться к VM"
}

# Очистка и настройка VM
Write-Info "Выполняем полную очистку и настройку VM..."
$cleanupScript = @"
# Обновление системы
sudo apt update -y
sudo apt upgrade -y

# Остановка сервисов
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl stop docker 2>/dev/null || true

# Удаление старых пакетов
sudo apt remove --purge -y nginx docker.io docker-ce docker-ce-cli containerd.io docker-compose postgresql nodejs npm 2>/dev/null || true

# Очистка файлов
sudo rm -rf /etc/nginx /var/www /var/lib/docker /home/ubuntu/.docker /home/ubuntu/.npm

# Установка необходимых пакетов
sudo apt install -y curl wget git unzip htop vim nano ufw fail2ban

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Настройка файрвола
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

# Создание директории для приложения
sudo mkdir -p /opt/domeo
sudo chown ubuntu:ubuntu /opt/domeo

echo "VM setup completed"
"@

$cleanupScript | ssh -i $SSHKey -o StrictHostKeyChecking=no $Username@$VMIP "bash"

if ($LASTEXITCODE -eq 0) {
    Write-Success "VM очищена и настроена"
} else {
    Write-Error "Ошибка при настройке VM"
}

# Создание архива проекта
Write-Info "Создаем архив проекта..."
$excludeItems = @("node_modules", ".next", ".git", "backups", "logs", "tmp")
$archiveName = "domeo-project-$(Get-Date -Format 'yyyyMMdd_HHmmss').tar.gz"

# Создаем список файлов для архивации
$filesToArchive = @()
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
} | ForEach-Object { $filesToArchive += $_.FullName }

# Создаем архив
if (Get-Command tar -ErrorAction SilentlyContinue) {
    $filesToArchive | ForEach-Object { $_ } | Out-File "temp-files.txt" -Encoding UTF8
    tar -czf $archiveName -T temp-files.txt
    Remove-Item "temp-files.txt" -ErrorAction SilentlyContinue
} else {
    Compress-Archive -Path $filesToArchive -DestinationPath "$archiveName.zip" -Force
    $archiveName = "$archiveName.zip"
}

Write-Success "Архив создан: $archiveName"

# Загрузка архива на VM
Write-Info "Загружаем проект на VM..."
scp -i $SSHKey -o StrictHostKeyChecking=no $archiveName $Username@$VMIP:/tmp/

if ($LASTEXITCODE -eq 0) {
    Write-Success "Архив загружен на VM"
} else {
    Write-Error "Ошибка загрузки архива"
}

# Распаковка и настройка на VM
Write-Info "Настраиваем проект на VM..."
$setupCommands = @"
cd /opt/domeo
rm -rf *
tar -xzf /tmp/$archiveName --strip-components=1
rm /tmp/$archiveName
chown -R ubuntu:ubuntu /opt/domeo
chmod +x scripts/*.sh
mkdir -p uploads logs backups
chown -R ubuntu:ubuntu uploads logs backups
echo "Project setup completed"
"@

$setupCommands | ssh -i $SSHKey -o StrictHostKeyChecking=no $Username@$VMIP "bash"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Проект настроен на VM"
} else {
    Write-Error "Ошибка настройки проекта"
}

# Настройка переменных окружения
Write-Info "Настраиваем переменные окружения..."
$envCommands = @"
cd /opt/domeo
cp env.example .env.production
sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env.production
sed -i 's/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/domeo:your_password@db:5432\/domeo/' .env.production
sed -i 's/NEXTAUTH_URL=.*/NEXTAUTH_URL=http:\/\/$VMIP/' .env.production
SECRET=\$(openssl rand -base64 32)
sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\$SECRET/" .env.production
echo "Environment configured"
"@

$envCommands | ssh -i $SSHKey -o StrictHostKeyChecking=no $Username@$VMIP "bash"

# Запуск приложения
Write-Info "Запускаем приложение на VM..."
$startCommands = @"
cd /opt/domeo
docker-compose -f docker-compose.production.yml down 2>/dev/null || true
docker-compose -f docker-compose.production.yml up -d --build
sleep 30
docker-compose -f docker-compose.production.yml ps
echo "Application started"
"@

$startCommands | ssh -i $SSHKey -o StrictHostKeyChecking=no $Username@$VMIP "bash"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Приложение запущено на VM"
} else {
    Write-Error "Ошибка запуска приложения"
}

# Проверка работоспособности
Write-Info "Проверяем работоспособность приложения..."
Start-Sleep -Seconds 10

$maxAttempts = 30
$attempt = 1

while ($attempt -le $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://$VMIP:3000/api/health" -Method GET -TimeoutSec 5
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
    Invoke-WebRequest -Uri "http://$VMIP:3000" -Method GET -TimeoutSec 5 | Out-Null
    Write-Success "Веб-интерфейс доступен"
} catch {
    Write-Error "Веб-интерфейс недоступен"
}

# Удаляем локальный архив
Remove-Item $archiveName -ErrorAction SilentlyContinue

Write-Success "Деплой завершен успешно!"
Write-Success "Приложение доступно по адресу: http://$VMIP:3000"
Write-Success "Статус: http://$VMIP:3000/api/health"
