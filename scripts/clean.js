const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait for synchronous sleep
  }
}

function forceKillProcesses() {
  try {
    // Kill any Node.js processes that might be locking files
    if (process.platform === 'win32') {
      execSync('taskkill /f /im node.exe 2>nul', { stdio: 'ignore' });
      sleep(500);
    }
  } catch (e) {
    // Ignore errors - processes might not exist
  }
}

function cleanDirectory(dir, maxRetries = 5) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping cleanup.`);
    return;
  }

  console.log(`Starting cleanup of ${dir}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Cleaning ${dir} (attempt ${attempt}/${maxRetries})...`);
      
      // On Windows, try to kill processes that might be locking files
      if (attempt > 1 && process.platform === 'win32') {
        console.log('Attempting to release file locks...');
        forceKillProcesses();
      }
      
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`Successfully cleaned ${dir}`);
      return;
    } catch (error) {
      console.log(`Cleanup attempt ${attempt} failed: ${error.code} - ${error.message}`);
      
      if ((error.code === 'EPERM' || error.code === 'EBUSY' || error.code === 'ENOTEMPTY') && attempt < maxRetries) {
        const waitTime = attempt * 1000; // Increase wait time with each attempt
        console.log(`Retrying in ${waitTime}ms...`);
        sleep(waitTime);
      } else if (attempt === maxRetries) {
        console.log(`Failed to clean ${dir} after ${maxRetries} attempts. Continuing anyway...`);
        console.log(`Final error: ${error.message}`);
        return;
      } else {
        throw error;
      }
    }
  }
}

// Clean the .next directory
cleanDirectory('.next');
