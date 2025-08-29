#!/bin/bash

echo "🐳 Setting up Docker environment for File Tracking System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
mkdir -p uploads
mkdir -p logs

# Set proper permissions
chmod +x scripts/init-mongo.js

echo "📦 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

echo "✅ File Tracking System is now running!"
echo "🌐 Application: http://localhost:3000"
echo "🗄️  MongoDB Express: http://localhost:8081"
echo ""
echo "To stop the services, run: docker-compose down"
echo "To view logs, run: docker-compose logs -f"
