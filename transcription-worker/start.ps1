# PowerShell script to start the GPU transcription worker
# Run this script from PowerShell in the transcription-worker directory

Write-Host "Starting GPU Transcription Worker..." -ForegroundColor Green
Write-Host ""

# Check if Docker is running
$dockerRunning = docker info 2>&1 | Select-String "Server Version"
if (-not $dockerRunning) {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

# Check if NVIDIA GPU is available
Write-Host "Checking GPU availability..." -ForegroundColor Cyan
$gpuCheck = docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: NVIDIA GPU not accessible in Docker!" -ForegroundColor Red
    Write-Host "Make sure NVIDIA Container Toolkit is installed." -ForegroundColor Yellow
    Write-Host "See README.md for installation instructions." -ForegroundColor Yellow
    exit 1
}
Write-Host "GPU detected successfully!" -ForegroundColor Green
Write-Host ""

# Check if backend directory exists
if (-not (Test-Path "backend")) {
    Write-Host "ERROR: backend directory not found!" -ForegroundColor Red
    Write-Host "Please copy the backend directory from your main server to:" -ForegroundColor Yellow
    Write-Host "  $(Get-Location)\backend" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "See README.md for instructions." -ForegroundColor Yellow
    exit 1
}

# Start the container
Write-Host "Starting container..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! GPU Transcription Worker is starting..." -ForegroundColor Green
    Write-Host ""
    Write-Host "View logs with:" -ForegroundColor Cyan
    Write-Host "  docker-compose logs -f" -ForegroundColor White
    Write-Host ""
    Write-Host "Check status with:" -ForegroundColor Cyan
    Write-Host "  docker-compose ps" -ForegroundColor White
    Write-Host ""
    Write-Host "Monitor on Flower (from main server):" -ForegroundColor Cyan
    Write-Host "  http://192.168.1.47:5555" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to start container!" -ForegroundColor Red
    Write-Host "Check logs with:" -ForegroundColor Yellow
    Write-Host "  docker-compose logs" -ForegroundColor White
}
