# Production Setup Guide

This guide will help you set up the Accounting Application for production use with Docker.

## Prerequisites

- Docker Desktop installed and running
- Git (to clone the repository)
- Windows PowerShell or Linux/Mac terminal

## Quick Start

### 1. Environment Setup

First, create your environment file:

```bash
# Copy the example environment file
cp env.production.example .env

# Edit the .env file with your production values
# Important: Change the database password and JWT secret!
```

### 2. Build and Run

**For Windows:**
```powershell
.\build-prod.ps1
```

**For Linux/Mac:**
```bash
./build-prod.sh
```

### 3. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8090
- **Health Check**: http://localhost:8090/health

## Default Login Credentials

- **Email**: admin@example.com
- **Password**: admin123

⚠️ **IMPORTANT**: Change the default password after first login!

## Tailscale Integration

Since you have Tailscale set up, you can access the application from other devices:

1. Find your Tailscale IP address
2. Access the app using: `http://YOUR_TAILSCALE_IP`
3. The backend will be available at: `http://YOUR_TAILSCALE_IP:8090`

## Environment Variables

Edit the `.env` file to configure your production environment:

```env
# Database Configuration
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-secure-password-here
DB_NAME=accounting

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application Configuration
GIN_MODE=release
PORT=8090

# Frontend Configuration
VITE_API_URL=http://localhost:8090/api/v1
```

## Docker Services

The application consists of three Docker services:

1. **Frontend** (nginx): Serves the React application
2. **Backend** (Go): API server
3. **Database** (PostgreSQL): Data storage

## Management Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

### Backup Database
```bash
# Create backup
docker exec accounting-db pg_dump -U postgres accounting > backup.sql

# Restore backup
docker exec -i accounting-db psql -U postgres accounting < backup.sql
```

## Security Considerations

1. **Change Default Passwords**: Update the default admin password and database password
2. **JWT Secret**: Use a strong, random JWT secret
3. **Database Security**: Ensure your database is not exposed to the internet
4. **Firewall**: Configure your firewall to only allow necessary ports
5. **SSL/TLS**: Consider setting up SSL certificates for production use

## Troubleshooting

### Services Not Starting
```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs

# Check Docker resources
docker system df
```

### Database Connection Issues
- Verify database credentials in `.env`
- Check if PostgreSQL is running: `docker-compose logs db`
- Ensure database container is healthy

### Frontend Not Loading
- Check if nginx is running: `docker-compose logs frontend`
- Verify frontend build: `docker-compose logs frontend | grep -i error`

### Backend API Issues
- Check backend logs: `docker-compose logs backend`
- Verify environment variables
- Check database connectivity

## Performance Optimization

1. **Resource Limits**: Add resource limits to docker-compose.yml if needed
2. **Database Tuning**: Configure PostgreSQL for your workload
3. **Caching**: Consider adding Redis for session caching
4. **Load Balancing**: Use nginx or similar for multiple backend instances

## Monitoring

The application includes health checks for all services:

- Frontend: `http://localhost/health`
- Backend: `http://localhost:8090/health`
- Database: Built-in PostgreSQL health check

## Support

For issues or questions:
1. Check the logs first: `docker-compose logs`
2. Verify environment configuration
3. Check Docker resource usage
4. Review this documentation
