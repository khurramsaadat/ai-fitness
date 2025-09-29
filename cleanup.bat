@echo off
echo 🧹 AI Fitness Coach - Port Cleanup Tool
echo =====================================

echo 🔄 Killing Node.js processes...
taskkill /f /im node.exe 2>nul
if %errorlevel%==0 (
    echo ✅ Node.js processes terminated
) else (
    echo ℹ️  No Node.js processes found
)

echo 🔄 Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 2^>nul') do (
    echo 🔄 Killing process %%a using port 3000...
    taskkill /F /PID %%a 2>nul
    if not errorlevel 1 (
        echo ✅ Killed process %%a
    )
)

echo 🎉 Port cleanup complete! You can now run 'npm run dev'
echo.
pause
