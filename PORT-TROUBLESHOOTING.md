# 🔧 Port 3000 Troubleshooting Guide

This guide explains how to fix the recurring "EADDRINUSE: address already in use :::3000" error.

## 🚨 The Problem

When you see this error:
```
Error: listen EADDRINUSE: address already in use :::3000
```

It means another Node.js process is already using port 3000, preventing your dev server from starting.

## ✅ Solutions (Multiple Options)

### **Option 1: Automatic Cleanup (Recommended)**

The project now has automatic port cleanup built-in:

```bash
npm run dev
```

This automatically runs cleanup before starting the dev server.

### **Option 2: Manual Cleanup Commands**

```bash
# Clean up port and processes
npm run cleanup

# Clean up and start dev server
npm run dev:clean

# Just kill port 3000 processes
npm run kill-port
```

### **Option 3: Windows Batch File**

Double-click `cleanup.bat` or run:
```cmd
cleanup.bat
```

### **Option 4: Manual Windows Commands**

```cmd
# Kill all Node.js processes
taskkill /f /im node.exe

# Find processes using port 3000
netstat -ano | findstr :3000

# Kill specific process (replace PID with actual process ID)
taskkill /F /PID [PID]
```

### **Option 5: PowerShell One-liner**

```powershell
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force; npm run dev
```

## 🔄 How the Automatic Solution Works

1. **predev script**: Automatically runs before `npm run dev`
2. **cleanup-port.js**: Intelligent script that:
   - Finds processes using port 3000
   - Kills them safely
   - Confirms port is free
   - Works on Windows, macOS, and Linux

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (with auto cleanup) |
| `npm run cleanup` | Clean up port 3000 only |
| `npm run dev:clean` | Clean up + start dev server |
| `npm run kill-port` | Kill processes using port 3000 |

## 🛠️ Technical Details

### Why This Happens
- Previous dev server didn't shut down properly
- IDE/editor crashed while server was running
- Multiple terminal windows running dev servers
- Background processes holding onto the port

### Prevention
- Always use `Ctrl+C` to stop the dev server properly
- Close terminal windows cleanly
- Use the provided cleanup scripts

## 🎯 Quick Fix Commands

For immediate relief, run any of these:

```bash
# Option A: Use our cleanup script
npm run cleanup && npm run dev

# Option B: Use the combined script
npm run dev:clean

# Option C: Kill all node processes (Windows)
taskkill /f /im node.exe && npm run dev
```

## 🚀 Future Prevention

The automatic cleanup (`predev` script) should prevent this issue from recurring. If you still encounter problems:

1. Make sure you're using `npm run dev` (not `next dev` directly)
2. Check if any other applications are using port 3000
3. Try using a different port: `PORT=3001 npm run dev`

## 📞 Still Having Issues?

If the problem persists:
1. Restart your computer (nuclear option)
2. Check for other applications using port 3000
3. Use a different port temporarily: `PORT=3001 npm run dev`

---

**✅ This issue should now be permanently resolved with the automatic cleanup system!**
