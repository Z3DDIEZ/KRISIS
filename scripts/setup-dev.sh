#!/bin/bash

# KRISIS Development Environment Setup Script
# Run this script to set up a complete development environment

set -e

echo "🚀 Setting up KRISIS Development Environment"
echo "==========================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."

cd frontend
npm install
cd ..

echo "✅ Dependencies installed"

# Firebase setup
echo "🔥 Setting up Firebase..."

if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

echo "Please run the following commands manually:"
echo "1. firebase login"
echo "2. firebase projects:create krisis-dev"
echo "3. firebase use krisis-dev"
echo "4. firebase init firestore auth hosting --yes"
echo ""
echo "Then copy your Firebase config to frontend/.env"
echo ""
echo "Finally run: cd frontend && npm run dev"

echo "🎉 Setup script completed!"
echo "See docs/environment-setup.md for detailed instructions"