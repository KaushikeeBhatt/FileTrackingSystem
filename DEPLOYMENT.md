# 🚢 Deployment Guide - File Tracking System

This comprehensive guide covers deploying the File Tracking System to various environments, from local development to production cloud platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Deployment](#local-development-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Platform Deployments](#cloud-platform-deployments)
   - [Render](#deploying-to-render)
   - [Railway](#deploying-to-railway)
   - [Vercel](#deploying-to-vercel)
   - [AWS](#deploying-to-aws)
   - [Google Cloud Platform](#deploying-to-google-cloud-platform)
   - [Azure](#deploying-to-microsoft-azure)
6. [Database Setup](#database-setup)
7. [Security Configuration](#security-configuration)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: Version 18.x or higher
- **pnpm**: Version 10.x (or npm/yarn as alternatives)
- **Docker**: Version 20.x or higher (for containerized deployment)
- **Docker Compose**: Version 2.x or higher
- **Git**: For version control

### Required Accounts (for cloud deployment)

- MongoDB Atlas account (or local MongoDB instance)
- Cloud platform account (Render, Railway, Vercel, AWS, GCP, or Azure)
- Docker Hub account (optional, for custom images)
- GitHub account (for CI/CD integration)

---

## Environment Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Application Settings
NODE_ENV=production
PORT=3000
BASE_URL=https://your-domain.com

# Database Configuration
MONGODB_URI=mongodb://username:password@host:port/database?authSource=admin
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Authentication & Security
JWT_SECRET=your-very-secure-random-string-minimum-32-characters-long
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another-secure-random-string-minimum-32-characters

# File Upload Configuration
MAX_FILE_SIZE=104857600  # 100MB in bytes
UPLOAD_DIR=./uploads     # Local storage path
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,video/mp4,application/zip

# Admin User (for initial setup)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-admin-password
ADMIN_NAME=System Administrator

# Optional: Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Optional: Cloud Storage (if not using local storage)
# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Optional: Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379
```

### Security Best Practices for Environment Variables

1. **Never commit `.env` files to version control**
2. **Use strong, random strings for secrets** (32+ characters)
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Use different secrets for each environment** (dev, staging, production)
5. **Store production secrets in secure vaults** (AWS Secrets Manager, Azure Key Vault, etc.)

---

## Local Development Deployment

### Option 1: Without Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd file-tracking-docker
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB locally**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password \
     mongo:7.0
   
   # Or use MongoDB Atlas (cloud)
   ```

5. **Run database migrations and setup**
   ```bash
   pnpm run setup:admin
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

7. **Access the application**
   - Open http://localhost:3000
   - Login with admin credentials

### Option 2: With Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd file-tracking-docker
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Create admin user**
   ```bash
   docker-compose exec app pnpm run setup:demo-admin
   ```

4. **Access the application**
   - **Application**: http://localhost:3000
   - **MongoDB Admin (Mongo Express)**: http://localhost:8081
     - Username: `admin`
     - Password: `password`

5. **View logs**
   ```bash
   docker-compose logs -f app
   ```

6. **Stop services**
   ```bash
   docker-compose down
   ```

---

## Docker Deployment

### Building Production Image

1. **Build the Docker image**
   ```bash
   docker build -f Dockerfile -t file-tracking-system:latest .
   ```

2. **Run with Docker Compose (Production)**
   ```bash
   # Create production .env file
   cp .env.example .env.production
   # Edit with production values
   
   # Start production stack
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify deployment**
   ```bash
   docker ps
   docker logs file-tracking-app
   ```

### Docker Image Optimization

The production Dockerfile uses multi-stage builds for optimization:
- **Stage 1 (deps)**: Install dependencies only
- **Stage 2 (builder)**: Build the application
- **Stage 3 (runner)**: Production runtime with minimal footprint

**Image size**: ~200MB (optimized)

---

## Cloud Platform Deployments

### Deploying to Render

Render provides easy deployment with automatic CI/CD integration.

#### Prerequisites
- Render account
- MongoDB Atlas database

#### Steps

1. **Create a Web Service on Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Build Settings**
   ```yaml
   Build Command: pnpm install && pnpm build
   Start Command: pnpm start
   ```

3. **Set Environment Variables**
   Go to "Environment" tab and add:
   ```
   NODE_ENV=production
   MONGODB_URI=<your-mongodb-atlas-uri>
   JWT_SECRET=<your-secret>
   BASE_URL=https://your-app.onrender.com
   MAX_FILE_SIZE=104857600
   ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,...
   ```

4. **Configure Health Check**
   - Path: `/api/health`
   - Expected Status: 200

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build and deployment to complete

6. **Set up MongoDB (Render Managed)**
   Alternatively, use Render's managed MongoDB:
   - Create a new MongoDB service
   - Copy the connection string
   - Update `MONGODB_URI` in environment variables

#### Automatic Deployments
- Push to `main` branch triggers automatic deployment
- GitHub Actions workflow handles CI/CD

---

### Deploying to Railway

Railway offers simple deployment with excellent developer experience.

#### Steps

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Add MongoDB Service**
   ```bash
   railway add mongodb
   ```

5. **Set Environment Variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=your-secret-here
   railway variables set BASE_URL=https://your-app.railway.app
   ```

6. **Deploy**
   ```bash
   railway up
   ```

7. **Open Application**
   ```bash
   railway open
   ```

#### Railway.json Configuration
Create `railway.json` in project root:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

---

### Deploying to Vercel

Vercel is optimized for Next.js applications.

#### Steps

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   Go to Vercel Dashboard → Project → Settings → Environment Variables
   
   Or use CLI:
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   vercel env add BASE_URL
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

#### Important Notes for Vercel
- **File uploads**: Vercel has a 4.5MB request body limit. Consider using cloud storage (S3, Cloudinary) for larger files
- **API Routes**: Serverless functions have 10-second timeout on Hobby plan
- **Database**: Use MongoDB Atlas or external database

#### Vercel Configuration
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "MONGODB_URI": "@mongodb_uri",
    "JWT_SECRET": "@jwt_secret"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

---

### Deploying to AWS

Deploy using AWS Elastic Container Service (ECS) with Fargate.

#### Architecture
- **ECS Fargate**: Container orchestration
- **Application Load Balancer**: Traffic distribution
- **DocumentDB** or **MongoDB Atlas**: Database
- **S3**: File storage
- **CloudFront**: CDN
- **Route53**: DNS management

#### Prerequisites
- AWS CLI installed and configured
- Docker installed
- AWS account with appropriate permissions

#### Steps

1. **Create ECR Repository**
   ```bash
   aws ecr create-repository --repository-name file-tracking-system
   ```

2. **Build and Push Docker Image**
   ```bash
   # Get ECR login
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   
   # Build image
   docker build -t file-tracking-system .
   
   # Tag image
   docker tag file-tracking-system:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/file-tracking-system:latest
   
   # Push image
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/file-tracking-system:latest
   ```

3. **Create ECS Cluster**
   ```bash
   aws ecs create-cluster --cluster-name file-tracking-cluster
   ```

4. **Create Task Definition**
   Create `ecs-task-definition.json`:
   ```json
   {
     "family": "file-tracking-task",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "file-tracking-container",
         "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/file-tracking-system:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "MONGODB_URI",
             "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:mongodb-uri"
           },
           {
             "name": "JWT_SECRET",
             "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:jwt-secret"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/file-tracking",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

5. **Register Task Definition**
   ```bash
   aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
   ```

6. **Create ECS Service**
   ```bash
   aws ecs create-service \
     --cluster file-tracking-cluster \
     --service-name file-tracking-service \
     --task-definition file-tracking-task \
     --desired-count 2 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
   ```

7. **Set Up Application Load Balancer**
   - Create ALB in AWS Console
   - Configure target group for port 3000
   - Add listener rules
   - Update ECS service to use ALB

8. **Configure Auto Scaling**
   ```bash
   aws application-autoscaling register-scalable-target \
     --service-namespace ecs \
     --scalable-dimension ecs:service:DesiredCount \
     --resource-id service/file-tracking-cluster/file-tracking-service \
     --min-capacity 2 \
     --max-capacity 10
   ```

---

### Deploying to Google Cloud Platform

Deploy using Google Cloud Run for serverless container deployment.

#### Prerequisites
- Google Cloud account
- gcloud CLI installed

#### Steps

1. **Initialize gcloud**
   ```bash
   gcloud init
   gcloud auth login
   ```

2. **Enable Required APIs**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

3. **Build and Push to Container Registry**
   ```bash
   # Set project ID
   export PROJECT_ID=your-project-id
   
   # Build image
   docker build -t gcr.io/$PROJECT_ID/file-tracking-system .
   
   # Push to GCR
   docker push gcr.io/$PROJECT_ID/file-tracking-system
   ```

4. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy file-tracking-system \
     --image gcr.io/$PROJECT_ID/file-tracking-system \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production,BASE_URL=https://your-app.run.app \
     --set-secrets MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest \
     --memory 1Gi \
     --cpu 1 \
     --timeout 300 \
     --concurrency 80 \
     --min-instances 1 \
     --max-instances 10
   ```

5. **Set Up Custom Domain**
   ```bash
   gcloud run domain-mappings create \
     --service file-tracking-system \
     --domain your-domain.com \
     --region us-central1
   ```

---

### Deploying to Microsoft Azure

Deploy using Azure Container Instances or Azure App Service.

#### Option 1: Azure Container Instances

1. **Login to Azure**
   ```bash
   az login
   ```

2. **Create Resource Group**
   ```bash
   az group create --name file-tracking-rg --location eastus
   ```

3. **Create Container Registry**
   ```bash
   az acr create --resource-group file-tracking-rg \
     --name filetrackingregistry \
     --sku Basic
   ```

4. **Build and Push Image**
   ```bash
   az acr build --registry filetrackingregistry \
     --image file-tracking-system:latest .
   ```

5. **Deploy Container**
   ```bash
   az container create \
     --resource-group file-tracking-rg \
     --name file-tracking-app \
     --image filetrackingregistry.azurecr.io/file-tracking-system:latest \
     --cpu 1 \
     --memory 1.5 \
     --registry-login-server filetrackingregistry.azurecr.io \
     --registry-username <username> \
     --registry-password <password> \
     --dns-name-label file-tracking \
     --ports 3000 \
     --environment-variables \
       NODE_ENV=production \
       BASE_URL=http://file-tracking.eastus.azurecontainer.io:3000 \
     --secure-environment-variables \
       MONGODB_URI=<your-mongodb-uri> \
       JWT_SECRET=<your-jwt-secret>
   ```

#### Option 2: Azure App Service

1. **Create App Service Plan**
   ```bash
   az appservice plan create \
     --name file-tracking-plan \
     --resource-group file-tracking-rg \
     --is-linux \
     --sku B1
   ```

2. **Create Web App**
   ```bash
   az webapp create \
     --resource-group file-tracking-rg \
     --plan file-tracking-plan \
     --name file-tracking-app \
     --deployment-container-image-name filetrackingregistry.azurecr.io/file-tracking-system:latest
   ```

3. **Configure Environment Variables**
   ```bash
   az webapp config appsettings set \
     --resource-group file-tracking-rg \
     --name file-tracking-app \
     --settings \
       NODE_ENV=production \
       MONGODB_URI=<your-mongodb-uri> \
       JWT_SECRET=<your-jwt-secret> \
       BASE_URL=https://file-tracking-app.azurewebsites.net
   ```

---

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free tier

2. **Create Cluster**
   - Click "Build a Cluster"
   - Choose your cloud provider and region
   - Select M0 (Free) tier for development

3. **Create Database User**
   - Go to "Database Access"
   - Add new database user
   - Set username and password
   - Grant read/write permissions

4. **Whitelist IP Addresses**
   - Go to "Network Access"
   - Add IP address or allow access from anywhere (0.0.0.0/0)
   - **Note**: For production, restrict to specific IPs

5. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

6. **Initialize Database**
   ```bash
   # Run setup script
   node scripts/setup-database.js
   
   # Or create admin user
   pnpm run setup:admin
   ```

### Self-Hosted MongoDB

1. **Install MongoDB**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y mongodb-org
   
   # macOS
   brew install mongodb-community
   
   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb \
     -v mongodb_data:/data/db \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password \
     mongo:7.0
   ```

2. **Configure Authentication**
   Create MongoDB init script (`scripts/init-mongo.js`):
   ```javascript
   db = db.getSiblingDB('file-tracking');
   
   db.createUser({
     user: 'filetrackinguser',
     pwd: 'filetrackingpassword',
     roles: [
       {
         role: 'readWrite',
         db: 'file-tracking'
       }
     ]
   });
   ```

3. **Start MongoDB with Authentication**
   ```bash
   mongod --auth --dbpath /data/db
   ```

---

## Security Configuration

### SSL/TLS Configuration

#### For Reverse Proxy (Nginx)

1. **Install Certbot**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain SSL Certificate**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. **Configure Nginx**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;
       
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### Environment Security Checklist

- [ ] All secrets are stored in environment variables, not in code
- [ ] JWT secret is at least 32 characters long and randomly generated
- [ ] MongoDB uses authentication
- [ ] MongoDB network access is restricted to known IPs
- [ ] HTTPS/SSL is enabled in production
- [ ] CORS is configured to allow only trusted origins
- [ ] Rate limiting is enabled on API endpoints
- [ ] File uploads are validated for type and size
- [ ] Regular security updates are applied
- [ ] Backups are encrypted and stored securely

---

## Monitoring and Maintenance

### Application Monitoring

#### Health Check Endpoint
The application includes a health check at `/api/health`:
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

#### Logging

1. **Application Logs**
   ```bash
   # Docker
   docker logs -f <container-id>
   
   # PM2
   pm2 logs file-tracking-system
   ```

2. **Centralized Logging** (Optional)
   - Use services like Papertrail, Loggly, or ELK Stack
   - Configure log shipping in production

#### Performance Monitoring

Recommended tools:
- **New Relic**: Application performance monitoring
- **Datadog**: Infrastructure and application monitoring
- **Sentry**: Error tracking and monitoring
- **Google Analytics**: User analytics

### Database Backups

#### MongoDB Atlas
- Automatic backups are enabled by default
- Configure backup schedule in Atlas console
- Test restore procedures regularly

#### Self-Hosted MongoDB
```bash
# Backup
mongodump --uri="mongodb://username:password@localhost:27017/file-tracking" --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://username:password@localhost:27017/file-tracking" /backups/20240101
```

#### Automated Backup Script
Create `scripts/backup-mongodb.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mongodump --uri="$MONGODB_URI" --out=$BACKUP_DIR/$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;

# Upload to S3 (optional)
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/mongodb/
```

Set up cron job:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/scripts/backup-mongodb.sh
```

### Scaling Strategies

#### Horizontal Scaling
- Use load balancer (Nginx, HAProxy, AWS ALB)
- Deploy multiple application instances
- Share session state (use Redis)
- Use cloud-based file storage (S3, GCS)

#### Vertical Scaling
- Increase CPU and memory allocation
- Optimize database queries
- Implement caching (Redis)
- Use CDN for static assets

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed

**Symptoms**: Application fails to start, "Connection refused" error

**Solutions**:
```bash
# Check MongoDB is running
docker ps | grep mongo
# Or
sudo systemctl status mongod

# Test connection
mongo "mongodb://username:password@host:port/database"

# Check firewall
sudo ufw status
sudo ufw allow 27017/tcp

# Verify connection string
echo $MONGODB_URI
```

#### 2. File Upload Fails

**Symptoms**: Files not uploading, 413 or 500 errors

**Solutions**:
```bash
# Check file size limit
echo $MAX_FILE_SIZE

# Check upload directory permissions
chmod 755 uploads/
chown -R $USER:$USER uploads/

# Check disk space
df -h

# Increase Nginx upload limit (if using reverse proxy)
# In nginx.conf:
client_max_body_size 100M;
```

#### 3. JWT Token Invalid

**Symptoms**: "Invalid token" or "Token expired" errors

**Solutions**:
```bash
# Verify JWT secret is set and consistent
echo $JWT_SECRET

# Check token expiration settings
# In .env:
JWT_EXPIRES_IN=7d

# Clear browser cookies and localStorage
# Restart application
```

#### 4. High Memory Usage

**Symptoms**: Application crashes or becomes slow

**Solutions**:
```bash
# Check memory usage
docker stats
# Or
htop

# Increase container memory limit
# In docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 2G

# Optimize Node.js memory
node --max-old-space-size=2048 server.js
```

#### 5. Database Performance Issues

**Symptoms**: Slow queries, timeouts

**Solutions**:
```javascript
// Create indexes in MongoDB
db.files.createIndex({ uploadedBy: 1, createdAt: -1 });
db.files.createIndex({ department: 1, status: 1 });
db.files.createIndex({ tags: 1 });

// Enable query profiling
db.setProfilingLevel(1, { slowms: 100 });

// Analyze slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

### Getting Support

- **Documentation**: Check the docs folder
- **GitHub Issues**: Report bugs and request features
- **Community Forum**: Ask questions and share knowledge
- **Email Support**: contact@yourdomain.com

---

## Post-Deployment Checklist

- [ ] Application is accessible via HTTPS
- [ ] Database connection is secure and working
- [ ] Admin user can log in
- [ ] File upload/download works correctly
- [ ] Environment variables are properly set
- [ ] SSL certificate is valid
- [ ] Monitoring and logging are configured
- [ ] Backups are scheduled and tested
- [ ] Health check endpoint responds
- [ ] Error tracking is enabled
- [ ] Rate limiting is active
- [ ] CORS is configured correctly
- [ ] Documentation is updated with deployment details

---

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)

---

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial production release
- Docker support
- Multi-cloud deployment guides
- Comprehensive monitoring setup

---

**For questions or issues, please contact the development team or open an issue on GitHub.**
