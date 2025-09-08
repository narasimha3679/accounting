# Validation script to check if all production setup files are in place
Write-Host "🔍 Validating Production Setup..." -ForegroundColor Cyan

$errors = @()

# Check required files
$requiredFiles = @(
    "backend/Dockerfile",
    "frontend/Dockerfile", 
    "frontend/nginx.conf",
    "docker-compose.yml",
    "env.production.example",
    "build-prod.ps1",
    "build-prod.sh",
    "PRODUCTION_SETUP.md"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file - MISSING" -ForegroundColor Red
        $errors += $file
    }
}

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found - will be created from example" -ForegroundColor Yellow
}

# Check Docker
try {
    docker version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not available" -ForegroundColor Red
    $errors += "Docker not available"
}

# Check docker-compose
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not available" -ForegroundColor Red
    $errors += "Docker Compose not available"
}

Write-Host "`n📊 Validation Summary:" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "🎉 All checks passed! Ready for production deployment." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Copy env.production.example to .env and update values" -ForegroundColor White
    Write-Host "2. Run .\build-prod.ps1 to start the application" -ForegroundColor White
} else {
    Write-Host "❌ Found $($errors.Count) issues:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
}
