# Quick Start Guide 🚀

Get RapidPhotoUpload running in 3 steps!

---

## Option 1: Automated (Recommended)

### Run Locally
```bash
./scripts/deploy.sh local
```

### Deploy to GitHub
```bash
./scripts/deploy.sh github
```

### Deploy to Production
```bash
./scripts/deploy.sh production
```

---

## Option 2: Manual Steps

### 1️⃣ Run Locally

```bash
# Start database
docker-compose up postgres -d

# Terminal 1: Start backend
pnpm dev:backend

# Terminal 2: Start frontend
pnpm dev:web

# Open: http://localhost:5173
```

### 2️⃣ Deploy to GitHub

```bash
# Stage all changes
git add .

# Commit
git commit -m "feat: Ultra-fast mode optimizations"

# Push
git push origin master
```

### 3️⃣ Deploy to Production

**Frontend (Vercel)**:
```bash
vercel --prod
```

**Backend** (Choose one):
- **Railway**: https://railway.app/ (recommended)
- **Render**: https://render.com/
- **AWS EC2**: Traditional deployment

---

## What You Get

✅ **1000 images in 2-3 minutes** (was 15-20 min)
✅ 5 parallel chunks per file (was 1)
✅ 150 concurrent uploads (was 100)
✅ 1000 req/min rate limit (was 200)
✅ HTTP/2 enabled
✅ Complete monitoring

---

## URLs After Deployment

- **Local Frontend**: http://localhost:5173
- **Local Backend**: http://localhost:8080
- **Production Frontend**: https://your-app.vercel.app
- **Production Backend**: https://your-backend.railway.app
- **Metrics**: https://your-backend/actuator/prometheus

---

## Need Help?

📖 **Full Deployment Guide**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
⚡ **Performance Details**: [ULTRA_FAST_MODE.md](ULTRA_FAST_MODE.md)
📊 **Performance Comparison**: [PERFORMANCE_COMPARISON.md](PERFORMANCE_COMPARISON.md)

---

## Troubleshooting

**Frontend won't start?**
```bash
cd apps/web && pnpm install && pnpm dev
```

**Backend won't start?**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not, start it
docker-compose up postgres -d
```

**Can't push to GitHub?**
```bash
# Check remote
git remote -v

# Should show: origin https://github.com/akhil-p-git/RapidPhotoUpload.git
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Run everything locally | `./scripts/deploy.sh local` |
| Push to GitHub | `./scripts/deploy.sh github` |
| Deploy to Vercel | `./scripts/deploy.sh production` |
| Check backend health | `curl localhost:8080/actuator/health` |
| View metrics | `curl localhost:8080/actuator/prometheus` |

---

Happy deploying! 🎉
