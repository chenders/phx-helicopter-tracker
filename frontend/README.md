# Phoenix Helicopter Tracker - Frontend

React 18 + TypeScript frontend for tracking and visualizing Phoenix Police Department helicopter operations.

## 🏗️ Architecture

### Core Technologies

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool with HMR
- **Tailwind CSS** - Utility-first styling with dark mode
- **React Router** - Client-side routing
- **React Query** - Server state management and caching

### Key Libraries

#### Mapping & Visualization
- **Cesium** (1.133.1) - Photorealistic 3D globe with terrain
- **Google Maps API** - 2D interactive mapping
- **Leaflet** - Lightweight mapping library
- **Recharts** - Data visualization and charts

#### UI Components
- **Lucide React** - Icon library
- **date-fns** - Date formatting and manipulation

#### Communication
- **Axios** - HTTP client
- **Socket.io Client** - Real-time WebSocket updates

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── FlightVisualization3DCesiumFixed.tsx  # 3D flight replay
│   │   ├── Header.tsx                           # App header
│   │   ├── Sidebar.tsx                          # Navigation sidebar
│   │   ├── MobileNav.tsx                        # Mobile navigation
│   │   ├── GoogleMapsProvider.tsx               # Maps wrapper
│   │   ├── CreditUsageWidget.tsx                # API credit monitor
│   │   ├── DarkModeToggle.tsx                   # Theme switcher
│   │   └── __tests__/                           # Component tests
│   ├── pages/               # Route pages
│   │   ├── HomePage.tsx                  # Dashboard
│   │   ├── LiveTrackingPage.tsx          # Real-time map
│   │   ├── FlightSearchPage.tsx          # Search flights
│   │   ├── FlightDetailPage.tsx          # Flight detail + 3D
│   │   ├── RadioPage.tsx                 # Radio archives
│   │   ├── PatternAnalysisPage.tsx       # Pattern detection
│   │   ├── AbnormalPatternsPage.tsx      # Anomalies
│   │   ├── CostAnalysisPage.tsx          # Cost tracking
│   │   ├── HistoricalAnalysisPage.tsx    # Trends
│   │   ├── LegalDocumentsPage.tsx        # Legal docs
│   │   ├── DataSourcesPage.tsx           # Source info
│   │   ├── DataQualityPage.tsx           # Quality metrics
│   │   ├── TaskMonitoringPage.tsx        # Task status
│   │   └── LogsPage.tsx                  # System logs
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Root component with routing
│   └── main.tsx             # Application entry point
├── tests/                   # Playwright E2E tests
│   ├── images/              # Test screenshots
│   └── *.spec.ts            # Test files
├── public/                  # Static assets
├── playwright.config.ts     # Playwright configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite build configuration
```

## 🚀 Quick Start

### Installation

```bash
cd frontend

# Install dependencies
npm install
```

### Development

```bash
# Start development server (http://localhost:3000)
npm run dev

# Type check
npm run tsc

# Lint
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file in the `frontend/` directory:

```bash
# Google Maps API Key (for elevation data and 2D maps)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Google Tiles API Key (for Cesium 3D photorealistic tiles)
VITE_GOOGLE_TILES_API_KEY=your_google_tiles_api_key
```

## 🧪 Testing

### Unit Tests (Vitest)

```bash
# Run unit tests
npm test

# Run with watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npx playwright test

# Run with UI mode
npx playwright test --ui

# Run specific test
npx playwright test tests/flight-detail.spec.ts

# Debug tests
npx playwright test --debug
```

**Test Screenshots**: Automatically saved to `tests/images/` on test failures.

### Test Organization

- **Unit tests**: `src/__tests__/` or alongside components as `.test.tsx`
- **E2E tests**: `tests/*.spec.ts`
- **Test images**: `tests/images/`

## 🗺️ Key Features

### 3D Flight Visualization

The `FlightVisualization3DCesiumFixed.tsx` component provides:
- Photorealistic 3D globe using Cesium
- Google Photorealistic 3D Tiles for terrain
- Cinematic flight replay with smooth camera tracking
- HUD display (speed, altitude, heading)
- Pause/play controls with timeline scrubbing

