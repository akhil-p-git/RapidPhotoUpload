# Railway Deployment Guide 🚂

Complete guide to deploy RapidPhotoUpload backend to Railway.

---

## Why Railway?

- ✅ **Free $5/month credits** (enough for development)
- ✅ **Auto-deploy from GitHub** (push to deploy)
- ✅ **One-click PostgreSQL** (automatic connection)
- ✅ **Environment variables** (easy management)
- ✅ **HTTPS by default** (automatic SSL)
- ✅ **Great for Spring Boot** (optimized builder)

---

## Quick Deployment (Web UI)

### Step 1: Sign Up & Create Project

1. **Go to Railway**: https://railway.app/
2. **Sign up** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose**: `akhil-p-git/RapidPhotoUpload`

### Step 2: Add PostgreSQL Database

1. **Click "New"** → **Database** → **PostgreSQL**
2. Railway automatically creates the database
3. Connection string is auto-generated

### Step 3: Configure Backend Service

1. **Click "New"** → **GitHub Repo**
2. **Select**: `akhil-p-git/RapidPhotoUpload`
3. **Configure Build Settings**:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `./gradlew build -x test`
   - **Start Command**: `java -jar build/libs/backend-1.0.0.jar`

### Step 4: Set Environment Variables

Click on your backend service → **Variables** tab:

```bash
# Database (Auto-filled by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_USERNAME=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}

# JWT Secret (Generate a secure one)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this

# Storage (CloudFlare R2)
STORAGE_TYPE=s3
S3_BUCKET_NAME=your-r2-bucket-name
AWS_ACCESS_KEY=your-r2-access-key
AWS_SECRET_KEY=your-r2-secret-key
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
AWS_REGION=auto

# Performance (Ultra Fast Mode)
RATE_LIMIT_UPLOAD_CAPACITY=1000
UPLOAD_CORE_SIZE=50
UPLOAD_MAX_SIZE=200
UPLOAD_QUEUE_CAPACITY=2000

# Spring Profile
SPRING_PROFILES_ACTIVE=prod

# Optional: n8n Webhook
N8N_BASE_URL=https://your-n8n-instance.com
```

### Step 5: Deploy

1. **Railway will automatically deploy** from GitHub
2. **Wait for build** (~3-5 minutes for first deployment)
3. **Check logs** for any errors
4. **Copy your backend URL**: `https://your-app.railway.app`

---

## CLI Deployment (Alternative)

### Step 1: Install Railway CLI

```bash
# macOS
brew install railway

# npm (all platforms)
npm install -g @railway/cli

# Verify installation
railway --version
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser for authentication.

### Step 3: Initialize Project

```bash
cd /Users/akhilp/Documents/Gauntlet/RapidPhotoUpload

# Link to existing project or create new
railway init

# Or link to existing
railway link
```

### Step 4: Add PostgreSQL

```bash
railway add postgresql
```

Railway will automatically:
- Create PostgreSQL database
- Set environment variables
- Connect to your service

### Step 5: Set Environment Variables

```bash
# Set variables via CLI
railway variables set JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
railway variables set STORAGE_TYPE="s3"
railway variables set S3_BUCKET_NAME="your-bucket"
railway variables set AWS_ACCESS_KEY="your-key"
railway variables set AWS_SECRET_KEY="your-secret"
railway variables set S3_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
railway variables set AWS_REGION="auto"
railway variables set RATE_LIMIT_UPLOAD_CAPACITY="1000"
railway variables set SPRING_PROFILES_ACTIVE="prod"

