#!/usr/bin/env powershell

# YouMats Expo Tunnel Script
# This script starts Expo and creates a persistent Cloudflare tunnel

param(
    [int]$Port = 8089,
    [string]$ProjectDir = "D:\Building Materials Uber App\YouMatsApp"
)

Write-Host "🚀 Starting YouMats Expo with Cloudflare Tunnel..." -ForegroundColor Green

# Kill existing processes
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "node", "expo", "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
} catch {
    # Ignore errors if processes don't exist
}

# Navigate to project directory
Set-Location $ProjectDir

Write-Host "📱 Starting Expo on port $Port..." -ForegroundColor Cyan

# Start Expo in background
$expoJob = Start-Job -ScriptBlock {
    param($ProjectDir, $Port)
    Set-Location $ProjectDir
    npx expo start --lan --port $Port --clear
} -ArgumentList $ProjectDir, $Port

# Wait for Expo to start
Write-Host "⏳ Waiting for Expo to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check if Expo started successfully
$expoRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $expoRunning = $true
    }
} catch {
    # Try alternative check
    $netstat = netstat -an | Select-String ":$Port"
    if ($netstat) {
        $expoRunning = $true
    }
}

if ($expoRunning) {
    Write-Host "✅ Expo is running on port $Port" -ForegroundColor Green
    
    # Start Cloudflare tunnel
    Write-Host "🌐 Creating Cloudflare tunnel..." -ForegroundColor Cyan
    
    $tunnelJob = Start-Job -ScriptBlock {
        param($Port)
        & "d:\cloudflared.exe" tunnel --url "http://localhost:$Port"
    } -ArgumentList $Port
    
    # Wait for tunnel to establish
    Start-Sleep -Seconds 10
    
    # Monitor tunnel output for URL
    $tunnelOutput = Receive-Job -Job $tunnelJob -Keep
    $tunnelUrl = $tunnelOutput | Select-String "https://.*\.trycloudflare\.com" | ForEach-Object { $_.Matches[0].Value }
    
    if ($tunnelUrl) {
        Write-Host "🎉 SUCCESS! Your app is available at:" -ForegroundColor Green
        Write-Host "   $tunnelUrl" -ForegroundColor White -BackgroundColor Blue
        Write-Host ""
        Write-Host "📱 To test on your mobile device:" -ForegroundColor Yellow
        Write-Host "   1. Open Expo Go app" -ForegroundColor White
        Write-Host "   2. Scan QR code or enter URL: $tunnelUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "🛑 Press Ctrl+C to stop the tunnel and Expo server" -ForegroundColor Red
        
        # Keep running until user stops
        try {
            while ($true) {
                Start-Sleep -Seconds 5
                
                # Check if jobs are still running
                if ($expoJob.State -ne "Running" -or $tunnelJob.State -ne "Running") {
                    Write-Host "⚠️  One of the services stopped. Restarting..." -ForegroundColor Yellow
                    break
                }
            }
        } catch {
            Write-Host "🛑 Stopping services..." -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Failed to create tunnel. Tunnel output:" -ForegroundColor Red
        Receive-Job -Job $tunnelJob
    }
} else {
    Write-Host "❌ Failed to start Expo on port $Port" -ForegroundColor Red
    Receive-Job -Job $expoJob
}

# Cleanup
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Stop-Job -Job $expoJob, $tunnelJob -ErrorAction SilentlyContinue
Remove-Job -Job $expoJob, $tunnelJob -ErrorAction SilentlyContinue

Write-Host "✅ Done!" -ForegroundColor Green
