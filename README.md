# Travel Route Record and Planning Tool

> &#x65C5;&#x884C;&#x8F68;&#x8FF9;&#x8BB0;&#x5F55;&#x4E0E;&#x89C4;&#x5212;&#x5DE5;&#x5177;

This project is a React, TypeScript, Vite, Leaflet, and Express application for recording and planning travel routes. It organizes a trip into trips, days, and route segments, then displays route geometry, distances, waypoints, notes, and segment scores on a map.

The app currently supports two workspaces:

- Review: record routes that have already been travelled.
- Plan: prepare future routes before a trip.

## Quick Start

### Requirements

- Windows
- Node.js 20 LTS or newer
- npm
- An AMap Web Service API key for place suggestions and route planning

Check Node.js and npm:

```bash
node -v
npm -v
```

### First Run On Windows

From the project root, double-click:

Use the initialization batch file in the project root. After initialization finishes, run the startup batch file.

The app starts the frontend and backend, then opens:

```text
http://localhost:5173
```

### Daily Startup

The project root contains Windows `.bat` helpers for common tasks:

- Start the full app.
- Stop local services.
- Start only the frontend.
- Start only the backend.

## Environment Variables

Copy `.env.example` to `.env.local`, then fill in your AMap key:

```bash
AMAP_WEB_API_KEY=your-amap-web-service-key
BACKEND_PORT=3001
VITE_BACKEND_BASE_URL=http://localhost:3001
VITE_APP_MODE=normal
```

The backend reads AMap keys in this order:

1. `AMAP_WEB_API_KEY`
2. `AMAP_WEB_KEY`
3. `AMAP_KEY`

The key is used only by the backend proxy and is not exposed directly to the browser.

## Development Commands

Install dependencies:

```bash
npm install
```

Start frontend and backend together:

```bash
npm run dev
```

Start only the frontend:

```bash
npm run dev:frontend
```

Start only the backend:

```bash
npm run dev:backend
```

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Features

- Create, edit, delete, and reorder trips.
- Organize routes by workspace, trip, day, and segment.
- Edit segment name, date, start point, end point, and waypoints.
- Use AMap services for place suggestions and route planning.
- Support driving and cycling route types.
- Display one segment, one day, one trip, or all trips on the map.
- Track segment, day, and trip distances.
- Store scenic score, difficulty score, and notes for route segments.
- Color routes by score mode.
- Support readonly demo mode.
- Export local backups that include trip data and route-cache records.

## Readonly Demo Mode

Readonly demo mode is useful for public demos and static deployment.

Run locally:

```bash
VITE_APP_MODE=readonly-demo npm run dev:frontend
```

Build:

```bash
VITE_APP_MODE=readonly-demo npm run build
```

Demo data is loaded from:

```text
public/demo-data/manifest.json
public/demo-data/part-01.json
```

To split a larger demo-data file into chunks:

```bash
node scripts/split-demo-data.mjs
```

By default, the script reads:

```text
backup/demo-data.json
```

You can also pass a custom source file:

```bash
node scripts/split-demo-data.mjs path/to/demo-data.json
```

## Data Storage

In normal mode, data is stored locally in the browser:

- Trip metadata is stored in `localStorage`.
- Large route geometry is cached in `IndexedDB`.

This avoids putting large polyline data directly into `localStorage`.

The backup export button creates a JSON file containing:

- Trip, day, and segment data.
- IndexedDB route-cache records.
- Export timestamp and summary counts.

## Project Structure

```text
backend/             Express backend and AMap proxy routes
public/demo-data/    Readonly demo-data chunks
scripts/             Data processing scripts
src/components/      React UI components
src/hooks/           Business state hooks
src/services/        Storage, map, backup, and demo-data services
src/styles/          CSS files
src/types/           TypeScript domain types
src/utils/           Shared utility functions
tests/               Backend proxy tests
```

## Troubleshooting

### Place suggestions or route planning do not work

Check that:

- `.env.local` exists.
- `AMAP_WEB_API_KEY` is set correctly.
- The backend service is running.
- Services were restarted after changing environment variables.

### The browser page does not open

Check that:

- Node.js is installed.
- `npm install` has been run.
- Port `5173` is not occupied.
- Port `3001` is not occupied.

### The map does not show a route

Possible causes:

- The start or end coordinate is missing.
- AMap API quota is exhausted or the upstream request failed.
- No route is available for the selected conditions.
- Readonly demo data does not include cached route points.

## Tech Stack

- React 18
- TypeScript
- Vite
- Leaflet / React Leaflet
- Express
- AMap Web Service API
- localStorage
- IndexedDB
- Node.js test runner
