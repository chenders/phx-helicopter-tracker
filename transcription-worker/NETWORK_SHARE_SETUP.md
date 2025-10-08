# Network Share Setup for Radio Files

The transcription worker on Windows needs access to the radio MP3 files stored on the Linux server. This guide shows you how to set up a network share.

## Architecture

```
Linux Server (192.168.1.47)              Windows Machine (192.168.1.30)
├── /home/phx/phx-helicopter-tracker/    ├── Transcription Worker Container
│   └── data/radio/phoenix_pd/           │   └── /app/data/radio/phoenix_pd/
│       ├── 2024-10-01_00-00-00.mp3      │       (mounted from network share)
│       ├── 2024-10-01_01-00-00.mp3      │
│       └── ...                          └── Writes transcriptions to DB
```

**Data Flow:**
1. Linux server downloads MP3s from Broadcastify → `/home/phx/phx-helicopter-tracker/data/radio/phoenix_pd/`
2. Windows mounts this directory via network share
3. Worker reads MP3s from network share
4. Worker writes transcriptions directly to PostgreSQL database (192.168.1.47:5433)

## Setup Methods

Choose ONE of these methods:

---

## Method 1: Samba Share (Recommended)

### On Linux Server (192.168.1.47)

#### 1. Install Samba

```bash
sudo apt update
sudo apt install samba -y
```

#### 2. Create Samba User

```bash
# Add samba user (use your existing username)
sudo smbpasswd -a phx
# Enter a password when prompted (e.g., "phx123" - remember this!)
```

#### 3. Configure Samba Share

```bash
sudo nano /etc/samba/smb.conf
```

Add this at the end of the file:

```ini
[helicopter-data]
   path = /home/phx/phx-helicopter-tracker/data
   valid users = phx
   read only = no
   browsable = yes
   create mask = 0755
   directory mask = 0755
```

#### 4. Restart Samba

```bash
sudo systemctl restart smbd
sudo systemctl enable smbd
```

#### 5. Open Firewall

```bash
sudo ufw allow samba
# Or specifically:
sudo ufw allow 445/tcp
sudo ufw allow 139/tcp
```

### On Windows Machine (192.168.1.30)

#### 1. Map Network Drive

Open PowerShell as Administrator:

```powershell
# Create credential
$password = ConvertTo-SecureString "phx123" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ("phx", $password)

# Map drive
New-PSDrive -Name "H" -PSProvider FileSystem -Root "\\192.168.1.47\helicopter-data" -Credential $credential -Persist
```

Or use File Explorer:
1. Open File Explorer
2. Right-click "This PC" → "Map network drive"
3. Drive letter: `H:`
4. Folder: `\\192.168.1.47\helicopter-data`
5. Check "Reconnect at sign-in"
6. Click Finish
7. Enter username: `phx`
8. Enter password: `phx123`

#### 2. Verify Access

```powershell
# Should show radio files
dir H:\radio\phoenix_pd
```

#### 3. Update docker-compose.yml

Edit `C:\transcription-worker\docker-compose.yml`:

```yaml
services:
  transcription-worker:
    # ... existing config ...
    volumes:
      # Mount the network drive into container
      - H:/radio:/app/data/radio:ro  # Read-only access
      - ./logs:/app/logs
```

---

## Method 2: NFS Share (Alternative)

### On Linux Server

#### 1. Install NFS Server

```bash
sudo apt update
sudo apt install nfs-kernel-server -y
```

#### 2. Configure NFS Export

```bash
sudo nano /etc/exports
```

Add this line:

```
/home/phx/phx-helicopter-tracker/data/radio 192.168.1.30(ro,sync,no_subtree_check)
```

#### 3. Apply Changes

```bash
sudo exportfs -a
sudo systemctl restart nfs-kernel-server
sudo ufw allow from 192.168.1.30 to any port nfs
```

### On Windows Machine

Windows requires NFS client:

```powershell
# Enable NFS Client (requires restart)
Enable-WindowsOptionalFeature -Online -FeatureName ServicesForNFS-ClientOnly -All

# After restart, mount NFS
mount -o nolock 192.168.1.47:/home/phx/phx-helicopter-tracker/data/radio H:\
```

Then update docker-compose.yml as above.

---

