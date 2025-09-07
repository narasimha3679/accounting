# Migration script from PocketBase to Go backend
Write-Host "🚀 Starting migration from PocketBase to Go backend..." -ForegroundColor Green

# Check if Go is installed
try {
    $goVersion = go version
    Write-Host "✅ Go is installed: $goVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Go is not installed. Please install Go 1.21 or higher." -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed
try {
    $psqlVersion = psql --version
    Write-Host "✅ PostgreSQL is installed: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL is not installed. Please install PostgreSQL 12 or higher." -ForegroundColor Red
    Write-Host "You can download it from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Create PostgreSQL database and user
Write-Host "📊 Setting up PostgreSQL database..." -ForegroundColor Blue
try {
    psql -U postgres -c "CREATE DATABASE accounting_db;" 2>$null
    Write-Host "✅ Database created or already exists" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not create database. Please create it manually:" -ForegroundColor Yellow
    Write-Host "   psql -U postgres -c 'CREATE DATABASE accounting_db;'" -ForegroundColor Yellow
}

try {
    psql -U postgres -c "CREATE USER accounting_user WITH PASSWORD 'password123';" 2>$null
    Write-Host "✅ User created or already exists" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not create user. Please create it manually:" -ForegroundColor Yellow
    Write-Host "   psql -U postgres -c 'CREATE USER accounting_user WITH PASSWORD \"password123\";'" -ForegroundColor Yellow
}

try {
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE accounting_db TO accounting_user;" 2>$null
    Write-Host "✅ Permissions granted" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not grant permissions. Please do it manually:" -ForegroundColor Yellow
    Write-Host "   psql -U postgres -c 'GRANT ALL PRIVILEGES ON DATABASE accounting_db TO accounting_user;'" -ForegroundColor Yellow
}

# Set up backend environment
Write-Host "⚙️  Setting up backend environment..." -ForegroundColor Blue
Set-Location backend
if (!(Test-Path .env)) {
    Copy-Item env.example .env
    Write-Host "📝 Created .env file. Please update the database password if needed." -ForegroundColor Yellow
}

# Install Go dependencies
Write-Host "📦 Installing Go dependencies..." -ForegroundColor Blue
go mod tidy
Write-Host "✅ Backend setup completed" -ForegroundColor Green

# Set up frontend environment
Write-Host "⚙️  Setting up frontend environment..." -ForegroundColor Blue
Set-Location ../frontend
if (!(Test-Path .env)) {
    "VITE_API_URL=http://localhost:8080/api/v1" | Out-File -FilePath .env -Encoding UTF8
    Write-Host "📝 Created frontend .env file." -ForegroundColor Yellow
}

# Remove PocketBase dependency
Write-Host "🗑️  Removing PocketBase dependency..." -ForegroundColor Blue
try {
    npm uninstall pocketbase 2>$null
    Write-Host "✅ PocketBase dependency removed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PocketBase was not installed" -ForegroundColor Yellow
}

Write-Host "✅ Frontend setup completed" -ForegroundColor Green

# Clean up PocketBase files
Write-Host "🧹 Cleaning up PocketBase files..." -ForegroundColor Blue
Set-Location ..
$filesToRemove = @(
    "pocketbase.exe",
    "pb_data",
    "pb_hooks", 
    "pb_migrations",
    "pocketbase_schema.json",
    "pocketbase_hooks.js",
    "pocketbase_example.js",
    "create_admin.js",
    "import_collections.js",
    "import_initial_data.js",
    "setup_database.js",
    "setup_pocketbase.js"
)

foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Remove-Item -Recurse -Force $file
        Write-Host "🗑️  Removed $file" -ForegroundColor Yellow
    }
}

Write-Host "✅ Cleanup completed" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Migration completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the backend: cd backend && go run main.go" -ForegroundColor White
Write-Host "2. Start the frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "3. Login with default credentials:" -ForegroundColor White
Write-Host "   Email: admin@example.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Remember to change the default password after first login!" -ForegroundColor Yellow
Write-Host ""
Write-Host "For more details, see MIGRATION_GUIDE.md" -ForegroundColor Cyan
