# Production Build Script for Windows PowerShell
# This script builds and runs the accounting application in Docker

Write-Host "🚀 Starting Production Build for Accounting Application" -ForegroundColor Green

# Check if Docker is running
Write-Host "📋 Checking Docker status..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from example..." -ForegroundColor Yellow
    if (Test-Path "env.production.example") {
        Copy-Item "env.production.example" ".env"
        Write-Host "📝 Created .env file from example. Please update the values before running again." -ForegroundColor Yellow
        Write-Host "🔧 Edit .env file and set your database password and JWT secret!" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "❌ No environment example file found. Please create a .env file manually." -ForegroundColor Red
        exit 1
    }
}

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Remove old images to force rebuild
Write-Host "🗑️  Removing old images..." -ForegroundColor Yellow
docker-compose down --rmi all

# Build and start the services
Write-Host "🔨 Building and starting services..." -ForegroundColor Yellow
docker-compose up --build -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
$maxWait = 60
$waited = 0

while ($waited -lt $maxWait) {
    $backendHealth = docker inspect --format='{{.State.Health.Status}}' accounting-backend 2>$null
    $frontendHealth = docker inspect --format='{{.State.Health.Status}}' accounting-frontend 2>$null
    
    if ($backendHealth -eq "healthy" -and $frontendHealth -eq "healthy") {
        Write-Host "✅ All services are healthy!" -ForegroundColor Green
        break
    }
    
    Start-Sleep -Seconds 5
    $waited += 5
    Write-Host "⏳ Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Yellow
}

if ($waited -ge $maxWait) {
    Write-Host "⚠️  Services may still be starting. Check logs with: docker-compose logs" -ForegroundColor Yellow
}

# Show service status
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose ps

# Show access information
Write-Host "`n🌐 Application Access Information:" -ForegroundColor Green
Write-Host "Frontend: http://localhost" -ForegroundColor White
Write-Host "Backend API: http://localhost:8090" -ForegroundColor White
Write-Host "Health Check: http://localhost:8090/health" -ForegroundColor White
Write-Host "`n📱 Tailscale Access:" -ForegroundColor Green
Write-Host "If you have Tailscale configured, you can access the app from other devices using your Tailscale IP" -ForegroundColor White

# Show default login credentials
Write-Host "`n🔐 Default Login Credentials:" -ForegroundColor Yellow
Write-Host "Email: admin@example.com" -ForegroundColor White
Write-Host "Password: admin123" -ForegroundColor White
Write-Host "⚠️  Please change the default password after first login!" -ForegroundColor Red

Write-Host "`n🎉 Production build completed successfully!" -ForegroundColor Green
Write-Host "Use 'docker-compose logs -f' to view logs" -ForegroundColor Cyan
Write-Host "Use 'docker-compose down' to stop the services" -ForegroundColor Cyan
