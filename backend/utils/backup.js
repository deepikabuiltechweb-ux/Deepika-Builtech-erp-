import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure base backup directory exists
const backupBaseDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupBaseDir)) {
  fs.mkdirSync(backupBaseDir, { recursive: true });
}

export const runBackup = () => {
  const date = new Date();
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  const backupPath = path.join(backupBaseDir, dateString);

  console.log(`[Backup] Starting database backup for ${dateString}...`);

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Backup] MONGODB_URI is not defined in environment variables.');
    return;
  }

  // Construct mongodump command
  // Note: --uri wraps the connection string. --out specifies output directory
  const cmd = `mongodump --uri="${uri}" --out="${backupPath}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Backup] Failed: ${error.message}`);
      return;
    }
    console.log(`[Backup] Success! Saved to ${backupPath}`);
    
    // Clean up old backups (keep last 7 days)
    cleanupOldBackups();
  });
};

const cleanupOldBackups = () => {
  console.log('[Backup] Cleaning up old backups...');
  const KEEP_DAYS = 7;
  const now = Date.now();

  fs.readdir(backupBaseDir, (err, files) => {
    if (err) {
      console.error(`[Backup Cleanup] Error reading backup directory: ${err.message}`);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(backupBaseDir, file);
      
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        // Check if directory name matches YYYY-MM-DD pattern to avoid deleting other stuff
        const isDateFolder = /^\d{4}-\d{2}-\d{2}$/.test(file);
        if (stats.isDirectory() && isDateFolder) {
          const folderDate = new Date(file).getTime();
          const ageInDays = (now - folderDate) / (1000 * 60 * 60 * 24);
          
          if (ageInDays > KEEP_DAYS) {
            fs.rm(filePath, { recursive: true, force: true }, (err) => {
              if (err) {
                console.error(`[Backup Cleanup] Failed to delete ${file}: ${err.message}`);
              } else {
                console.log(`[Backup Cleanup] Deleted old backup: ${file}`);
              }
            });
          }
        }
      });
    });
  });
};

export const initBackupCron = () => {
  // Schedule to run every day at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    console.log('[Backup] Running scheduled daily backup...');
    runBackup();
  }, {
    scheduled: true,
    timezone: "UTC" 
  });
  
  console.log('[Backup] Cron job initialized. Scheduled for daily at midnight.');
};
