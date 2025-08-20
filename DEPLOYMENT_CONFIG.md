# YouMats App - Deployment Configuration

## 🚀 Production Setup Instructions

### 1. Domain Setup
When you deploy your app, you'll need to:
- Register domain: `youmats.app` (or your preferred domain)
- Set up hosting for the reset password page

### 2. Supabase Configuration
In your Supabase dashboard, configure these URLs:

**Site URL:**
```
https://youmats.app
```

**Additional Redirect URLs:**
```
https://youmats.app/**
https://youmats.app/auth/reset-password
youmats://app
```

### 3. File Hosting
Upload `public/reset-password.html` to your web hosting at:
```
https://youmats.app/auth/reset-password/index.html
```

### 4. Mobile App Deep Linking
Configure your mobile app to handle:
```
youmats://app
```

## 📱 How It Works

1. **User requests reset** → App calls Supabase
2. **Email sent** → Contains link to `https://youmats.app/auth/reset-password`
3. **User clicks link** → Opens secure web page
4. **Password reset** → Redirects back to mobile app
5. **User logs in** → With new password in mobile app

## 🌐 Hosting Options

### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
cd "Building Materials Uber App"
vercel --prod
```

### Option 2: Netlify
1. Upload `public` folder to Netlify
2. Set custom domain to `youmats.app`

### Option 3: GitHub Pages
1. Push to GitHub
2. Enable Pages in repository settings
3. Set custom domain

## 🔧 Environment Configuration

### Development
- Reset emails will show localhost errors
- Use Expo for testing other features

### Production
- All reset links will work properly
- Professional user experience

## ✅ Deployment Checklist

- [ ] Register domain name
- [ ] Set up web hosting
- [ ] Upload reset-password.html
- [ ] Configure Supabase URLs
- [ ] Test password reset flow
- [ ] Configure mobile app deep linking

## 📞 Support
After deployment, password reset will work seamlessly across all devices with enterprise-grade security.
