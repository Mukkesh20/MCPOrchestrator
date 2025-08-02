#!/bin/bash

echo "📦 Installing dependencies..."

# Install root dependencies
npm install

# Install backend dependencies
cd packages/backend
npm install
cd ../..

# Install frontend dependencies
cd packages/frontend
npm install
cd ../..

echo "🚀 Starting development servers..."

# Start backend and frontend concurrently
npm run dev
