# Migration Guide: PocketBase to Go Backend

This guide will help you migrate from PocketBase to the new Go backend with PostgreSQL.

## Overview

The migration involves:
1. Setting up PostgreSQL database
2. Running the Go backend
3. Updating frontend to use new API
4. Removing PocketBase dependencies

## Prerequisites

- Go 1.21 or higher
- PostgreSQL 12 or higher
- Node.js 18+ (for frontend)

## Step 1: Set up PostgreSQL Database

### Install PostgreSQL

**Windows:**
```bash
# Download and install from https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql
```

**macOS:**
```bash
# Using Homebrew:
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database and User

```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database and user
CREATE DATABASE accounting_db;
CREATE USER accounting_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE accounting_db TO accounting_user;

-- Exit PostgreSQL
\q
```

## Step 2: Set up Go Backend

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Install Go dependencies
```bash
go mod tidy
```

### 3. Configure environment variables
```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your database credentials
# Update these values:
DB_HOST=localhost
DB_PORT=5432
DB_USER=accounting_user
DB_PASSWORD=your_secure_password
DB_NAME=accounting_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 4. Run the backend
```bash
go run main.go
```

The backend will:
- Connect to PostgreSQL
- Run database migrations
- Create a default admin user
- Start the API server on port 8080

### 5. Verify backend is running
```bash
curl http://localhost:8080/health
```

You should see:
```json
{
  "status": "ok",
  "message": "Accounting backend is running"
}
```

## Step 3: Update Frontend

### 1. Remove PocketBase dependency
```bash
cd frontend
npm uninstall pocketbase
```

### 2. Update environment variables
Create or update `frontend/.env`:
```bash
VITE_API_URL=http://localhost:8080/api/v1
```

### 3. The frontend has been updated to use the new API
The following files have been updated:
- `src/lib/api.ts` - New API client
- `src/contexts/AuthContext.tsx` - Updated to use new API

### 4. Start the frontend
```bash
npm run dev
```

## Step 4: Test the Migration

### 1. Login with default credentials
- **Email**: admin@example.com
- **Password**: admin123

### 2. Verify functionality
- Create a company
- Add clients
- Create invoices
- Add expenses
- Test all CRUD operations

## Step 5: Clean up PocketBase

### 1. Stop PocketBase server
If you have PocketBase running, stop it.

### 2. Remove PocketBase files
```bash
# From the project root
rm pocketbase.exe
rm -rf pb_data/
rm -rf pb_hooks/
rm -rf pb_migrations/
rm pocketbase_schema.json
rm pocketbase_hooks.js
rm pocketbase_example.js
rm create_admin.js
rm import_collections.js
rm import_initial_data.js
rm setup_database.js
rm setup_pocketbase.js
```

### 3. Update package.json scripts
Update the root `package.json` to remove PocketBase-related scripts:

```json
{
  "scripts": {
    "dev": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "install-all": "npm install && cd frontend && npm install"
  }
}
```

## Data Migration (Optional)

If you have existing data in PocketBase that you want to migrate:

### 1. Export data from PocketBase
You can export your PocketBase data using the admin interface or API.

### 2. Create migration script
Create a script to import your data into the new PostgreSQL database using the Go API endpoints.

### 3. Example migration script structure
```go
// migrate_data.go
package main

import (
    "encoding/json"
    "io/ioutil"
    "net/http"
    // ... other imports
)

func main() {
    // Read exported PocketBase data
    // Transform to new format
    // Import via API endpoints
}
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in `.env`
- Ensure database exists and user has permissions

### Backend Issues
- Check logs for error messages
- Verify all environment variables are set
- Ensure port 8080 is available

### Frontend Issues
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly
- Ensure backend is running on the correct port

### Authentication Issues
- Clear browser localStorage: `localStorage.clear()`
- Check JWT token in browser dev tools
- Verify JWT_SECRET is set in backend

## Production Deployment

### Backend
1. Set `GIN_MODE=release`
2. Use a strong `JWT_SECRET`
3. Configure proper database credentials
4. Set up SSL/TLS
5. Use a reverse proxy (nginx)

### Frontend
1. Build for production: `npm run build`
2. Serve static files with a web server
3. Configure CORS properly
4. Set production API URL

### Database
1. Use a managed PostgreSQL service
2. Set up regular backups
3. Configure connection pooling
4. Monitor performance

## Support

If you encounter issues during migration:

1. Check the logs for both backend and frontend
2. Verify all environment variables are correct
3. Ensure all dependencies are installed
4. Check network connectivity between services

The new Go backend provides the same functionality as PocketBase but with better performance, scalability, and maintainability.
