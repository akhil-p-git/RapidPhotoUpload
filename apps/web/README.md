# RapidPhotoUpload Web App

React + TypeScript web application for the Rapid Photo Upload platform.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Axios** for HTTP requests
- **WebSocket** for real-time progress updates

## Prerequisites

- Node.js 18+
- pnpm 8+

## Setup

1. **Install dependencies** (from root):
   ```bash
   pnpm install
   ```

2. **Start development server**:
   ```bash
   # From root
   pnpm dev:web

   # Or from apps/web
   cd apps/web
   pnpm dev
   ```

3. **Visit**: http://localhost:3000

## Development

The app runs on port 3000 with proxy configuration:

- `/api/*` → `http://localhost:8080/api/*`
- `/ws/*` → `ws://localhost:8080/ws/*`

## Project Structure

```
src/
├── api/              # API client and upload functions
├── components/       # React components
├── hooks/           # Custom React hooks
├── services/        # WebSocket service
├── types/           # TypeScript type definitions
├── App.tsx          # Main app component
└── main.tsx         # Entry point
```

## Features

- ✅ React + TypeScript setup
- ✅ Vite for fast development
- ✅ API client configured
- ✅ WebSocket service for real-time updates
- ✅ Upload hooks and components
- ✅ TypeScript types defined
- ✅ Proxy configuration for backend

## Build

```bash
pnpm build
```

## Preview

```bash
pnpm preview
```

