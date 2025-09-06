#!/bin/bash

# Setup script for PlantUML server
echo "🌱 Setting up PlantUML Server for Architecture as Code Studio"
echo "============================================================"

# Check if Docker or Podman is installed
CONTAINER_CMD=""
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
    echo "✅ Podman is installed"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
    echo "✅ Docker is installed"
else
    echo "❌ Neither Docker nor Podman is installed. Please install one of them first:"
    echo "   - Docker: https://docs.docker.com/get-docker/"
    echo "   - Podman: https://podman.io/getting-started/installation"
    exit 1
fi

# Check if PlantUML server is already running
if curl -s http://localhost:8081/png/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000 >/dev/null 2>&1; then
    echo "✅ PlantUML server is already running at http://localhost:8081"
    exit 0
fi

echo "🚀 Starting PlantUML server..."

# Stop existing container if it exists
$CONTAINER_CMD stop plantuml-server 2>/dev/null || true
$CONTAINER_CMD rm plantuml-server 2>/dev/null || true

# Pull and run PlantUML server on port 8081 (backend uses 8080)
$CONTAINER_CMD run -d \
    --name plantuml-server \
    -p 8081:8080 \
    --restart unless-stopped \
    docker.io/plantuml/plantuml-server:jetty

if [ $? -eq 0 ]; then
    echo "✅ PlantUML server started successfully!"
    echo ""
    echo "🔗 Server is available at: http://localhost:8081"
    echo "📊 Test URL: http://localhost:8081/png/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000"
    echo ""
    echo "💡 The server will automatically restart when your computer reboots."
    echo "💡 To stop the server: $CONTAINER_CMD stop plantuml-server"
    echo "💡 To remove the server: $CONTAINER_CMD rm plantuml-server"
    echo ""
    echo "🔄 Now refresh your Architecture Studio to see rendered diagrams!"
else
    echo "❌ Failed to start PlantUML server"
    echo "🔍 Troubleshooting:"
    echo "   - Make sure port 8081 is not in use"
    echo "   - Check container logs: $CONTAINER_CMD logs plantuml-server"
    echo "   - Try manually: $CONTAINER_CMD run -p 8081:8080 docker.io/plantuml/plantuml-server:jetty"
    exit 1
fi