# Deployment Guide for Render

## Prerequisites
- Node.js 16+ and npm 8+ installed
- A Render account
- Your code pushed to a Git repository

## Local Build Test (Optional)
Before deploying, you can test the build process locally:

```bash
# On Windows PowerShell
npm run install-all
npm run build

# Or use the deployment script
./deploy.sh
```

## Deploy to Render

### Option 1: Using render.yaml (Recommended)
1. Push your code to GitHub/GitLab
2. In Render dashboard, click "New +" → "Web Service"
3. Connect your repository
4. Render will automatically detect the `render.yaml` configuration
5. Click "Create Web Service"

### Option 2: Manual Configuration
1. Push your code to GitHub/GitLab
2. In Render dashboard, click "New +" → "Web Service"
3. Connect your repository
4. Configure the service:
   - **Name**: `exify-youtube-downloader`
   - **Environment**: `Node`
   - **Build Command**: `npm run install-all && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

## Environment Variables
The following environment variables are automatically set:
- `NODE_ENV`: `production`
- `PORT`: `10000`

## Build Process
The deployment process:
1. Installs all dependencies (root, client, server)
2. Builds the React app to `client/build/`
3. Starts the Node.js server
4. Server serves the built React app

## Troubleshooting

### "ENOENT: no such file or directory, stat '/opt/render/project/src/server/client/build/index.html'"
This error occurs when the React app hasn't been built. Ensure:
- The build command runs successfully
- The `client/build/` directory exists
- All dependencies are installed

### Build Failures
Check the build logs in Render dashboard for:
- Missing dependencies
- Node.js version compatibility
- Build script errors

### Health Check Failures
The health check endpoint `/api/health` should return:
```json
{
  "status": "OK",
  "message": "YouTube Downloader API is running"
}
```

## Local Development
```bash
# Install all dependencies
npm run install-all

# Start both client and server in development mode
npm run dev

# Or start individually
cd client && npm start
cd server && npm run dev
```

## File Structure After Build
```
exify/
├── client/
│   ├── build/          # ← This directory is created during build
│   │   ├── index.html
│   │   ├── static/
│   │   └── ...
│   └── src/
├── server/
│   └── server.js
└── package.json
```
