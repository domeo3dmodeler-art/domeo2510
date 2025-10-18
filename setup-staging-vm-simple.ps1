# Setup Staging VM (PowerShell)
# Usage: .\setup-staging-vm-simple.ps1

param(
    [string]$StagingHost = "89.169.189.66",
    [string]$StagingUser = "ubuntu",
    [string]$StagingPath = "/opt/domeo-staging"
)

Write-Host "Setting up staging VM: $StagingHost" -ForegroundColor Green

# Check SSH key
if (-not (Test-Path "staging_key")) {
    Write-Host "ERROR: SSH key staging_key not found" -ForegroundColor Red
    Write-Host "Copy private SSH key to staging_key file" -ForegroundColor Yellow
    exit 1
}

Write-Host "Connecting to staging VM: $StagingHost" -ForegroundColor Yellow

try {
    # Test connection
    Write-Host "Testing connection..." -ForegroundColor Yellow
    $testConnection = ssh -i staging_key -o ConnectTimeout=10 -o StrictHostKeyChecking=no $StagingUser@$StagingHost "echo 'Connection OK'"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot connect to staging VM"
    }
    
    Write-Host "Connection successful" -ForegroundColor Green
    
    # Setup VM
    Write-Host "Setting up staging VM..." -ForegroundColor Yellow
    ssh -i staging_key -o StrictHostKeyChecking=no $StagingUser@$StagingHost @"
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Create project directory
sudo mkdir -p $StagingPath
sudo chown $StagingUser:$StagingUser $StagingPath

# Configure firewall
sudo ufw allow 22
sudo ufw allow 3001
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "Staging VM configured!"
"@

    # Copy project
    Write-Host "Copying project to staging VM..." -ForegroundColor Yellow
    
    # Create archive
    $tempArchive = "staging-project.tar.gz"
    Write-Host "Creating project archive..." -ForegroundColor Yellow
    
    # Use tar to create archive (exclude unnecessary files)
    tar -czf $tempArchive --exclude="node_modules" --exclude=".next" --exclude="uploads" --exclude="*.db" --exclude="*.log" --exclude=".env" --exclude="production_key" --exclude="staging_key" .
    
    # Upload archive
    Write-Host "Uploading archive to VM..." -ForegroundColor Yellow
    scp -i staging_key -o StrictHostKeyChecking=no $tempArchive $StagingUser@${StagingHost}:/tmp/
    
    # Extract on VM
    Write-Host "Extracting project on VM..." -ForegroundColor Yellow
    ssh -i staging_key -o StrictHostKeyChecking=no $StagingUser@$StagingHost @"
cd $StagingPath
tar -xzf /tmp/staging-project.tar.gz
rm /tmp/staging-project.tar.gz
"@
    
    # Setup staging environment
    Write-Host "Setting up staging environment..." -ForegroundColor Yellow
    ssh -i staging_key -o StrictHostKeyChecking=no $StagingUser@$StagingHost @"
cd $StagingPath

# Create staging .env file
cat > .env << 'ENVEOF'
# Staging Environment
NODE_ENV=staging
NEXT_PUBLIC_BASE_URL=http://$StagingHost:3001

# Database
DATABASE_URL="file:./staging.db"

# JWT
JWT_SECRET="staging-jwt-secret-key-change-in-production"

# File Storage
YANDEX_ACCESS_KEY_ID="your-access-key"
YANDEX_SECRET_ACCESS_KEY="your-secret-key"
YANDEX_BUCKET_NAME="domeo-staging"
YANDEX_REGION="ru-central1"

# Port
PORT=3001
ENVEOF

# Install dependencies
npm install

# Build project
npm run build:staging

# Create systemd service
sudo tee /etc/systemd/system/domeo-staging.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Domeo Staging Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$StagingPath
Environment=NODE_ENV=staging
ExecStart=/usr/bin/npm run start:staging
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable domeo-staging
sudo systemctl start domeo-staging

echo "Staging service started!"
"@

    # Check health
    Write-Host "Checking staging health..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    try {
        $healthCheck = Invoke-WebRequest -Uri "http://$StagingHost:3001/api/health" -TimeoutSec 10
        if ($healthCheck.StatusCode -eq 200) {
            Write-Host "Staging is working correctly!" -ForegroundColor Green
        } else {
            throw "Health check failed"
        }
    } catch {
        Write-Host "Staging not responding, checking logs..." -ForegroundColor Red
        ssh -i staging_key -o StrictHostKeyChecking=no $StagingUser@$StagingHost "sudo journalctl -u domeo-staging -n 20"
    }
    
    # Cleanup
    Remove-Item $tempArchive -Force -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "Staging VM setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Information:" -ForegroundColor Cyan
    Write-Host "  Staging URL: http://$StagingHost:3001" -ForegroundColor White
    Write-Host "  Path: $StagingPath" -ForegroundColor White
    Write-Host "  Service: domeo-staging" -ForegroundColor White
    Write-Host ""
    Write-Host "Management:" -ForegroundColor Cyan
    Write-Host "  Status: ssh -i staging_key $StagingUser@$StagingHost 'sudo systemctl status domeo-staging'" -ForegroundColor White
    Write-Host "  Logs:   ssh -i staging_key $StagingUser@$StagingHost 'sudo journalctl -u domeo-staging -f'" -ForegroundColor White
    Write-Host "  Restart: ssh -i staging_key $StagingUser@$StagingHost 'sudo systemctl restart domeo-staging'" -ForegroundColor White
    
} catch {
    Write-Host "Error setting up staging VM: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  - SSH key staging_key exists and has correct permissions" -ForegroundColor White
    Write-Host "  - VM is accessible at $StagingHost" -ForegroundColor White
    Write-Host "  - User $StagingUser has sudo rights" -ForegroundColor White
}
