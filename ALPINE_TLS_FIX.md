# Alpine MongoDB TLS Fix - Final Solution

## Problem
Alpine Linux's `musl` libc has OpenSSL compatibility issues with MongoDB Atlas TLS 1.3, causing:
```
MongoServerSelectionError: error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

## Solution Applied

### 1. ✅ Force TLS 1.2 in MongoDB Connection
Updated `lib/mongodb.ts` to force TLS 1.2 instead of TLS 1.3:
```typescript
minVersion: 'TLSv1.2',
maxVersion: 'TLSv1.2',
```

### 2. ✅ Install OpenSSL in Alpine Image
Updated `Dockerfile` to install OpenSSL and CA certificates in both build and runtime stages:
```dockerfile
RUN apk add --no-cache openssl ca-certificates
```

### 3. ⚠️ Verify MongoDB Connection String

Ensure your `MONGODB_URI` on Render is:
```
mongodb+srv://kaushikeebhatt:Manish4321@cluster0.lpzpzxg.mongodb.net/file-tracking-system?retryWrites=true&w=majority&appName=Cluster0
```

**Critical:** Database name `/file-tracking-system` must be present!

## Deployment Steps

### Step 1: Commit and Push
```bash
git add Dockerfile lib/mongodb.ts
git commit -m "Fix Alpine OpenSSL TLS compatibility with MongoDB Atlas"
git push origin main
```

### Step 2: Verify Environment Variable on Render
1. Go to https://dashboard.render.com
2. Select `filetrackingsystem` service
3. Environment tab → Verify `MONGODB_URI` has database name
4. Should look like: `...mongodb.net/file-tracking-system?retryWrites=...`

### Step 3: Monitor Deployment
Watch Render logs for:
- ✅ `MongoDB connected successfully`
- ❌ No SSL/TLS errors

## Why This Works

### TLS Version Downgrade
- MongoDB Atlas supports both TLS 1.2 and TLS 1.3
- Alpine's OpenSSL has issues with TLS 1.3 handshake
- Forcing TLS 1.2 uses a more stable code path

### OpenSSL Installation
- Ensures latest OpenSSL libraries are available
- CA certificates enable proper certificate validation
- Improves compatibility with MongoDB Atlas certificates

## Alternative: Switch to Debian

If this still doesn't work, the **recommended solution** is to use `node:18-slim`:

```dockerfile
# Change line 2 in Dockerfile from:
FROM node:18-alpine AS base

# To:
FROM node:18-slim AS base

# And update deps stage from:
RUN apk add --no-cache libc6-compat openssl ca-certificates

# To:
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
```

**Why Debian is better:**
- Uses `glibc` with full OpenSSL support
- 100% compatible with MongoDB Atlas
- Only ~20MB larger than Alpine
- Industry standard for production Node.js apps

## Troubleshooting

### If TLS 1.2 Fix Doesn't Work

Try completely removing TLS options and let the driver auto-detect:

```typescript
// In lib/mongodb.ts, replace clientOptions with:
const clientOptions = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  retryReads: true,
  w: 'majority' as const,
  // No TLS options - let driver handle it from connection string
};
```

### Check MongoDB Atlas Configuration

1. **Network Access:**
   - Atlas → Network Access
   - Ensure `0.0.0.0/0` is allowed

2. **Database User:**
   - Atlas → Database Access
   - User: `kaushikeebhatt`
   - Password: `Manish4321`
   - Role: `readWrite` on `file-tracking-system` database

3. **Connection String Test:**
   ```bash
   # Test locally (install mongodb package first)
   node -e "const {MongoClient}=require('mongodb');const uri='mongodb+srv://kaushikeebhatt:Manish4321@cluster0.lpzpzxg.mongodb.net/file-tracking-system?retryWrites=true&w=majority';const client=new MongoClient(uri,{minVersion:'TLSv1.2',maxVersion:'TLSv1.2'});client.connect().then(()=>{console.log('✅ Connected');client.close();}).catch(e=>console.error('❌',e.message));"
   ```

## Summary

✅ **Applied:** TLS 1.2 version constraint in MongoDB connection  
✅ **Applied:** OpenSSL and CA certificates in Alpine image  
⏳ **Required:** Commit and push changes  
⏳ **Required:** Verify `MONGODB_URI` has database name  

If this doesn't resolve the issue, **strongly recommend switching to `node:18-slim`** for production stability.
