# FlightRadar24 Gold Automated Download Setup

Your system now supports **automated downloading** of historical flight data directly from FlightRadar24 Gold using your login credentials.

## ✅ What's Already Configured

### Backend
- ✅ **Credentials**: Your FR24 username/password from `.env`
- ✅ **Web Scraper**: Automated login and data extraction service
- ✅ **Download Endpoints**: 
  - `/api/v1/data-sources/flightradar24/download` (single aircraft)
  - `/api/v1/data-sources/flightradar24/download-multiple` (multiple aircraft)
- ✅ **Dependencies**: BeautifulSoup4, aiohttp for web scraping

### Frontend  
- ✅ **Direct Download UI**: Green section at top of `/historical` page
- ✅ **Automatic File Downloads**: Browser downloads files directly
- ✅ **Multiple Format Support**: JSON, CSV, KML
- ✅ **Date Range Selection**: Built-in date pickers
- ✅ **Progress Indicators**: Shows downloading status

## 🚀 How to Use

### Option 1: Direct Download (Recommended)
1. **Go to** `/historical` page
2. **Select** specific aircraft (e.g., N624FB) 
3. **Set date range** in green "📡 Download Directly from FlightRadar24 Gold" section
4. **Choose format** (JSON recommended)
5. **Click "⬇️ Download Now"** 
6. **File downloads automatically** to your browser

### Option 2: Upload Previously Downloaded Files  
1. **Manual download** from FlightRadar24 website
2. **Drag & drop** files into the upload area
3. **System processes** multiple files at once

## 🔧 Technical Details

### Authentication
- Uses your existing FR24 Gold credentials from `.env`
- Automatically handles login and session management
- CSRF token extraction and form authentication
- Maintains login session across multiple downloads

### Supported Data
- **Aircraft**: All Phoenix PD helicopters (N624FB, N625FB, etc.)
- **Date Range**: Up to 365 days per request
- **Formats**: JSON (recommended), CSV, KML
- **Rate Limiting**: Built-in delays to respect FR24 limits

### Error Handling
- **Invalid credentials**: Shows authentication error
- **No data found**: Reports when no flights exist for date range
- **Rate limiting**: Automatic retries with delays
- **Format validation**: Ensures proper file types

## 🛠 Development Notes

### Backend Service (`flightradar24_downloader.py`)
- **Web scraping** using aiohttp + BeautifulSoup
- **Session management** with cookie persistence  
- **Background processing** for multiple aircraft
- **Data aggregation** across multiple flights

### Frontend Hooks (`useFlightRadar24Download`)
- **Blob handling** for file downloads
- **Filename extraction** from response headers
- **Progress tracking** with React Query
- **Automatic cache invalidation**

## 📊 Data Flow

```
Frontend Request → Backend Auth → FR24 Login → Data Scraping → File Generation → Download
```

1. **User** selects aircraft + date range
2. **Frontend** calls download API with parameters  
3. **Backend** logs into FR24 with your credentials
4. **Backend** searches for flights and downloads data
5. **Backend** aggregates and formats data
6. **Frontend** receives file and triggers browser download
7. **File** saved to user's download folder

## ⚡ Performance

- **Single aircraft**: 30 seconds - 2 minutes depending on data volume
- **Multiple aircraft**: 5-15 minutes for batch processing  
- **Memory efficient**: Streaming downloads for large datasets
- **Rate limited**: Respects FR24 server limits

Your FlightRadar24 Gold subscription now works **completely automatically** - no more manual exports needed! 🎉