## Method 3: Docker Volume with SSH/SSHFS (Most Secure)

This method uses SSH to mount the remote directory.

### On Windows Machine

#### 1. Install SSHFS-Win

Download from: https://github.com/winfsp/sshfs-win/releases

#### 2. Map Drive via SSHFS

```powershell
# Map using SSHFS
net use H: \\sshfs\phx@192.168.1.47\home\phx\phx-helicopter-tracker\data
```

#### 3. Update docker-compose.yml

Same as Method 1 above.

---

## Updated docker-compose.yml

After setting up network share, update your `docker-compose.yml`:

```yaml
version: '3.8'

services:
  transcription-worker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: gpu-transcription-worker
    hostname: gpu-worker
    restart: unless-stopped

    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility
      - WHISPER_MODEL=base
      - REDIS_URL=redis://192.168.1.47:6380
      - DATABASE_URL=postgresql://postgres:postgres@192.168.1.47:5433/phoenix_helicopters
      - PYTHONUNBUFFERED=1
      - PYTHONDONTWRITEBYTECODE=1

    volumes:
      # IMPORTANT: Mount network share for radio files
      - H:/radio:/app/data/radio      # Read-write (transcriptions saved here)
      - ./logs:/app/logs              # Write logs locally

    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

**Key points:**
- `H:/radio:/app/data/radio` - Mount network drive H: (the Samba share) with read-write access
- Worker reads MP3s and writes transcription files (.json/.txt) to the same directory
- `./logs:/app/logs` - Logs are written locally on Windows machine

---

## Verification

### 1. Check Network Share Access

On Windows:
```powershell
# Verify you can see files
dir H:\radio\phoenix_pd
```

### 2. Check Container Access

```powershell
# Start container
docker-compose up -d

# Check if container can see files
docker exec gpu-transcription-worker ls -la /app/data/radio/phoenix_pd

# Should show MP3 files
```

### 3. Monitor Transcription

Check logs:
```powershell
docker-compose logs -f
```

You should see:
```
transcription-worker | Found 150 audio files to transcribe
transcription-worker | Processing: 2024-10-01_00-00-00.mp3
transcription-worker | Transcription complete, saving to database...
```

---

## Troubleshooting

### "Access Denied" on Network Share

**Windows:**
```powershell
# Re-authenticate
net use H: /delete
net use H: \\192.168.1.47\helicopter-data /user:phx phx123
```

**Linux:**
```bash
# Check Samba is running
sudo systemctl status smbd

# Check permissions
ls -la /home/phx/phx-helicopter-tracker/data/radio
```

### Container Can't See Files

```powershell
# Check mount in container
docker exec gpu-transcription-worker df -h
docker exec gpu-transcription-worker mount | grep radio
```

### Performance Issues

Network shares can be slow. To improve:

1. **Use wired Ethernet** instead of WiFi
2. **SMB3 protocol** - Edit `/etc/samba/smb.conf`:
   ```ini
   [global]
   min protocol = SMB3
   ```
3. **Larger read buffers** - In docker-compose.yml:
   ```yaml
   volumes:
     - type: bind
       source: H:/radio
       target: /app/data/radio
       read_only: true
       bind:
         create_host_path: true
   ```

---

## Security Notes

- Network share uses **read-write** mount - worker can read MP3s and write transcription files
- Transcriptions saved as .json and .txt files alongside MP3s on Linux server
- Use strong password for Samba user
- Consider VPN if accessing over internet
- Firewall rules restrict access to your Windows machine IP only
- Worker should not delete/modify MP3 files (only read and create transcriptions)

---

## Alternative: Download Files to Windows

If network share has issues, you can sync files periodically:

**Option A: Robocopy (Windows)**
```powershell
# Create sync script: sync-radio-files.ps1
robocopy \\192.168.1.47\helicopter-data\radio C:\transcription-worker\data\radio /MIR /Z /R:3

# Schedule to run hourly
schtasks /create /tn "Sync Radio Files" /tr "powershell.exe C:\sync-radio-files.ps1" /sc hourly
```

Then mount local directory:
```yaml
volumes:
  - C:/transcription-worker/data/radio:/app/data/radio:ro
```

**Option B: SyncThing**
Install SyncThing on both machines for automatic file sync.
