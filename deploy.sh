#!/bin/bash

echo "🚀 Starting deployment preparation..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install

# Build the React app
echo "🔨 Building React app..."
npm run build

# Go back to root
cd ..

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Go back to root
cd ..

echo "✅ Build completed successfully!"
echo "📁 The React app has been built to: client/build/"
echo "🚀 You can now deploy to Render or run locally with: npm start"
