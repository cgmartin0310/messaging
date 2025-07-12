# Render Database Setup Guide

## The Issue
You're getting "self-signed certificate" errors even though both your backend and database are on Render. This is a common issue with Render's PostgreSQL SSL configuration.

## Step-by-Step Solution

### 1. Check Your PostgreSQL Database on Render

1. **Go to your Render dashboard**
2. **Find your PostgreSQL database service**
3. **Click on it to open the dashboard**
4. **Check the "Connections" tab**
5. **Copy the "External Database URL"**

### 2. Verify Your Database URL Format

Your DATABASE_URL should look like this:
```
postgresql://username:password@host:port/database
```

**Common issues to check:**
- ❌ `postgres://` (should be `postgresql://`)
- ❌ Missing database name at the end
- ❌ Extra SSL parameters that might conflict

### 3. Set Environment Variables Correctly

In your **web service** (not the database service):

1. **Go to your web service dashboard**
2. **Click "Environment" tab**
3. **Add/Update these variables:**

```
NODE_ENV=production
DATABASE_URL=your-postgresql-url-from-render
```

### 4. Test Your Database URL

You can test your database URL locally:

```bash
# Debug your database URL (safe - won't show credentials)
npm run debug-db

# Test the actual connection
npm run test-db
```

### 5. Common Render PostgreSQL URL Formats

Try these formats in order:

**Format 1 (Recommended):**
```
postgresql://username:password@host:port/database
```

**Format 2 (If Format 1 fails):**
```
postgresql://username:password@host:port/database?sslmode=require
```

**Format 3 (If Format 2 fails):**
```
postgresql://username:password@host:port/database?ssl=true
```

### 6. Quick Fix Steps

1. **Copy your PostgreSQL External Database URL from Render**
2. **Remove any SSL parameters from the URL** (like `?ssl=true` or `?sslmode=require`)
3. **Set this clean URL as your DATABASE_URL environment variable**
4. **Redeploy your application**

### 7. Verify Database Creation

Make sure your PostgreSQL database actually exists:

1. **In your PostgreSQL service dashboard**
2. **Check the "Logs" tab**
3. **Look for any database creation errors**
4. **Verify the database name matches what's in your DATABASE_URL**

### 8. Test the Health Endpoint

After deployment, test:
```
https://your-app.onrender.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-07-12T16:24:08.192Z",
  "postgresql": "connected"
}
```

### 9. If Still Failing

1. **Check Render PostgreSQL logs** for any database issues
2. **Verify the database name** in your DATABASE_URL matches the actual database
3. **Try creating a new PostgreSQL database** on Render
4. **Use the Internal Database URL** instead of External (if available)

### 10. Debug Commands

Run these locally to debug:

```bash
# Check your environment variables
echo $DATABASE_URL

# Debug database URL structure
npm run debug-db

# Test database connection
npm run test-db
```

## The Real Issue

The problem is likely one of these:

1. **SSL parameters in your DATABASE_URL** - Remove them
2. **Wrong database name** - Check the actual database name
3. **Database doesn't exist** - Create it in Render
4. **Wrong credentials** - Use the exact credentials from Render

Try the clean URL format first - it should work! 