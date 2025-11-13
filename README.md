# RapidPhotoUpload - Ultra-Fast Photo Upload Platform ⚡

A modern, production-ready photo upload and gallery application built with Spring Boot and React.

## ⚡ Ultra-Fast Mode (NEW!)

**Upload 1000 images in 2-3 minutes!** (was 15-20 minutes)

- **6-8x faster** bulk uploads
- 5 parallel chunks per file
- 150 concurrent file uploads
- 1000 requests/minute rate limit
- HTTP/2 enabled

📖 **[Quick Start Guide →](QUICK_START.md)** | **[Full Deployment Guide →](DEPLOYMENT_GUIDE.md)** | **[Performance Details →](ULTRA_FAST_MODE.md)**

---

## 🚀 Features

- **⚡ Ultra-Fast Uploads**: Optimized for bulk uploads with parallel chunk processing
- **Secure Authentication**: JWT-based authentication with Spring Security
- **Chunked Upload**: Support for large files with resumable uploads
- **Gallery View**: Responsive photo gallery with search, filters, and sorting
- **Image Processing**: Automatic thumbnail generation and EXIF data extraction
- **Storage Options**: CloudFlare R2 (S3-compatible) and local storage
- **Real-time Updates**: WebSocket support for live upload progress
- **Rate Limiting**: Configurable rate limits (1000 req/min in ultra-fast mode)
- **Caching**: Performance optimization with Caffeine cache
- **Monitoring**: Complete metrics with Prometheus integration

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │     │  Spring     │     │ PostgreSQL  │
│  Frontend   │────▶│   Backend   │────▶│  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
┌─────────────┐            ▼
│   React     │     ┌─────────────┐
│   Native    │────▶│  AWS S3 /   │
│   Mobile    │     │ Local FS    │
└─────────────┘     └─────────────┘
```

### Monorepo Structure

```
rapid-photo-upload/
├── apps/
│   ├── backend/         # Spring Boot API
│   ├── web/             # React Web App
│   └── mobile/          # React Native Mobile App
├── packages/
│   └── shared/          # Shared code (API clients, types, utils)
└── docker-compose.yml
```

## 🛠️ Tech Stack

### Backend
- **Java 17** with Spring Boot 3.3.5
- **PostgreSQL** for data persistence
- **Spring Security** for authentication
- **JWT** for stateless authentication
- **Flyway** for database migrations
- **Thumbnailator** for image processing
- **Bucket4j** for rate limiting
- **Caffeine** for caching

### Frontend (Web)
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Router** for navigation

### Mobile App
- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for navigation
- **Expo Camera** for camera access
- **Expo Image Picker** for gallery selection
- **React Native Fast Image** for optimized image loading
- **Expo Secure Store** for secure token storage

## 📋 Prerequisites

- **Java 17+**
- **Node.js 20+** and **pnpm**
- **PostgreSQL 15+**
- **Docker** and **Docker Compose** (for containerized deployment)
- **AWS Account** (optional, for S3 storage)

## 🚀 Quick Start

### Automated (Recommended)

```bash
# Run locally (frontend + backend + database)
./scripts/deploy.sh local

# Deploy to GitHub
./scripts/deploy.sh github

# Deploy to production (Vercel)
./scripts/deploy.sh production
```

### Manual Setup

#### 1. Clone the repository
```bash
git clone https://github.com/akhil-p-git/RapidPhotoUpload.git
cd RapidPhotoUpload
```

#### 2. Start database
```bash
docker-compose up postgres -d
```

#### 3. Install dependencies
```bash
pnpm install
```

#### 4. Start backend
```bash
pnpm dev:backend
```

#### 5. Start frontend
```bash
pnpm dev:web
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/actuator/health
- **Metrics**: http://localhost:8080/actuator/prometheus

---

## 📚 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get started in 3 steps
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Ultra-Fast Mode](ULTRA_FAST_MODE.md)** - Performance optimizations explained
- **[Performance Comparison](PERFORMANCE_COMPARISON.md)** - Performance benchmarks
- **[Architecture Analysis](UPLOAD_ARCHITECTURE_ANALYSIS.md)** - Deep dive into architecture

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | `jdbc:postgresql://localhost:54321/rapidphotoupload` |
| `DATABASE_USERNAME` | Database username | `postgres` |
| `DATABASE_PASSWORD` | Database password | `postgres` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | - |
| `STORAGE_TYPE` | Storage type: `local` or `s3` | `local` |
| `S3_BUCKET_NAME` | S3 bucket name (if using S3) | - |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY` | AWS access key | - |
| `AWS_SECRET_KEY` | AWS secret key | - |

See `.env.example` for complete list.

### Application Profiles

- **dev**: Development profile with debug logging
- **prod**: Production profile with optimized settings
- **test**: Test profile with H2 in-memory database

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout (client-side token removal)
- `GET /api/auth/me` - Get current user info

### Photo Endpoints

- `GET /api/photos` - List photos (with pagination, filters, search)
- `GET /api/photos/{id}` - Get photo details
- `GET /api/photos/{id}/file?size={size}` - Get photo file (thumbnail, medium, large, original)
- `DELETE /api/photos/{id}` - Delete photo (soft delete)
- `GET /api/photos/stats` - Get photo statistics

### Upload Endpoints

- `POST /api/upload` - Direct upload (for small files)
- `POST /api/upload/initialize` - Initialize chunked upload
- `POST /api/upload/chunk` - Upload chunk

See `API.md` for detailed API documentation.

## 🧪 Testing

### Run Backend Tests
```bash
cd apps/backend
./gradlew test
```

### Run Integration Tests
```bash
cd apps/backend
./gradlew integrationTest
```

### Load Testing
```bash
# Use tools like Apache Bench or k6
ab -n 1000 -c 100 http://localhost:8080/api/photos
```

## 📦 Deployment

See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for complete deployment instructions.

### Quick Deploy Commands

```bash
# Run locally
./scripts/deploy.sh local

# Push to GitHub
./scripts/deploy.sh github

# Deploy frontend to Vercel
./scripts/deploy.sh production
```

### Production Stack

- **Frontend**: Vercel (auto-deploy from GitHub)
- **Backend**: Railway / Render / AWS EC2
- **Database**: PostgreSQL (Railway/RDS)
- **Storage**: CloudFlare R2 (S3-compatible)
- **Monitoring**: Prometheus + Grafana

### Environment Requirements

**Ultra-Fast Mode**:
- CPU: 8+ cores
- RAM: 8 GB
- Network: 1 Gbps
- DB Connections: 50

**Standard Mode**:
- CPU: 4 cores
- RAM: 4-6 GB
- Network: 500 Mbps
- DB Connections: 50

## 🔍 Monitoring

### Health Checks
- `GET /actuator/health` - Application health status
- `GET /actuator/info` - Application information

### Metrics
- `GET /actuator/metrics` - Application metrics
- `GET /actuator/prometheus` - Prometheus metrics endpoint

## 🐛 Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check connection credentials in `.env`
- Ensure database exists

### Upload Failures
- Check file size limits (default: 100MB)
- Verify storage configuration
- Check disk space (for local storage)

### Authentication Issues
- Verify JWT secret is set
- Check token expiration time
- Ensure token is included in `Authorization: Bearer <token>` header

## 🤝 Contributing

See `CONTRIBUTING.md` for development guidelines.

## 📄 License

[Your License Here]

## 👥 Authors

[Your Name/Team]

## 🙏 Acknowledgments

- Spring Boot team
- React team
- All open-source contributors
