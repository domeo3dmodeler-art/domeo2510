# Safe deployment to staging (PowerShell)
# Usage: .\deploy-staging-safe.ps1

param(
    [string]$StagingHost = "89.169.189.66",
    [string]$StagingUser = "ubuntu",
    [string]$StagingPath = "/opt/domeo-staging"
)

Write-Host "Safe deployment to staging..." -ForegroundColor Green

# Check SSH key
if (-not (Test-Path "staging_key")) {
    Write-Host "SSH key staging_key not found" -ForegroundColor Red
    Write-Host "Create staging_key file with private key for staging VM access" -ForegroundColor Yellow
    exit 1
}

# Check connection to staging
Write-Host "Checking connection to staging..." -ForegroundColor Yellow
try {
    $testConnection = ssh -i "staging_key" -o ConnectTimeout=10 -o StrictHostKeyChecking=no $StagingUser@$StagingHost "echo 'Connection OK'"
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot connect to staging server"
    }
    Write-Host "Connection to staging successful" -ForegroundColor Green
} catch {
    Write-Host "Cannot connect to staging server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create staging backup
Write-Host "Creating staging backup..." -ForegroundColor Yellow
ssh -i "staging_key" -o StrictHostKeyChecking=no $StagingUser@$StagingHost "cd $StagingPath && if [ -f package.json ]; then echo 'Creating staging backup...' && tar -czf staging-backup-`$(date +%Y%m%d_%H%M%S).tar.gz .next package.json package-lock.json prisma; fi"

# Build project for staging
Write-Host "Building project for staging..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Project build error"
    }
} catch {
    Write-Host "Project build error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create archive
Write-Host "Creating archive for staging..." -ForegroundColor Yellow
$archiveName = "staging-build.tar.gz"
try {
    tar -czf $archiveName .next package.json package-lock.json prisma
    if ($LASTEXITCODE -ne 0) {
        throw "Archive creation error"
    }
} catch {
    Write-Host "Archive creation error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Upload to staging
Write-Host "Uploading to staging server..." -ForegroundColor Yellow
try {
    scp -i "staging_key" -o StrictHostKeyChecking=no $archiveName $StagingUser@$StagingHost`:/tmp/
    if ($LASTEXITCODE -ne 0) {
        throw "Archive upload error"
    }
} catch {
    Write-Host "Archive upload error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Deploy to staging
Write-Host "Deploying to staging..." -ForegroundColor Yellow
try {
    ssh -i "staging_key" -o StrictHostKeyChecking=no $StagingUser@$StagingHost "cd $StagingPath && tar -xzf /tmp/staging-build.tar.gz && rm /tmp/staging-build.tar.gz && npm ci --only=production && npx prisma migrate deploy && sudo systemctl restart domeo-staging"
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment error"
    }
} catch {
    Write-Host "Deployment error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Check health check
Write-Host "Checking staging health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

try {
    $healthCheck = Invoke-WebRequest -Uri "http://$StagingHost`:3001/api/health" -TimeoutSec 10
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "Staging deployment successful!" -ForegroundColor Green
        Write-Host "Staging available: http://$StagingHost`:3001" -ForegroundColor Cyan
    } else {
        throw "Health check failed"
    }
} catch {
    Write-Host "Health check failed, rolling back..." -ForegroundColor Red
    ssh -i "staging_key" -o StrictHostKeyChecking=no $StagingUser@$StagingHost "cd $StagingPath && git checkout HEAD~1 && npm ci --only=production && sudo systemctl restart domeo-staging"
    exit 1
}

# Clean local files
Remove-Item $archiveName -Force -ErrorAction SilentlyContinue

Write-Host "Staging deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Information:" -ForegroundColor Cyan
Write-Host "  Staging URL: http://$StagingHost`:3001" -ForegroundColor White
Write-Host "  Path: $StagingPath" -ForegroundColor White
Write-Host "  Service: domeo-staging" -ForegroundColor White
Write-Host ""
Write-Host "Staging management:" -ForegroundColor Cyan
Write-Host "  Status: ssh -i staging_key $StagingUser@$StagingHost 'sudo systemctl status domeo-staging'" -ForegroundColor White
Write-Host "  Logs:   ssh -i staging_key $StagingUser@$StagingHost 'sudo journalctl -u domeo-staging -f'" -ForegroundColor White
Write-Host "  Restart: ssh -i staging_key $StagingUser@$StagingHost 'sudo systemctl restart domeo-staging'" -ForegroundColor White
