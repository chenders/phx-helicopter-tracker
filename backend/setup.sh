#!/bin/bash

# Backend setup script for non-Docker development

echo "Setting up Phoenix PD Helicopters Backend (Non-Docker)..."

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d" " -f2 | cut -d"." -f1,2)
REQUIRED_VERSION="3.11"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "Warning: Python $PYTHON_VERSION detected. Python 3.11+ is recommended."
fi

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cat > .env << EOL
# Application settings
DEBUG=true
SECRET_KEY=dev_secret_key_change_in_production

# Database settings (using local PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/phoenix_helicopters

# Redis settings (using local Redis)
REDIS_URL=redis://localhost:6379

# External API keys (add your keys here)
ADSB_EXCHANGE_API_KEY=
GOOGLE_MAPS_API_KEY=
FR24_USERNAME=
FR24_PASSWORD=

# CORS settings
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:3001","http://localhost:5173"]

# Phoenix PD specific settings
PHOENIX_PD_AIRCRAFT=N624FB,N625FB,N626FB,N627FB,N628FB

# Alert settings
ENABLE_REAL_TIME_ALERTS=true
ALERT_EMAIL=
EOL
    echo ".env file created. Please update with your API keys."
else
    echo ".env file already exists."
fi

echo ""
echo "Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL is running locally on port 5432"
echo "2. Make sure Redis is running locally on port 6379"
echo "3. Run the database setup: ./setup_db.sh"
echo "4. Update .env file with your API keys"
echo "5. Activate the virtual environment: source venv/bin/activate"
echo "6. Run the backend server: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"