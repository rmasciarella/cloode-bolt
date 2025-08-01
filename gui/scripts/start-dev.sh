#!/bin/bash

# Fresh Solver GUI Development Server Startup Script
# This script ensures reliable server startup with proper error handling

set -e  # Exit on any error

echo "🚀 Starting Fresh Solver GUI Development Server..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down development server..."
    pkill -f "next dev" 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Check if port 3000 is already in use
check_port() {
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port 3000 is already in use. Attempting to free it..."
        pkill -f "next dev" 2>/dev/null || true
        sleep 2
        if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "❌ Unable to free port 3000. Please check running processes."
            exit 1
        fi
    fi
}

# Verify dependencies are installed
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Check for critical dependencies
    if [ ! -d "node_modules/next" ]; then
        echo "❌ Next.js not found. Running npm install..."
        npm install
    fi
}

# Clean build artifacts if needed
clean_build() {
    if [ -d ".next" ] && [ -n "$(find .next -name '*.json' -type f -size 0c 2>/dev/null)" ]; then
        echo "🧹 Cleaning corrupted build artifacts..."
        rm -rf .next
    fi
}

# Main startup sequence
main() {
    echo "🔍 Checking port availability..."
    check_port
    
    echo "📋 Verifying dependencies..."
    check_dependencies
    
    echo "🔧 Cleaning build artifacts..."
    clean_build
    
    echo "✨ Starting Next.js development server..."
    
    # Start the development server with proper error handling
    if npm run dev; then
        echo "✅ Development server started successfully!"
    else
        echo "❌ Failed to start development server. Checking for issues..."
        
        # Try to diagnose the issue
        if [ ! -f "package.json" ]; then
            echo "❌ package.json not found"
            exit 1
        fi
        
        if [ ! -d "node_modules/next" ]; then
            echo "❌ Next.js not installed properly"
            exit 1
        fi
        
        echo "❌ Unknown issue. Please check the logs above."
        exit 1
    fi
}

# Change to GUI directory if not already there
if [[ ! -f "package.json" ]] || [[ ! $(grep -q "nextjs" package.json 2>/dev/null) ]]; then
    if [ -d "gui" ]; then
        echo "📁 Changing to GUI directory..."
        cd gui
    else
        echo "❌ GUI directory not found. Please run from project root."
        exit 1
    fi
fi

# Run main function
main