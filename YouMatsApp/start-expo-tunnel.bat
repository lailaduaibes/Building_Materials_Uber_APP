@echo off
echo 🚀 Starting YouMats Expo with Cloudflare Tunnel...
echo.

cd /d "D:\Building Materials Uber App\YouMatsApp"

echo 🧹 Cleaning up existing processes...
taskkill /F /IM node.exe /IM cloudflared.exe >nul 2>&1
timeout /t 2 >nul

echo 📱 Starting Expo on port 8089...
start "Expo Server" cmd /k "npx expo start --lan --port 8089 --clear"

echo ⏳ Waiting for Expo to start...
timeout /t 15

echo 🌐 Creating Cloudflare tunnel...
start "Cloudflare Tunnel" cmd /k "d:\cloudflared.exe tunnel --url http://localhost:8089"

echo.
echo ✅ Services started!
echo 📱 Check the Cloudflare Tunnel window for your public URL
echo 🛑 Close both windows to stop the services
echo.
pause
