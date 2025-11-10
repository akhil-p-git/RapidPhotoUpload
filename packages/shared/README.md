# RapidPhoto Shared Package

Shared code for RapidPhoto web and mobile applications.

## Structure

```
packages/shared/
├── src/
│   ├── api/          # API clients
│   ├── types/        # TypeScript types
│   ├── utils/        # Helper functions
│   └── constants/    # Constants
└── package.json
```

## Usage

### In Web App

```typescript
import { ApiClient, AuthApi, GalleryApi } from '@rapidphoto/shared';
```

### In Mobile App

```typescript
import { ApiClient, AuthApi, GalleryApi } from '@rapidphoto/shared';
```

## Building

```bash
cd packages/shared
pnpm build
```

## Development

```bash
cd packages/shared
pnpm dev  # Watch mode
```