# Or use environment file
railway variables set --from .env.production
```

### Step 6: Deploy

```bash
railway up
```

This will:
1. Build your Spring Boot application
2. Run tests (if enabled)
3. Deploy to Railway
4. Give you a public URL

---

## Configuration Files

### railway.json (Root Directory)

Already created for you at `/Users/akhilp/Documents/Gauntlet/RapidPhotoUpload/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd apps/backend && ./gradlew build -x test"
  },
  "deploy": {
    "startCommand": "cd apps/backend && java -jar build/libs/backend-1.0.0.jar",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Procfile (Alternative)

If Railway doesn't detect the right build, create `Procfile` in root:

```
web: cd apps/backend && java -jar build/libs/backend-1.0.0.jar
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | Auto-filled by Railway |
| `DATABASE_USERNAME` | DB username | Auto-filled by Railway |
| `DATABASE_PASSWORD` | DB password | Auto-filled by Railway |
| `JWT_SECRET` | JWT signing secret | Min 32 chars |

### Storage Variables (CloudFlare R2)

| Variable | Description | Example |
|----------|-------------|---------|
| `STORAGE_TYPE` | Storage type | `s3` |
| `S3_BUCKET_NAME` | R2 bucket name | `rapidphotoupload-media` |
| `AWS_ACCESS_KEY` | R2 access key | From CloudFlare dashboard |
| `AWS_SECRET_KEY` | R2 secret key | From CloudFlare dashboard |
| `S3_ENDPOINT` | R2 endpoint | `https://xxx.r2.cloudflarestorage.com` |
| `AWS_REGION` | Region | `auto` |

### Performance Variables (Ultra Fast Mode)

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_UPLOAD_CAPACITY` | Requests per minute | `1000` |
| `UPLOAD_CORE_SIZE` | Core thread pool size | `50` |
| `UPLOAD_MAX_SIZE` | Max thread pool size | `200` |
| `UPLOAD_QUEUE_CAPACITY` | Queue capacity | `2000` |

---

## Post-Deployment Steps

### 1. Verify Deployment

```bash
# Get your Railway URL
railway status

# Or check in Railway dashboard
# https://railway.app/dashboard
```

### 2. Test Backend Health

```bash
# Replace with your Railway URL
curl https://your-app.railway.app/actuator/health

# Should return: {"status":"UP"}
```

### 3. Test Database Connection

```bash
curl https://your-app.railway.app/actuator/health/db

# Should return database status
```

### 4. Check Metrics

```bash
curl https://your-app.railway.app/actuator/prometheus | head -20
```

---

## Update Frontend to Use Railway Backend

### Update Vercel Environment Variable

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**
3. **Settings** → **Environment Variables**
4. **Add/Update**:
   ```
   VITE_API_URL=https://your-app.railway.app/api
   ```
5. **Redeploy** frontend

### Or Update Local .env

```bash
# apps/web/.env.production
VITE_API_URL=https://your-app.railway.app/api
```

---

## Monitoring & Logs

### View Logs

**Via CLI**:
```bash
railway logs
```

**Via Dashboard**:
1. Go to https://railway.app/dashboard
2. Select your project
3. Click on backend service
4. View **Logs** tab

### Monitor Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request count

Access at: https://railway.app/dashboard → Your Project → Metrics

---

## Auto-Deploy from GitHub

Once connected, Railway automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update configuration"
git push origin master

# Railway automatically:
# 1. Detects push
# 2. Builds application
# 3. Runs tests
# 4. Deploys to production
```

---

## Scaling & Resources

### Free Tier

- **$5 worth of usage/month** (enough for development)
- **500 hours/month** of runtime
- **1 GB RAM** per service
- **1 GB disk** space

### Paid Plans

If you need more resources:

**Developer Plan** ($20/month):
- $20 usage credits
- 8 GB RAM
- 100 GB disk

**Team Plan** ($20/user/month):
- $20 usage credits per user
- Shared resources
- Team collaboration

---

## Troubleshooting

### Issue: Build Fails

**Check Gradle version**:
```bash
# In railway.json, specify Java version
{
  "build": {
    "nixpacksPlan": {
      "phases": {
        "setup": {
          "nixPkgs": ["jdk17"]
        }
      }
    }
  }
}
```

### Issue: Database Connection Fails

**Check environment variables**:
```bash
railway variables

# Ensure DATABASE_URL is set correctly
```

### Issue: Application Crashes on Startup

**Check logs**:
```bash
railway logs --tail 100

# Look for errors related to:
# - Database connection
# - Missing environment variables
# - Port binding (Railway uses $PORT)
```

### Issue: Out of Memory

**Increase JVM heap**:
```bash
# Add to environment variables
JAVA_OPTS=-Xmx1g -Xms512m

# Update start command in railway.json
"startCommand": "cd apps/backend && java $JAVA_OPTS -jar build/libs/backend-1.0.0.jar"
```

---

## Cost Estimation

### Development (1000 images/day)

**Compute**:
- 24/7 uptime: ~$5-10/month
- On-demand: ~$2-5/month

**Database**:
- PostgreSQL: Included with compute
- Storage: ~$0.10/GB/month

**Total**: ~$5-15/month (within free tier for development)

### Production (10,000 images/day)

**Compute**:
- High availability: ~$20-40/month
- Scaled instances: +$20/instance

**Database**:
- PostgreSQL Pro: ~$15-30/month
- Read replicas: +$15/replica

**Total**: ~$35-90/month depending on traffic

---

## CloudFlare R2 Setup

While deploying to Railway, also set up R2 storage:

### Step 1: Create R2 Bucket

1. **Login to CloudFlare**: https://dash.cloudflare.com/
2. **Go to R2** → Create Bucket
3. **Bucket Name**: `rapidphotoupload-media`
4. **Region**: Choose closest to your users

### Step 2: Create API Token

1. **R2** → Manage R2 API Tokens
2. **Create API Token**:
   - **Permissions**: Object Read & Write
   - **Bucket**: `rapidphotoupload-media`
3. **Save credentials**:
   - Access Key ID
   - Secret Access Key
   - Bucket endpoint URL

### Step 3: Add to Railway Variables

```bash
railway variables set S3_BUCKET_NAME="rapidphotoupload-media"
railway variables set AWS_ACCESS_KEY="your-access-key"
railway variables set AWS_SECRET_KEY="your-secret-key"
railway variables set S3_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
railway variables set AWS_REGION="auto"
```

---

## Complete Deployment Checklist

### Pre-Deployment

- [ ] GitHub repository is up to date
- [ ] All tests passing locally
- [ ] Environment variables prepared
- [ ] CloudFlare R2 bucket created

### Railway Setup

- [ ] Railway account created
- [ ] PostgreSQL database added
- [ ] Backend service configured
- [ ] Environment variables set
- [ ] Deployment successful

### Post-Deployment

- [ ] Health endpoint accessible
- [ ] Database connection working
- [ ] R2 storage working
- [ ] Frontend updated with backend URL
- [ ] Test image upload (1 image)
- [ ] Test bulk upload (10 images)
- [ ] Metrics accessible

---

## Quick Commands Reference

```bash
# Login to Railway
railway login

# Link to project
railway link

# Add PostgreSQL
railway add postgresql

# Set environment variable
railway variables set KEY=VALUE

# Deploy
railway up

# View logs
railway logs

# View status
railway status

# Open in browser
railway open
```

---

## Next Steps After Railway Deployment

1. **Update Vercel** with Railway backend URL
2. **Test end-to-end** upload flow
3. **Monitor performance** in Railway dashboard
4. **Set up alerts** for errors/downtime
5. **Configure custom domain** (optional)

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app/
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app/

---

## Summary

Your deployment flow:

1. **Code**: Develop locally
2. **Push**: `git push origin master`
3. **Deploy**: Railway auto-deploys
4. **Monitor**: Check Railway dashboard
5. **Scale**: Add resources as needed

**Backend URL**: `https://your-app.railway.app`

Ready to handle 1000 images in 2-3 minutes! 🚀🚂
