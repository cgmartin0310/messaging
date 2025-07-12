# Database Connection Troubleshooting Guide

## Issue: Self-Signed Certificate Error on Render

The error you're seeing is common when deploying PostgreSQL applications on Render. Here's how to fix it:

### 1. Updated Configuration

I've updated your database configuration to handle SSL certificate issues more gracefully:

- **Enhanced SSL handling** in `config/database.js`
- **Automatic fallback** to non-SSL connection if SSL fails
- **Better error messages** and debugging information

### 2. Environment Variables

Make sure your Render environment variables are set correctly:

**Required Variables:**
```
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
```

**Optional SSL Variables (if you have custom certificates):**
```
SSL_CA=your-ssl-ca-certificate
SSL_CERT=your-ssl-certificate
SSL_KEY=your-ssl-private-key
```

### 3. Render PostgreSQL Database Setup

1. **Create a PostgreSQL database on Render:**
   - Go to your Render dashboard
   - Click "New" → "PostgreSQL"
   - Choose a name and region
   - Note the connection details

2. **Get your database URL:**
   - In your PostgreSQL service dashboard
   - Copy the "External Database URL"
   - It should look like: `postgresql://username:password@host:port/database`

3. **Set the environment variable:**
   - In your web service dashboard
   - Go to "Environment" tab
   - Add `DATABASE_URL` with your PostgreSQL URL

### 4. Testing Your Connection

You can test your database connection locally:

```bash
# Test database connection
npm run test-db
```

### 5. Common Issues and Solutions

#### Issue: "self-signed certificate"
**Solution:** The updated configuration now handles this automatically by:
- Disabling SSL certificate verification
- Providing fallback to non-SSL connection
- Adding retry logic

#### Issue: "Connection refused"
**Solution:** 
- Check if your PostgreSQL service is running on Render
- Verify the database URL is correct
- Ensure the database exists

#### Issue: "Authentication failed"
**Solution:**
- Double-check username and password in DATABASE_URL
- Verify the database credentials are correct

#### Issue: "Database does not exist"
**Solution:**
- Check the database name in your DATABASE_URL
- Ensure the database was created on Render

### 6. Render-Specific Configuration

Your `render.yaml` should include:

```yaml
services:
  - type: web
    name: messaging-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false  # Set this manually in Render dashboard
```

### 7. Manual Environment Variable Setup

1. Go to your Render web service dashboard
2. Click "Environment" tab
3. Add these variables:
   ```
   NODE_ENV=production
   DATABASE_URL=your-postgresql-url-from-render
   JWT_SECRET=your-jwt-secret
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_CONVERSATIONS_SERVICE_SID=your-conversations-sid
   ```

### 8. Deployment Steps

1. **Push your changes to GitHub**
2. **Redeploy on Render** (should happen automatically)
3. **Check the logs** for database connection status
4. **Test the health endpoint**: `https://your-app.onrender.com/api/health`

### 9. Health Check Endpoint

Your app now includes a health check endpoint that shows database status:

```
GET https://your-app.onrender.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-07-12T16:14:55.265Z",
  "postgresql": "connected"
}
```

### 10. Debugging Commands

If you're still having issues:

```bash
# Test database connection locally
npm run test-db

# Check environment variables
echo $DATABASE_URL

# Test with curl (replace with your actual URL)
curl https://your-app.onrender.com/api/health
```

### 11. Next Steps

After implementing these changes:

1. **Redeploy your application** on Render
2. **Monitor the logs** for database connection status
3. **Test the health endpoint** to verify connectivity
4. **Check your frontend** to ensure it can connect to the backend

The updated configuration should resolve the SSL certificate issues and provide better error handling for your Render deployment. 