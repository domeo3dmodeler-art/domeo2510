@echo off
echo Setting up staging VM: 89.169.189.66

echo.
echo Step 1: Testing connection...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "echo Connection OK"

if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to staging VM
    echo Please check:
    echo   - SSH key staging_key exists
    echo   - VM is accessible at 89.169.189.66
    echo   - Firewall allows SSH (port 22)
    pause
    exit /b 1
)

echo.
echo Step 2: Setting up VM...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "sudo apt update && sudo apt upgrade -y"

echo.
echo Step 3: Installing Node.js...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"

echo.
echo Step 4: Installing PM2...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "sudo npm install -g pm2"

echo.
echo Step 5: Creating project directory...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "sudo mkdir -p /opt/domeo-staging && sudo chown ubuntu:ubuntu /opt/domeo-staging"

echo.
echo Step 6: Configuring firewall...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "sudo ufw allow 22 && sudo ufw allow 3001 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable"

echo.
echo Step 7: Creating project archive...
tar -czf staging-project.tar.gz --exclude="node_modules" --exclude=".next" --exclude="uploads" --exclude="*.db" --exclude="*.log" --exclude=".env" --exclude="production_key" --exclude="staging_key" .

echo.
echo Step 8: Uploading project...
scp -i staging_key -o StrictHostKeyChecking=no staging-project.tar.gz ubuntu@89.169.189.66:/tmp/

echo.
echo Step 9: Extracting project on VM...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "cd /opt/domeo-staging && tar -xzf /tmp/staging-project.tar.gz && rm /tmp/staging-project.tar.gz"

echo.
echo Step 10: Setting up staging environment...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "cd /opt/domeo-staging && cat > .env << 'ENVEOF'
NODE_ENV=staging
NEXT_PUBLIC_BASE_URL=http://89.169.189.66:3001
DATABASE_URL=file:./staging.db
JWT_SECRET=staging-jwt-secret-key
YANDEX_ACCESS_KEY_ID=your-access-key
YANDEX_SECRET_ACCESS_KEY=your-secret-key
YANDEX_BUCKET_NAME=domeo-staging
YANDEX_REGION=ru-central1
PORT=3001
ENVEOF"

echo.
echo Step 11: Installing dependencies...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "cd /opt/domeo-staging && npm install"

echo.
echo Step 12: Building project...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "cd /opt/domeo-staging && npm run build:staging"

echo.
echo Step 13: Creating systemd service...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "sudo tee /etc/systemd/system/domeo-staging.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Domeo Staging Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/domeo-staging
Environment=NODE_ENV=staging
ExecStart=/usr/bin/npm run start:staging
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF"

echo.
echo Step 14: Starting staging service...
ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "sudo systemctl daemon-reload && sudo systemctl enable domeo-staging && sudo systemctl start domeo-staging"

echo.
echo Step 15: Checking health...
timeout /t 15 /nobreak > nul
curl -f http://89.169.189.66:3001/api/health

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Staging VM setup completed!
    echo.
    echo Information:
    echo   Staging URL: http://89.169.189.66:3001
    echo   Path: /opt/domeo-staging
    echo   Service: domeo-staging
    echo.
    echo Management:
    echo   Status: ssh -i staging_key ubuntu@89.169.189.66 "sudo systemctl status domeo-staging"
    echo   Logs:   ssh -i staging_key ubuntu@89.169.189.66 "sudo journalctl -u domeo-staging -f"
    echo   Restart: ssh -i staging_key ubuntu@89.169.189.66 "sudo systemctl restart domeo-staging"
) else (
    echo.
    echo WARNING: Health check failed, checking logs...
    ssh -i staging_key -o StrictHostKeyChecking=no ubuntu@89.169.189.66 "sudo journalctl -u domeo-staging -n 20"
)

echo.
echo Cleaning up...
del staging-project.tar.gz

echo.
echo Setup completed!
pause
