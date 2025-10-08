# Transcription Data Flow

This document explains how radio files and transcriptions flow between the Linux server and Windows GPU worker.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Linux Server (192.168.1.47)                                             │
│                                                                          │
│  ┌──────────────────────┐                                               │
│  │ Broadcastify         │                                               │
│  │ Download Task        │                                               │
│  │ (radio_tasks.py)     │                                               │
│  └──────────┬───────────┘                                               │
│             │                                                            │
│             ▼                                                            │
│  ┌──────────────────────────────────────┐                               │
│  │ /data/radio/phoenix_pd/              │◄───── Samba/NFS Share        │
│  │ ├── 2024-10-07_00-00-00.mp3         │       (Port 445/2049)         │
│  │ ├── 2024-10-07_01-00-00.mp3         │                               │
│  │ └── ...                               │                               │
│  └──────────────────────────────────────┘                               │
│                                                                          │
│  ┌──────────────────────────────────────┐                               │
│  │ PostgreSQL Database                   │                               │
│  │ (Port 5433)                          │◄───── Network Connection      │
│  │                                       │       (PostgreSQL Protocol)   │
│  │ Tables:                               │                               │
│  │ ├── radio_archives                   │                               │
│  │ │   ├── file_path                    │                               │
│  │ │   ├── transcription_text           │◄───── Written by GPU Worker  │
│  │ │   └── transcription_status         │                               │
│  │ └── radio_transcriptions             │                               │
│  └──────────────────────────────────────┘                               │
│                                                                          │
│  ┌──────────────────────────────────────┐                               │
│  │ Redis (Port 6380)                    │                               │
│  │ ├── Task Queue: transcription        │◄───── Network Connection      │
│  │ └── Task Results                     │       (Redis Protocol)        │
│  └──────────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
                           │                              ▲
                           │ Task Messages                │ Results
                           ▼                              │
