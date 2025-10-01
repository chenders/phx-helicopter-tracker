#!/bin/bash

# Fix NumPy version compatibility with PyTorch
echo "Fixing NumPy version for PyTorch compatibility..."

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "⚠️  Virtual environment not found. Please run setup_m1.sh first."
    exit 1
fi

# Uninstall current numpy
echo "1. Uninstalling current NumPy version..."
pip uninstall -y numpy

# Install compatible NumPy version
echo "2. Installing NumPy 1.26.x (compatible with PyTorch 2.1.2)..."
pip install "numpy>=1.24.0,<2.0.0"

# Test the fix
echo "3. Testing PyTorch with NumPy..."
python3 -c "
import numpy as np
import torch

print(f'NumPy version: {np.__version__}')
print(f'PyTorch version: {torch.__version__}')

# Test MPS
if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
    print('✅ MPS is available!')
    # Simple test
    x = torch.ones(5, device='mps')
    print(f'MPS tensor created: {x}')
else:
    print('⚠️  MPS not available')

print('✅ NumPy compatibility fixed!')
"

echo ""
echo "Fix complete! You can now run ./scripts/test_transcription.py without warnings."