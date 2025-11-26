# Production Deployment Guide - Grow

## ✅ Updates Completed

### 1. **Package.json Updated**
   - Added `dev` script: `nodemon server.js`
   - Added `start` script: `node server.js`
   - Fixed deprecated dependencies versions
   - Added `bcryptjs` for password hashing
   - Added `dotenv` for environment variables

### 2. **Security Enhancements**
   - ✅ Password hashing with bcryptjs (10 salt rounds)
   - ✅ Password validation during login
   - ✅ Input validation on all routes
   - ✅ Environment variables for sensitive data

### 3. **Environment Configuration**
   - Created `.env` file with all configuration
   - Development and production MongoDB URI support
   - JWT and Session secret placeholders

### 4. **Code Quality**
   - Fixed MongoDB deprecated options
   - Added error handling to reset route
   - Improved logging and error messages

---

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
- Uses nodemon for auto-restart on file changes
- Connects to local MongoDB (127.0.0.1:27017)

### Production Mode
```bash
npm start
```
- Connects to production MongoDB URI from .env
- Set `NODE_ENV=production`

---

## 🔧 Environment Variables (.env)

Before deploying to production, update these values:

```env
NODE_ENV=production
PORT=3000
MONGODB_PRODUCTION_URI=mongodb+srv://username:password@cluster.mongodb.net/grow_crm
JWT_SECRET=your_strong_random_key_here
SESSION_SECRET=your_strong_random_key_here
```

### Generate Strong Secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📦 API Endpoints

### POST `/api/register`
- **Body**: `{ firmName, email, password }`
- **Response**: `{ success: true, message: 'Account created successfully' }`

### POST `/api/login`
- **Body**: `{ email, password }`
- **Response**: `{ success: true, message: 'Login successful', user: {...} }`

### POST `/api/forgot`
- **Body**: `{ email }`
- **Response**: `{ success: true, message: 'Reset link sent to your email' }`

### POST `/api/reset`
- **Body**: `{ email, password }`
- **Response**: `{ success: true, message: 'Password updated successfully' }`

---

## 🌐 Deployment Platforms

### **Heroku**
1. Create `Procfile` with: `web: npm start`
2. Push to Heroku: `git push heroku main`
3. Set config vars: `heroku config:set NODE_ENV=production`

### **AWS Elastic Beanstalk**
1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init`
3. Deploy: `eb create && eb deploy`

### **Railway/Render/Vercel**
1. Connect Git repository
2. Set environment variables in dashboard
3. Deploy automatically on push

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## ✨ Next Steps for Production

1. ✅ **Database**: Set up MongoDB Atlas or self-hosted MongoDB
2. ✅ **Email Service**: Implement email sending for password reset
3. ✅ **JWT Tokens**: Add JWT authentication instead of storing passwords
4. ✅ **Rate Limiting**: Add express-rate-limit middleware
5. ✅ **Input Sanitization**: Add express-validator for cleaner validation
6. ✅ **HTTPS**: Enable SSL certificates in production
7. ✅ **Logging**: Set up Winston or similar for production logs
8. ✅ **Monitoring**: Add APM tools (New Relic, DataDog, etc.)

---

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running locally or MongoDB Atlas is accessible
- Check `MONGODB_URI` and `MONGODB_PRODUCTION_URI` in `.env`

### Port Already in Use
```bash
# Find process on port 3000 (Windows)
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

### nodemon not found
```bash
npm install --save-dev nodemon
```

---

## 📋 Files Modified

- ✅ `package.json` - Scripts and dependencies updated
- ✅ `server.js` - Environment variables and MongoDB config
- ✅ `routes/authRoutes.js` - Password hashing and validation
- ✅ `.env` - Configuration template
- ✅ `DEPLOYMENT.md` - This guide

---

## 📞 Support

For issues or questions:
- Check `.env` configuration
- Verify MongoDB connection
- Review console logs for errors
- Test endpoints with Postman/Insomnia
