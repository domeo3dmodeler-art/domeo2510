# 🚀 Руководство по развертыванию на Yandex Cloud

## 📋 Подготовка

### 1. Создание Managed PostgreSQL
```bash
# Создание кластера PostgreSQL
yc managed-postgresql cluster create \
  --name domeo-doors-db \
  --environment production \
  --network-name default \
  --host zone-id=ru-central1-a,subnet-id=<subnet-id> \
  --resource-preset s2.micro \
  --disk-size 20 \
  --user name=domeo_user,password=<password> \
  --database name=domeo_doors,owner=domeo_user
```

### 2. Создание Compute Instance
```bash
# Создание виртуальной машины
yc compute instance create \
  --name domeo-doors-app \
  --zone ru-central1-a \
  --cores 2 \
  --memory 4GB \
  --image-family ubuntu-2004-lts \
  --image-project ubuntu-cloud \
  --create-boot-disk size=20GB \
  --ssh-key ~/.ssh/id_rsa.pub
```

## 🔧 Настройка сервера

### 1. Подключение к серверу
```bash
ssh ubuntu@<server-ip>
```

### 2. Установка Docker и Docker Compose
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Клонирование проекта
```bash
# Клонирование репозитория
git clone <your-repo-url> domeo-doors
cd domeo-doors/app

# Копирование переменных окружения
cp env.yandex.example .env.local
```

### 4. Настройка переменных окружения
```bash
# Редактирование .env.local
nano .env.local
```

Заполните следующие переменные:
```env
# База данных PostgreSQL (Yandex Managed PostgreSQL)
DATABASE_URL=postgresql://domeo_user:password@c-c9q...:6432/domeo_doors

# JWT секрет для авторизации
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Настройки приложения
NODE_ENV=production
PORT=3000

# Домен приложения
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🐳 Развертывание с Docker

### 1. Сборка и запуск
```bash
# Сборка образа
docker build -f Dockerfile.yandex -t domeo-doors .

# Запуск контейнера
docker run -d \
  --name domeo-doors-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  domeo-doors
```

### 2. Или с Docker Compose
```bash
# Запуск с Docker Compose
docker-compose -f docker-compose.yandex.yml up -d
```

## 🌐 Настройка домена и SSL

### 1. Настройка Nginx (опционально)
```bash
# Установка Nginx
sudo apt install nginx -y

# Создание конфигурации
sudo nano /etc/nginx/sites-available/domeo-doors
```

Конфигурация Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активация сайта
sudo ln -s /etc/nginx/sites-available/domeo-doors /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. SSL сертификат с Let's Encrypt
```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
sudo certbot --nginx -d your-domain.com
```

## 📊 Мониторинг и логи

### 1. Просмотр логов
```bash
# Логи приложения
docker logs domeo-doors-app -f

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Мониторинг ресурсов
```bash
# Использование ресурсов
htop
df -h
free -h
```

## 🔄 Обновление приложения

### 1. Обновление кода
```bash
# Остановка контейнера
docker stop domeo-doors-app
docker rm domeo-doors-app

# Обновление кода
git pull origin main

# Пересборка и запуск
docker build -f Dockerfile.yandex -t domeo-doors .
docker run -d \
  --name domeo-doors-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  domeo-doors
```

## 🛡️ Безопасность

### 1. Настройка файрвола
```bash
# Разрешение только необходимых портов
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Регулярные обновления
```bash
# Автоматические обновления безопасности
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 📈 Масштабирование

### 1. Горизонтальное масштабирование
```bash
# Запуск нескольких экземпляров
docker run -d --name domeo-doors-app-1 -p 3001:3000 --env-file .env.local domeo-doors
docker run -d --name domeo-doors-app-2 -p 3002:3000 --env-file .env.local domeo-doors
```

### 2. Load Balancer
Настройте Yandex Application Load Balancer для распределения нагрузки между экземплярами.

## ✅ Проверка развертывания

### 1. Проверка здоровья
```bash
# Проверка API
curl http://localhost:3000/api/health

# Проверка базы данных
curl http://localhost:3000/api/categories
```

### 2. Тестирование функционала
1. Откройте https://your-domain.com
2. Проверьте админку: https://your-domain.com/admin
3. Протестируйте импорт прайса
4. Проверьте загрузку фото

---

## 🎉 Готово!

Ваше приложение развернуто на Yandex Cloud и готово к использованию!

### 📞 Поддержка
- Документация Yandex Cloud: https://cloud.yandex.ru/docs
- Логи приложения: `docker logs domeo-doors-app`
- Мониторинг: Yandex Cloud Monitoring
