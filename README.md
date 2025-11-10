# RapidPhoto - Photo Upload & Gallery Application

A modern, production-ready photo upload and gallery application built with Spring Boot and React.

## 🚀 Features

- **Secure Authentication**: JWT-based authentication with Spring Security
- **Photo Upload**: Support for both direct uploads and chunked uploads for large files
- **Gallery View**: Responsive photo gallery with search, filters, and sorting
- **Image Processing**: Automatic thumbnail generation and EXIF data extraction
- **Storage Options**: Support for local storage and AWS S3
- **Real-time Updates**: WebSocket support for live upload progress
- **Rate Limiting**: Protection against abuse with configurable rate limits
- **Caching**: Performance optimization with Spring Cache
- **Monitoring**: Health checks and metrics via Spring Boot Actuator

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

### 1. Clone the repository
```bash
git clone <repository-url>
cd rapid-photo-upload
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start with Docker Compose
```bash
docker-compose up --build
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **API Documentation**: http://localhost:8080/swagger-ui.html

### 4. Manual Setup (Development)

#### Backend
```bash
cd apps/backend
./gradlew bootRun
```

#### Frontend (Web)
```bash
cd apps/web
pnpm install
pnpm dev
```

#### Mobile App
```bash
cd apps/mobile
pnpm install
pnpm start  # Expo development server
pnpm ios    # Run on iOS simulator
pnpm android # Run on Android emulator
```

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

### Docker Deployment

1. Build and start all services:
```bash
docker-compose up --build
```

2. Access the application:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080

### Production Deployment

1. Set environment variables
2. Use `application-prod.yml` profile
3. Configure S3 storage (recommended)
4. Set up reverse proxy (nginx/traefik)
5. Enable HTTPS
6. Configure monitoring and alerting

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
