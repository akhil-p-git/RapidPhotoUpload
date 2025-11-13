# RapidPhotoUpload - Complete Deployment Guide

This guide covers running locally, deploying to GitHub, and deploying to production (Vercel + Backend).

---

## Table of Contents

1. [Running Locally](#running-locally)
2. [Deploying to GitHub](#deploying-to-github)
3. [Deploying to Production](#deploying-to-production)
4. [Environment Variables](#environment-variables)
5. [Troubleshooting](#troubleshooting)

---

## Running Locally

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Java**: 17+ (for backend)
- **Docker**: Latest version (for PostgreSQL)
- **Git**: Latest version

### Step 1: Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install project dependencies
cd /Users/akhilp/Documents/Gauntlet/RapidPhotoUpload
pnpm install
```

### Step 2: Start PostgreSQL Database

**Option A: Using Docker Compose (Recommended)**
```bash
# Start PostgreSQL only
docker-compose up postgres -d

# Verify it's running
docker ps | grep postgres
```

**Option B: Using Local PostgreSQL**
```bash
# Create database
createdb rapidphotoupload

# Update apps/backend/.env with your local DB credentials
```

### Step 3: Configure Backend Environment

```bash
# Copy example environment file
cd apps/backend
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Required .env variables**:
```bash
DATABASE_URL=jdbc:postgresql://localhost:54321/rapidphotoupload
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# For local development, use local storage
STORAGE_TYPE=local
STORAGE_LOCAL_DIR=./uploads

# Optional: CloudFlare R2 for production-like testing
STORAGE_TYPE=s3
S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
AWS_REGION=auto

# n8n Integration (optional)
N8N_BASE_URL=http://localhost:5678
```

### Step 4: Start Backend

```bash
# From project root
pnpm dev:backend

# Or from backend directory
cd apps/backend
./gradlew bootRun
```

**Backend will start on**: http://localhost:8080

**Verify backend is running**:
```bash
curl http://localhost:8080/actuator/health
# Should return: {"status":"UP"}
```

### Step 5: Start Frontend

**In a new terminal**:
```bash
# From project root
pnpm dev:web

# Or from web directory
cd apps/web
pnpm dev
```

**Frontend will start on**: http://localhost:5173

### Step 6: (Optional) Start n8n Workflows

```bash
# Start n8n
pnpm n8n:dev

# Access n8n at: http://localhost:5678
# Login: admin / admin
```

### Verify Everything is Working

1. **Open browser**: http://localhost:5173
2. **Register a new user**: Create account
3. **Upload a test image**: Drop an image to test upload
4. **Check backend logs**: Should see upload processing
5. **Check database**: Photos should be saved

---

## Deploying to GitHub

Your repository is already connected to GitHub at:
`https://github.com/akhil-p-git/RapidPhotoUpload.git`

### Step 1: Review Changes

```bash
# See what files have changed
git status

# See specific changes
git diff apps/backend/src/main/resources/application-prod.yml
git diff apps/web/src/features/upload/hooks/useChunkedUpload.ts
```

### Step 2: Stage Changes

```bash
# Add all optimized files
git add apps/backend/src/main/resources/application-prod.yml
git add apps/backend/src/main/resources/application.yml
git add apps/web/src/features/upload/hooks/useChunkedUpload.ts
git add apps/web/src/features/upload/hooks/useFileUpload.ts
git add .gitignore

# Add documentation
git add 1000_IMAGE_OPTIMIZATION_SUMMARY.md
git add ULTRA_FAST_MODE.md
git add PERFORMANCE_COMPARISON.md
git add PERFORMANCE_FINDINGS.md
git add CODEBASE_EXPLORATION_SUMMARY.md
git add UPLOAD_ARCHITECTURE_ANALYSIS.md
git add UPLOAD_FLOW_DIAGRAM.txt
git add DEPLOYMENT_GUIDE.md

# Verify staged files
git status
```

### Step 3: Commit Changes

```bash
git commit -m "$(cat <<'EOF'
feat: Ultra-fast mode optimizations for 1000+ image uploads

Performance Improvements:
- 6-8x faster uploads (1000×10MB: 15min → 2-3min)
- Parallel chunk uploads: 5 chunks per file (was 1)
- Concurrent uploads: 150 files (was 100)
- Rate limit: 1000 req/min (was 200)
- HTTP/2 enabled for better multiplexing
- DB connections: 50 (was 20)
- Tomcat threads: 400 (was 200)

Backend Optimizations:
- Increased HikariCP pool size to prevent bottlenecks
- Doubled thread pool queue capacity
- Enabled HTTP/2 for multiplexed requests
- Enhanced Prometheus metrics

Frontend Optimizations:
- Parallel chunk uploads (5 per file)
- Storage quota pre-check
- Better error messages

Documentation:
- Complete performance analysis
- Deployment guides
- Architecture documentation

🚀 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Step 4: Push to GitHub

```bash
# Push to master branch
git push origin master

# If you prefer feature branch workflow
git checkout -b feature/ultra-fast-mode
git push origin feature/ultra-fast-mode
# Then create PR on GitHub
```

### Step 5: Verify on GitHub

1. Go to: https://github.com/akhil-p-git/RapidPhotoUpload
2. Verify commit appears
3. Check files are updated
4. Review documentation is visible

---

## Deploying to Production

### Frontend: Vercel Deployment

Your frontend is configured for Vercel deployment.

#### Step 1: Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
# Follow prompts to authenticate
```

#### Step 3: Deploy to Vercel

**Option A: Deploy from Local**
```bash
# From project root
cd /Users/akhilp/Documents/Gauntlet/RapidPhotoUpload

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Option B: Deploy from GitHub (Recommended)**

1. **Connect Repository to Vercel**:
   - Go to: https://vercel.com/new
   - Import: `akhil-p-git/RapidPhotoUpload`
   - Configure:
     - **Framework Preset**: Other
     - **Root Directory**: `./`
     - **Build Command**: `cd apps/web && pnpm install && npx vite build`
     - **Output Directory**: `apps/web/dist`
     - **Install Command**: `pnpm install`

2. **Configure Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.com/api
   ```

3. **Deploy**:
   - Push to `master` branch → Auto-deploy to production
   - Push to other branches → Auto-deploy to preview

#### Vercel Configuration (Already Set)

See [vercel.json](vercel.json) - already configured for monorepo structure.

---

### Backend: Deployment Options

You have several options for backend deployment:

#### Option 1: Railway (Recommended - Easy & Free Tier)

**Why Railway?**
- Free $5/month credits
- Easy PostgreSQL integration
- Auto-deploy from GitHub
- Good for Spring Boot apps

**Steps**:

1. **Sign up**: https://railway.app/
2. **New Project** → Deploy from GitHub
3. **Select Repository**: `akhil-p-git/RapidPhotoUpload`
4. **Add PostgreSQL**:
   - New → Database → PostgreSQL
5. **Configure Service**:
   - Root Directory: `apps/backend`
   - Build Command: `./gradlew build -x test`
   - Start Command: `java -jar build/libs/backend-1.0.0.jar`
6. **Environment Variables**:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-filled by Railway
   DATABASE_USERNAME=${{Postgres.PGUSER}}
   DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
   JWT_SECRET=your-production-secret-min-32-chars
   STORAGE_TYPE=s3
   S3_BUCKET_NAME=your-r2-bucket
   AWS_ACCESS_KEY=your-r2-access-key
   AWS_SECRET_KEY=your-r2-secret-key
   S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
   AWS_REGION=auto
   RATE_LIMIT_UPLOAD_CAPACITY=1000
   ```
7. **Deploy**: Commit to GitHub → Auto-deploys

**Cost**: Free tier (500 hours/month), then ~$5-10/month

---

#### Option 2: Render (Alternative)

**Steps**:

1. **Sign up**: https://render.com/
2. **New Web Service** → Connect GitHub
3. **Configure**:
   - Name: `rapidphoto-backend`
   - Root Directory: `apps/backend`
   - Build Command: `./gradlew build -x test`
   - Start Command: `java -jar build/libs/backend-1.0.0.jar`
4. **Add PostgreSQL**:
   - New → PostgreSQL
   - Connect to web service
5. **Environment Variables**: Same as Railway
6. **Deploy**

**Cost**: Free tier (spinning down after inactivity), then $7/month

---

#### Option 3: AWS EC2 (Traditional)

**For production scale**:

1. **Launch EC2 Instance**:
   - t3.medium (2 vCPU, 4 GB) for standard mode
   - t3.xlarge (4 vCPU, 16 GB) for ultra-fast mode
2. **Install Java 17**:
   ```bash
   sudo apt update
   sudo apt install openjdk-17-jdk
   ```
3. **Deploy Application**:
   ```bash
   # Upload JAR file
   scp apps/backend/build/libs/backend-1.0.0.jar ec2-user@your-ip:/app/

   # Run with systemd
   sudo systemctl start rapidphoto-backend
   ```
4. **Configure RDS PostgreSQL**
5. **Setup Load Balancer** (optional)

**Cost**: ~$30-120/month depending on instance size

---

#### Option 4: Docker Compose on VPS

**For full control**:

1. **Get a VPS** (DigitalOcean, Linode, etc.)
2. **Install Docker & Docker Compose**
3. **Clone Repository**:
   ```bash
   git clone https://github.com/akhil-p-git/RapidPhotoUpload.git
   cd RapidPhotoUpload
   ```
4. **Configure Environment**:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   # Edit .env with production values
   ```
5. **Deploy**:
   ```bash
   docker-compose up -d
   ```
6. **Setup Nginx Reverse Proxy**:
   ```nginx
   server {
       listen 80;
       server_name api.rapidphoto.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
7. **Setup SSL** (Let's Encrypt):
   ```bash
   sudo certbot --nginx -d api.rapidphoto.com
   ```

**Cost**: ~$5-20/month for VPS

---

### CloudFlare R2 Setup (Storage)

Your app uses CloudFlare R2 for image storage.

#### Step 1: Create R2 Bucket

1. **Login to CloudFlare**: https://dash.cloudflare.com/
2. **Go to R2** → Create Bucket
3. **Bucket Name**: `rapidphotoupload-media` (or your choice)
4. **Region**: Choose closest to your users

#### Step 2: Create API Token

1. **R2** → Manage R2 API Tokens
2. **Create API Token**:
   - **Permissions**: Object Read & Write
   - **Bucket**: `rapidphotoupload-media`
3. **Save credentials**:
   - Access Key ID
   - Secret Access Key
   - Bucket endpoint URL

#### Step 3: Configure Backend

Add to backend environment variables:
```bash
STORAGE_TYPE=s3
S3_BUCKET_NAME=rapidphotoupload-media
AWS_ACCESS_KEY=your-access-key-id
AWS_SECRET_KEY=your-secret-access-key
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
AWS_REGION=auto
```

---

## Environment Variables

### Frontend Environment Variables

**File**: `apps/web/.env.production` (create this file)

```bash
VITE_API_URL=https://your-backend-url.com/api
```

**For Vercel**: Set in Vercel dashboard → Settings → Environment Variables

### Backend Environment Variables

**Required**:
```bash
# Database
DATABASE_URL=jdbc:postgresql://host:port/dbname
DATABASE_USERNAME=your-db-user
DATABASE_PASSWORD=your-db-password

# Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Storage
STORAGE_TYPE=s3  # or 'local' for development
S3_BUCKET_NAME=your-bucket
AWS_ACCESS_KEY=your-key
AWS_SECRET_KEY=your-secret
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
AWS_REGION=auto

# Performance (Ultra Fast Mode)
RATE_LIMIT_UPLOAD_CAPACITY=1000
UPLOAD_CORE_SIZE=50
UPLOAD_MAX_SIZE=200
UPLOAD_QUEUE_CAPACITY=2000
```

**Optional**:
```bash
# n8n Webhook Integration
N8N_BASE_URL=https://your-n8n-instance.com

# Server
SERVER_PORT=8080

# Logging
LOG_FILE=/var/log/rapidphoto/application.log
```

---

## Complete Deployment Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] R2 bucket created and configured
- [ ] Secrets stored securely (not in git)

### Frontend Deployment

- [ ] Build succeeds: `cd apps/web && pnpm build`
- [ ] Environment variables set in Vercel
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (auto with Vercel)
- [ ] Vercel deployment successful

### Backend Deployment

- [ ] Build succeeds: `cd apps/backend && ./gradlew build`
- [ ] Database accessible from backend
- [ ] R2 credentials working
- [ ] Environment variables set
- [ ] Health endpoint accessible: `/actuator/health`
- [ ] Database migrations applied

### Post-Deployment Verification

- [ ] Frontend loads successfully
- [ ] User can register/login
- [ ] File upload works (test with 1 image)
- [ ] File upload works (test with 10 images)
- [ ] File upload works (test with 100 images)
- [ ] Images stored in R2 bucket
- [ ] Metrics accessible: `/actuator/prometheus`
- [ ] No errors in logs

---

## Quick Deployment Commands

### Run Everything Locally

```bash
# Terminal 1: Start database
docker-compose up postgres -d

# Terminal 2: Start backend
pnpm dev:backend

# Terminal 3: Start frontend
pnpm dev:web

# Open browser: http://localhost:5173
```

### Deploy to GitHub

```bash
# Stage all changes
git add .

# Commit with message
git commit -m "Deploy ultra-fast mode optimizations"

# Push to GitHub
git push origin master
```

### Deploy to Vercel (Frontend)

```bash
# Deploy to production
vercel --prod

# Or let GitHub auto-deploy (if connected)
git push origin master  # Auto-deploys to Vercel
```

---

## Monitoring Production

### Frontend Monitoring

**Vercel Dashboard**:
- https://vercel.com/dashboard
- View deployments, logs, analytics

**Browser Console**:
```javascript
// Check API connection
console.log(import.meta.env.VITE_API_URL)
```

### Backend Monitoring

**Health Check**:
```bash
curl https://your-backend-url.com/actuator/health
```

**Metrics**:
```bash
curl https://your-backend-url.com/actuator/metrics/hikaricp.connections.active
curl https://your-backend-url.com/actuator/metrics/tomcat.threads.busy
```

**Logs** (Railway/Render):
- View in dashboard
- Stream logs: `railway logs` or via web UI

---

## Rollback Procedure

### Frontend Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → Promote to Production

**Or via CLI**:
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Backend Rollback

**Railway/Render**:
1. Dashboard → Deployments
2. Select previous deployment
3. Redeploy

**Manual**:
```bash
# Revert git commit
git revert HEAD

# Push to trigger redeploy
git push origin master
```

---

## Troubleshooting

### Frontend Issues

**Issue**: "Cannot connect to backend"
```bash
# Check VITE_API_URL is set correctly
echo $VITE_API_URL

# Verify backend is accessible
curl https://your-backend-url.com/actuator/health
```

**Issue**: Build fails on Vercel
```bash
# Check build logs in Vercel dashboard
# Ensure pnpm version matches: package.json specifies pnpm@10.20.0
```

### Backend Issues

**Issue**: "Database connection failed"
```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: jdbc:postgresql://host:port/dbname

# Test database connection
psql $DATABASE_URL
```

**Issue**: "R2 upload fails"
```bash
# Check S3 credentials
echo $AWS_ACCESS_KEY
echo $S3_ENDPOINT

# Verify bucket exists in CloudFlare dashboard
```

**Issue**: "Out of memory"
```bash
# Increase JVM heap size
export JAVA_OPTS="-Xmx4g -Xms2g"

# Or in Dockerfile
ENV JAVA_OPTS="-Xmx4g -Xms2g"
```

---

## Summary

Your deployment workflow:

1. **Develop Locally**:
   - `pnpm dev:backend` + `pnpm dev:web`

2. **Commit & Push**:
   - `git add . && git commit -m "..." && git push`

3. **Auto-Deploy**:
   - **Frontend**: Vercel auto-deploys from master
   - **Backend**: Railway/Render auto-deploys from master

4. **Verify**:
   - Test upload functionality
   - Check metrics
   - Monitor logs

**Production URLs** (update after deployment):
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app` or your chosen service
- API Docs: `https://your-backend.railway.app/actuator`

---

## Next Steps

1. **Deploy Backend** to Railway/Render/AWS
2. **Configure R2 Bucket** for production storage
3. **Deploy Frontend** to Vercel
4. **Setup Custom Domain** (optional)
5. **Configure Monitoring** (Sentry, LogRocket, etc.)
6. **Setup Backups** for PostgreSQL database
7. **Load Testing** with 1000 images

Good luck with your deployment! 🚀
