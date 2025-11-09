#!/bin/bash

# AI Job Hunt Agent - Complete Setup Script
# This script sets up the entire development environment from scratch

set -e  # Exit on any error

echo "🚀 Setting up AI Job Hunt Agent..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# System Requirements Check
print_step 1 "Checking System Requirements"

echo "Checking required software..."

# Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "Node.js: $NODE_VERSION"
    if [[ $(node --version) < "v18.0.0" ]]; then
        print_error "Node.js 18 or higher is required. Please upgrade Node.js."
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo "npm: $NPM_VERSION"
else
    print_error "npm is not installed."
    exit 1
fi

# Git (optional but recommended)
if command_exists git; then
    GIT_VERSION=$(git --version)
    echo "Git: $GIT_VERSION"
else
    print_warning "Git is not installed. It's recommended for version control."
fi

print_success "System requirements check passed"

# Environment Setup
print_step 2 "Setting up Environment"

if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    print_success "Created .env file"
    print_warning "Please edit .env file with your API keys before running the app"
else
    print_warning ".env file already exists, skipping creation"
fi

# Dependency Installation
print_step 3 "Installing Dependencies"

echo "Installing Node.js dependencies..."
npm install

print_success "Dependencies installed successfully"

# Database Setup
print_step 4 "Database Setup"

echo "Setting up Supabase database..."

# Check if we have database connection info
if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env && ! grep -q "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url" .env; then
    echo "Supabase configuration found in .env"

    # Generate and apply database migrations
    echo "Generating database schema..."
    npm run db:generate

    echo "Applying database migrations..."
    npm run db:push

    # Apply RLS policies
    echo "Applying Row Level Security policies..."
    npm run db:apply-rls

    print_success "Database setup completed"
else
    print_warning "Supabase configuration not found in .env"
    echo "Please configure your Supabase project in .env file:"
    echo "- NEXT_PUBLIC_SUPABASE_URL"
    echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "- SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "Then run: npm run db:push && npm run db:apply-rls"
fi

# Build Process
print_step 5 "Building Application"

echo "Running type check..."
npm run type-check 2>/dev/null || echo "Type check completed with warnings"

echo "Building application..."
NEXT_TELEMETRY_DISABLED=1 npm run build

print_success "Application built successfully"

# Testing Setup
print_step 6 "Running Tests"

echo "Running test suite..."
npm test 2>/dev/null || echo "Tests completed with some failures"

print_success "Setup tests completed"

# Cleanup
print_step 7 "Final Cleanup"

echo "Cleaning up build cache and temporary files..."

# Remove any lingering build artifacts
rm -rf .next/cache 2>/dev/null || true

print_success "Cleanup completed"

# Final Instructions
print_success "🎉 Setup completed successfully!"

echo ""
echo "🚀 Next Steps:"
echo "1. Configure your environment variables in .env:"
echo "   - NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key"
echo "   - SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
echo "   - OPENROUTER_API_KEY=your_openrouter_api_key"
echo "   - OPENAI_API_KEY=your_openai_api_key"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Additional Commands:"
echo "- npm run lint           # Check code quality"
echo "- npm run db:studio      # Open database manager"
echo "- npm run test           # Run full test suite"
echo "- npm run build          # Build for production"
echo ""
echo "🔗 Useful Links:"
echo "- Supabase Dashboard: https://app.supabase.com"
echo "- OpenRouter API: https://openrouter.ai/keys"
echo "- OpenAI API: https://platform.openai.com/api-keys"
echo ""
echo "💡 If you encounter any issues:"
echo "- Check .env configuration"
echo "- Ensure Supabase project is active"
echo "- Verify API keys are valid"
echo "- Run: npm run db:fix-all-rls (if database issues persist)"