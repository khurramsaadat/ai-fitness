#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');

const PORT = process.env.PORT || 3000;

function killProcessOnPort(port) {
  return new Promise((resolve) => {
    if (os.platform() === 'win32') {
      // Windows: Find and kill processes using the port
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`✅ Port ${port} is free`);
          resolve();
          return;
        }

        const lines = stdout.split('\n').filter(line => line.trim());
        const pids = new Set();
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
            pids.add(parts[4]);
          }
        });

        if (pids.size === 0) {
          console.log(`✅ Port ${port} is free`);
          resolve();
          return;
        }

        console.log(`🔄 Killing ${pids.size} process(es) using port ${port}...`);
        
        let killed = 0;
        pids.forEach(pid => {
          exec(`taskkill /F /PID ${pid}`, (killError) => {
            killed++;
            if (!killError) {
              console.log(`✅ Killed process ${pid}`);
            }
            if (killed === pids.size) {
              console.log(`🎉 Port ${port} is now free!`);
              resolve();
            }
          });
        });
      });
    } else {
      // macOS/Linux: Kill process using lsof
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (error || !stdout.trim()) {
          console.log(`✅ Port ${port} is free`);
          resolve();
          return;
        }

        const pid = stdout.trim();
        exec(`kill -9 ${pid}`, (killError) => {
          if (!killError) {
            console.log(`✅ Killed process ${pid} using port ${port}`);
          }
          console.log(`🎉 Port ${port} is now free!`);
          resolve();
        });
      });
    }
  });
}

async function main() {
  console.log(`🧹 Cleaning up port ${PORT}...`);
  await killProcessOnPort(PORT);
  
  // Also kill any remaining node processes (Windows specific)
  if (os.platform() === 'win32') {
    exec('taskkill /f /im node.exe 2>nul', () => {
      console.log('🧹 Cleaned up any remaining Node.js processes');
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = { killProcessOnPort };
