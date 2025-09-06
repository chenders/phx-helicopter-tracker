#!/bin/bash

# Frontend setup script for non-Docker development

echo "Setting up Phoenix PD Helicopters Frontend (Non-Docker)..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Warning: Node.js version $NODE_VERSION detected. Node.js 18+ is recommended."
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Google Maps API Key (optional, for map features)
VITE_GOOGLE_MAPS_API_KEY=

# Environment
VITE_ENV=development
EOL
    echo ".env file created."
else
    echo ".env file already exists."
fi

echo ""
echo "Frontend setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure the backend is running on port 8000"
echo "2. Update .env file with your API keys if needed"
echo "3. Run the development server: npm run dev"
echo "4. Open http://localhost:5173 in your browser"