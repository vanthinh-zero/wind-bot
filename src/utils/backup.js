const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');
const databasePath = path.join(dataDir, 'windbot.sqlite');
const backupDir = path.join(dataDir, 'backups');

function createDatabaseBackup() {
    if (!fs.existsSync(databasePath)) {
        throw new Error(`Database not found: ${databasePath}`);
    }

    fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `windbot-${timestamp}.sqlite`);
    fs.copyFileSync(databasePath, backupPath);
    return backupPath;
}

module.exports = { createDatabaseBackup };
