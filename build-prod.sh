#!/bin/bash

# Production Build Script for Linux/Mac
# This script builds and runs the accounting application in Docker

echo "🚀 Starting Production Build for Accounting Application"

# Check if Docker is running
echo "📋 Checking Docker status..."
if ! docker version > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi
echo "✅ Docker is running"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from example..."
    if [ -f "env.production.example" ]; then
        cp env.production.example .env
        echo "📝 Created .env file from example. Please update the values before running again."
        echo "🔧 Edit .env file and set your database password and JWT secret!"
        exit 1
    else
        echo "❌ No environment example file found. Please create a .env file manually."
        exit 1
    fi
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images to force rebuild
echo "🗑️  Removing old images..."
docker-compose down --rmi all

# Build and start the services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
max_wait=60
waited=0

while [ $waited -lt $max_wait ]; do
    backend_health=$(docker inspect --format='{{.State.Health.Status}}' accounting-backend 2>/dev/null)
    frontend_health=$(docker inspect --format='{{.State.Health.Status}}' accounting-frontend 2>/dev/null)
    db_health=$(docker inspect --format='{{.State.Health.Status}}' accounting-db 2>/dev/null)
    
    if [ "$backend_health" = "healthy" ] && [ "$frontend_health" = "healthy" ] && [ "$db_health" = "healthy" ]; then
        echo "✅ All services are healthy!"
        break
    fi
    
    sleep 5
    waited=$((waited + 5))
    echo "⏳ Still waiting... ($waited/$max_wait seconds)"
done

if [ $waited -ge $max_wait ]; then
    echo "⚠️  Services may still be starting. Check logs with: docker-compose logs"
fi

# Show service status
echo "📊 Service Status:"
docker-compose ps

# Show access information
echo ""
echo "🌐 Application Access Information:"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:8090"
echo "Health Check: http://localhost:8090/health"
echo ""
echo "📱 Tailscale Access:"
echo "If you have Tailscale configured, you can access the app from other devices using your Tailscale IP"

# Show default login credentials
echo ""
echo "🔐 Default Login Credentials:"
echo "Email: admin@example.com"
echo "Password: admin123"
echo "⚠️  Please change the default password after first login!"

echo ""
echo "🎉 Production build completed successfully!"
echo "Use 'docker-compose logs -f' to view logs"
echo "Use 'docker-compose down' to stop the services"