┌─────────────────────────────────────────────────────────────────────────┐
│ Windows GPU Machine (192.168.1.30)                                     │
│                                                                          │
│  ┌──────────────────────────────────────┐                               │
│  │ Docker Container                      │                               │
│  │ (gpu-transcription-worker)           │                               │
│  │                                       │                               │
│  │  ┌────────────────────────────────┐  │                               │
│  │  │ Celery Worker                  │  │                               │
│  │  │ Queue: transcription           │  │                               │
│  │  └──────────┬─────────────────────┘  │                               │
│  │             │                          │                               │
│  │             ▼                          │                               │
│  │  ┌────────────────────────────────┐  │                               │
│  │  │ Whisper AI                     │  │                               │
│  │  │ (CUDA GPU Accelerated)         │  │                               │
│  │  │ Model: base (74M params)       │  │                               │
│  │  └──────────┬─────────────────────┘  │                               │
│  │             │                          │                               │
│  │             ▼                          │                               │
│  │  ┌────────────────────────────────┐  │                               │
│  │  │ Read MP3 from:                 │  │                               │
│  │  │ /app/data/radio/phoenix_pd/    │  │                               │
│  │  │ (mounted from H:\ network drive│  │                               │
│  │  └──────────┬─────────────────────┘  │                               │
│  │             │                          │                               │
│  │             ▼                          │                               │
│  │  ┌────────────────────────────────┐  │                               │
│  │  │ Write transcription files:     │  │                               │
│  │  │ - .json (full transcription)   │  │                               │
│  │  │ - .txt (human-readable)        │  │                               │
│  │  │ Saved to same directory as MP3 │  │                               │
│  │  │ (via network share)            │  │                               │
│  │  └────────────────────────────────┘  │                               │
│  └──────────────────────────────────────┘                               │
│                                                                          │
│  ┌──────────────────────────────────────┐                               │
│  │ Network Drive H:\                    │                               │
│  │ Mounted: \\192.168.1.47\helicopter-data\radio                        │
│  │ (Read-Write for MP3s & transcriptions)│                              │
│  └──────────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Flow

### 1. Download Phase (Linux Server)

```bash
# Scheduled task runs on Linux server
Task: download_broadcastify_archives
├── Connects to Broadcastify
├── Downloads MP3 files
└── Saves to: /home/phx/phx-helicopter-tracker/data/radio/phoenix_pd/
    └── Creates database record in radio_archives table
```

### 2. Queue Transcription Task (Linux Server)

```bash
# After download completes
Task: transcribe_radio_archives
├── Finds untranscribed files in database
├── Creates Celery task
└── Sends to Redis queue: "transcription"
```

### 3. Task Pickup (Windows GPU Worker)

```bash
# GPU worker polls Redis
Celery Worker (Windows)
├── Connects to Redis: redis://192.168.1.47:6380
├── Polls queue: "transcription"
└── Receives task: transcribe_audio_file(file_id=123)
```

### 4. File Access (Windows GPU Worker)

```bash
# Worker reads MP3 from network share
Worker Process
├── Gets file path from database: "2024-10-07_00-00-00.mp3"
├── Reads from: /app/data/radio/phoenix_pd/2024-10-07_00-00-00.mp3
│   └── (Actually: H:\radio\phoenix_pd\2024-10-07_00-00-00.mp3)
│       └── (Network share: \\192.168.1.47\helicopter-data\radio\...)
└── Loads into memory for processing
```

### 5. Transcription (Windows GPU Worker)

```bash
# Whisper AI processes audio
Whisper Model (GPU)
├── Input: MP3 audio data
├── Processing: CUDA accelerated inference
├── Output: Text transcription with timestamps
└── Returns: {
    "text": "Unit 5-2-3 responding to incident at...",
    "segments": [
        {"start": 0.0, "end": 3.5, "text": "Unit 5-2-3..."},
        ...
    ]
}
```

### 6. Save Results (Windows GPU Worker)

```bash
# Worker saves transcription files to network share
File Write
├── Creates JSON file: 20250909_1757469230_12145.json
│   ├── Full transcription with segments
│   ├── Timestamps for each segment
│   └── Model metadata and performance info
├── Creates TXT file: 20250909_1757469230_12145.txt
│   ├── Human-readable format
│   ├── Timestamped segments
│   └── Full transcript text
└── Saved to: /app/data/radio/phoenix_pd/ (network share → Linux server)
```

### 7. Task Completion (Both Machines)

```bash
# Task result sent back via Redis
Worker → Redis
├── Sends task result to Redis
└── Marks task as SUCCESS

# Main server can query result
Linux Server → Redis
├── Reads task result
└── Updates task history in database
```

## Network Requirements

### Ports Required

| Service      | Port  | Direction                    | Protocol   |
|-------------|-------|------------------------------|------------|
| PostgreSQL  | 5433  | Windows → Linux              | TCP        |
| Redis       | 6380  | Windows → Linux              | TCP        |
| Samba/SMB   | 445   | Windows → Linux              | TCP        |
| NFS (alt)   | 2049  | Windows → Linux              | TCP/UDP    |

### Firewall Rules on Linux Server

```bash
sudo ufw allow from 192.168.1.30 to any port 5433 proto tcp  # PostgreSQL
sudo ufw allow from 192.168.1.30 to any port 6380 proto tcp  # Redis
sudo ufw allow from 192.168.1.30 to any port 445 proto tcp   # Samba
```

## Data Storage Locations

### Linux Server (192.168.1.47)

```
/home/phx/phx-helicopter-tracker/
├── data/
│   └── radio/
│       └── phoenix_pd/
│           ├── 2024-10-07_00-00-00.mp3        # 50MB (original)
│           ├── 2024-10-07_01-00-00.mp3        # 50MB
│           └── ... (total: ~36GB/month)
│
└── Database: phoenix_helicopters
    ├── radio_archives
    │   └── transcription_text (stored in DB)  # 5KB per file
    └── radio_transcriptions
        └── segment data                        # 10KB per file
```

### Windows Machine (192.168.1.30)

```
C:\transcription-worker\
├── backend/                                    # Code (13MB)
├── logs/                                       # Worker logs (100MB)
└── (No MP3 storage - reads from network)

H:\ (Network Drive)
└── radio/
    └── phoenix_pd/
        └── (Mounted from Linux, no local copy)
```

## Bandwidth & Performance

### Typical Transcription Job

- **File size:** 50MB MP3 (1 hour of audio)
- **Network read time:** ~5 seconds @ 100Mbps
- **GPU processing time:** ~30 seconds (with base model)
- **Database write:** <1 second (5KB of text)
- **Total time:** ~40 seconds per file

### Network Traffic

- **MP3 read:** 50MB per file (from network share)
- **Database writes:** 5KB per file (transcription text)
- **Task messages:** <1KB per task (Redis)
- **Total per file:** ~50MB download, negligible upload

### Optimization Tips

1. **Batch processing:** Process multiple files in one session to amortize network overhead
2. **Local cache:** Keep recently accessed files in container volume
3. **Compression:** Enable SMB compression for network share
4. **Faster network:** Use Gigabit Ethernet instead of WiFi

## Monitoring

### Check File Access

```powershell
# On Windows
docker exec gpu-transcription-worker ls -lh /app/data/radio/phoenix_pd/
```

### Check Database Connection

```powershell
# On Windows
docker exec gpu-transcription-worker python -c "
from app.db.database import SessionLocal
session = SessionLocal()
print('Database connected:', session.bind.url)
session.close()
"
```

### Check Transcription Progress

```bash
# On Linux server
docker compose exec db psql -U postgres phoenix_helicopters -c "
SELECT
    COUNT(*) FILTER (WHERE transcription_status = 'completed') as completed,
    COUNT(*) FILTER (WHERE transcription_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE transcription_status = 'processing') as processing,
    COUNT(*) FILTER (WHERE transcription_status = 'failed') as failed
FROM radio_archives;
"
```

## Troubleshooting

### Files Not Accessible

```powershell
# Test network share
dir H:\radio\phoenix_pd

# Test from container
docker exec gpu-transcription-worker ls /app/data/radio/phoenix_pd
```

### Slow Performance

```powershell
# Check network speed
Test-Connection 192.168.1.47 -Count 4

# Monitor bandwidth
# Use Windows Performance Monitor → Network Interface
```

### Database Connection Issues

```bash
# On Linux server - allow remote connections
# Edit: /home/phx/phx-helicopter-tracker/backend/.env
# Ensure: DATABASE_URL allows remote connections
```

## Security Considerations

1. **Network share is read-write** - Worker can read MP3s and write transcription files
2. **Worker should not modify/delete MP3s** - only create .json/.txt transcription files
3. **Firewall restricted** to specific IP (192.168.1.30)
4. **No MP3 storage on Windows** - reduces disk usage and backup needs
5. **Transcriptions on Linux server** - backed up with regular file backups