### Real-time Updates

- WebSocket connection for live flight position updates
- React Query for automatic cache invalidation
- Optimistic UI updates

### Dark Mode

Full dark mode support via Tailwind CSS:
- System preference detection
- Manual toggle via `DarkModeToggle` component
- Persisted in localStorage

## 🎨 Styling

### Tailwind CSS

Utility-first CSS framework with custom configuration:

```bash
# Tailwind config
tailwind.config.js

# PostCSS config
postcss.config.js

# Global styles
src/index.css
```

### Dark Mode Classes

```tsx
// Example: Dark mode styling
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content
</div>
```

## 🔄 State Management

### React Query

Server state management with automatic caching:

```tsx
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['flights', id],
  queryFn: () => fetchFlight(id),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Local State

- `useState` for component state
- `useContext` for shared state
- Custom hooks for complex logic

## 🛣️ Routing

React Router v6 with route-based code splitting:

```tsx
// src/App.tsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/live" element={<LiveTrackingPage />} />
  <Route path="/flights" element={<FlightSearchPage />} />
  <Route path="/flights/:id" element={<FlightDetailPage />} />
  {/* ... more routes */}
</Routes>
```

## 📡 API Integration

### Axios Configuration

```tsx
// Configured with base URL and interceptors
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Request/response interceptors for error handling
```

### WebSocket Connection

```tsx
// Socket.io for real-time updates
import { io } from 'socket.io-client';

const socket = io({
  path: '/ws',
  transports: ['websocket', 'polling'],
});

socket.on('flight_update', (data) => {
  // Handle real-time flight position
});
```

## 🏗️ Build & Deployment

### Production Build

```bash
# Build optimized production bundle
npm run build

# Output: dist/
# - Minified JS/CSS
# - Tree-shaken dependencies
# - Code-split chunks
# - Asset optimization
```

### Build Configuration

Vite configuration in `vite.config.ts`:
- Cesium plugin for 3D assets
- Path aliases
- Proxy configuration for backend API
- Environment variable handling

## 🔧 Development Tips

### Hot Module Replacement (HMR)

Vite provides instant HMR:
- Save file → Instant browser update
- Preserves React component state
- Fast CSS updates

### TypeScript

Full type safety:
```bash
# Type checking (no emit)
npm run tsc

# Watch mode
npm run tsc -- --watch
```

### Debugging

- **React DevTools**: Browser extension for component inspection
- **React Query DevTools**: Included in dev mode for cache debugging
- **Source maps**: Enabled in development for debugging

## 🌐 Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- WebGL 2.0 required for Cesium 3D

## 📚 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.2.0 | UI framework |
| typescript | Latest | Type safety |
| vite | Latest | Build tool |
| cesium | 1.133.1 | 3D globe |
| @tanstack/react-query | 4.36.1 | Server state |
| react-router-dom | 6.17.0 | Routing |
| tailwindcss | 3.3.5 | Styling |
| recharts | 2.8.0 | Charts |
| axios | 1.6.0 | HTTP client |
| socket.io-client | 4.7.2 | WebSocket |
| @playwright/test | 1.55.1 | E2E testing |

## 🐛 Common Issues

### Cesium Assets Not Loading

Ensure Cesium assets are properly configured in `vite.config.ts`:
```ts
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), cesium()],
});
```

### CORS Errors

Backend proxy configured in `vite.config.ts`:
```ts
server: {
  proxy: {
    '/api': 'http://localhost:8001',
  },
}
```

### Dark Mode Flashing

Add dark mode script to `index.html` before app loads to prevent flash.

## 📄 Additional Resources

- Main README: `/home/phx/phx-helicopter-tracker/README.md`
- Backend README: `/home/phx/phx-helicopter-tracker/backend/README.md`
- Cesium Documentation: https://cesium.com/docs/
- React Query Docs: https://tanstack.com/query/latest
- Tailwind CSS Docs: https://tailwindcss.com/docs
