#!/bin/bash

# Dentist Video Platform Startup Script
# This script automates the complete setup and startup process

echo "🦷 Dentist Video Platform - Automated Setup"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Node.js is installed
print_header "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js $(node --version) is installed ✓"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "npm $(npm --version) is installed ✓"

# Check if FFmpeg is installed
print_header "Checking FFmpeg installation..."
if ! command -v ffmpeg &> /dev/null; then
    print_warning "FFmpeg is not installed. Video processing will not work."
    print_warning "Please install FFmpeg:"
    print_warning "  Ubuntu/Debian: sudo apt install ffmpeg"
    print_warning "  macOS: brew install ffmpeg"
    print_warning "  Windows: Download from https://ffmpeg.org/"
    echo ""
    read -p "Continue without FFmpeg? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_status "FFmpeg $(ffmpeg -version | head -n1 | cut -d' ' -f3) is installed ✓"
fi

# Install dependencies
print_header "Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_status "Dependencies installed ✓"
else
    print_status "Dependencies already installed ✓"
fi

# Check if .env file exists
print_header "Checking environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        print_status "Created .env file from env.example"
        print_warning "Please edit .env file with your configuration before starting the server"
        echo ""
        echo "Required configuration:"
        echo "  - EMAIL_HOST, EMAIL_USER, EMAIL_PASS (for email functionality)"
        echo "  - JWT_SECRET (change from default)"
        echo "  - SESSION_SECRET (change from default)"
        echo ""
        read -p "Edit .env file now? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    else
        print_error "No .env file or env.example found"
        exit 1
    fi
else
    print_status "Environment configuration found ✓"
fi

# Run setup script
print_header "Running application setup..."
if [ -f "scripts/setup.js" ]; then
    node scripts/setup.js
    if [ $? -ne 0 ]; then
        print_error "Setup failed"
        exit 1
    fi
    print_status "Application setup completed ✓"
else
    print_warning "Setup script not found, skipping..."
fi

# Create necessary directories
print_header "Creating necessary directories..."
mkdir -p uploads database logs backups
print_status "Directories created ✓"

# Check if database exists
if [ ! -f "database/dentist_platform.db" ]; then
    print_warning "Database not found. Make sure setup script ran successfully."
fi

# Display startup information
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Default accounts created:"
echo "  Admin:      admin@dentistplatform.com / admin123!@#"
echo "  Senior:     senior@dentistplatform.com / senior123!@#"
echo "  Junior:     junior@dentistplatform.com / junior123!@#"
echo ""
echo "🚀 Starting the server..."

# Start the server
if [ "$1" = "dev" ]; then
    print_header "Starting development server with nodemon..."
    npm run dev
else
    print_header "Starting production server..."
    npm start
fi
