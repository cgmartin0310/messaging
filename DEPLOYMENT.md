# Deployment Guide for Render

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **PostgreSQL Database**: Create a PostgreSQL database on Render
3. **Environment Variables**: Set up all required environment variables

## Environment Variables

### Backend Environment Variables

Set these in your Render backend service:

- `DATABASE_URL`: Your PostgreSQL connection string from Render
- `JWT_SECRET`: A secure random string for JWT token signing
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `TWILIO_CONVERSATIONS_SERVICE_SID`: Your Twilio Conversations Service SID
- `NODE_ENV`: Set to `production`

### Frontend Environment Variables

Set these in your Render frontend service:

- `REACT_APP_API_URL`: The URL of your backend service (e.g., `https://your-backend-name.onrender.com`)

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Push your code to GitHub**
2. **Connect your GitHub repo to Render**
3. **Render will automatically detect the `render.yaml` file**
4. **Set up environment variables in Render dashboard**
5. **Deploy both services**

### Option 2: Manual Deployment

#### Backend Deployment

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add all backend environment variables
5. Deploy

#### Frontend Deployment

1. Create a new **Static Site** on Render
2. Connect your GitHub repository
3. Set the following:
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`
4. Add the frontend environment variable
5. Deploy

## Database Setup

1. Create a PostgreSQL database on Render
2. Copy the connection string to your backend environment variables
3. The database tables will be created automatically when the backend starts

## Post-Deployment

1. **Test the API**: Visit `https://your-backend-name.onrender.com/api/health`
2. **Test the Frontend**: Visit your frontend URL
3. **Update CORS**: If needed, update CORS settings in `server.js`

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure `DATABASE_URL` is correct and includes SSL parameters
2. **CORS Errors**: Update CORS origin in `server.js` to include your frontend URL
3. **Build Failures**: Check that all dependencies are in `package.json`
4. **Environment Variables**: Ensure all required variables are set in Render dashboard

### Logs

- Check Render logs for both services
- Backend logs will show database connection status
- Frontend logs will show build status

## Security Notes

- Never commit `.env` files to Git
- Use strong, unique JWT secrets
- Keep Twilio credentials secure
- Enable HTTPS in production 