#!/bin/bash

# Setup script for M1 Mac transcription worker
echo "════════════════════════════════════════════════════════════"
echo "   M1 Mac Transcription Worker Setup"
echo "   Using Metal Performance Shaders for GPU Acceleration"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if running on Apple Silicon
if [[ $(uname -m) != "arm64" ]]; then
    echo "⚠️  Warning: This script is optimized for Apple Silicon (M1/M2/M3) Macs"
    echo "   Detected architecture: $(uname -m)"
    echo "   The worker will still function but without GPU acceleration"
    echo ""
fi

# Check for Homebrew
echo "1. Checking for Homebrew..."
if ! command -v brew &> /dev/null; then
    echo "   Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "   ✓ Homebrew is installed"
fi

# Install Python 3.11 via Homebrew
echo ""
echo "2. Installing Python 3.11..."
if ! brew list python@3.11 &> /dev/null; then
    brew install python@3.11
else
    echo "   ✓ Python 3.11 is already installed"
fi

# Install ffmpeg for audio processing
echo ""
echo "3. Installing ffmpeg..."
if ! brew list ffmpeg &> /dev/null; then
    brew install ffmpeg
else
    echo "   ✓ ffmpeg is already installed"
fi

# Create Python virtual environment
echo ""
echo "4. Creating Python virtual environment..."
python3.11 -m venv venv

# Activate virtual environment and upgrade pip
echo ""
echo "5. Installing Python requirements..."
source venv/bin/activate
pip install --upgrade pip wheel setuptools

# Install PyTorch with MPS support first
echo ""
echo "6. Installing PyTorch with Metal Performance Shaders support..."
pip install torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2

# Install remaining requirements
echo ""
echo "7. Installing remaining Python packages..."
pip install -r requirements.txt

# Test MPS availability
echo ""
echo "8. Testing Metal Performance Shaders (MPS) availability..."
python3 -c "
import torch
import platform

print(f'Platform: {platform.machine()}')
print(f'macOS version: {platform.mac_ver()[0]}')

if hasattr(torch.backends, 'mps'):
    if torch.backends.mps.is_available():
        if torch.backends.mps.is_built():
            print('✅ MPS (Metal Performance Shaders) is available!')
            print('   Your M1 GPU will be used for acceleration')

            # Test MPS with a simple operation
            try:
                x = torch.ones(1, device='mps')
                print(f'   MPS test successful: {x}')
            except Exception as e:
                print(f'   ⚠️  MPS test failed: {e}')
        else:
            print('⚠️  MPS is available but not built in this PyTorch version')
    else:
        print('⚠️  MPS is not available on this system')
else:
    print('⚠️  This PyTorch version does not support MPS')
"

# Download Whisper models
echo ""
echo "9. Pre-downloading Whisper models..."
echo "   Downloading 'base' model (~140MB)..."
python3 -c "
import whisper
import os

cache_dir = os.path.expanduser('~/Library/Caches/whisper')
os.makedirs(cache_dir, exist_ok=True)

print('   Downloading base model...')
model = whisper.load_model('base', download_root=cache_dir)
print('   ✓ Base model downloaded')

# Optionally download 'tiny' for testing
print('   Downloading tiny model for testing...')
model = whisper.load_model('tiny', download_root=cache_dir)
print('   ✓ Tiny model downloaded')
"

# Create necessary directories
echo ""
echo "10. Creating data directories..."
mkdir -p ~/Library/Logs/PhoenixTranscription
mkdir -p /Users/Shared/transcription/{input,output}
mkdir -p logs

# Setup environment file
echo ""
echo "11. Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "   ✓ Created .env file from template"
    echo ""
    echo "   ⚠️  IMPORTANT: Edit .env to set your Redis server IP address!"
    echo "      Use: nano .env"
else
    echo "   ✓ .env file already exists"
fi

# Create LaunchAgent for auto-start (optional)
echo ""
echo "12. Creating LaunchAgent for auto-start (optional)..."
PLIST_FILE="$HOME/Library/LaunchAgents/com.phxpd.transcription.plist"
cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.phxpd.transcription</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(pwd)/scripts/start_worker.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/PhoenixTranscription/output.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/PhoenixTranscription/error.log</string>
</dict>
</plist>
EOF
echo "   ✓ LaunchAgent created (not loaded)"
echo "   To enable auto-start: launchctl load $PLIST_FILE"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Edit .env file to set your Redis server IP:"
echo "   nano .env"
echo ""
echo "2. Test the worker:"
echo "   ./scripts/test_transcription.py"
echo ""
echo "3. Run the worker:"
echo "   ./scripts/start_worker.sh"
echo ""
echo "4. (Optional) Enable auto-start on login:"
echo "   launchctl load ~/Library/LaunchAgents/com.phxpd.transcription.plist"
echo ""
echo "Performance tips for M1:"
echo "• Use 'base' or 'small' Whisper models for best speed/accuracy balance"
echo "• The M1 GPU provides ~5-10x speedup over CPU"
echo "• Monitor Activity Monitor for GPU usage during transcription"
echo "════════════════════════════════════════════════════════════"