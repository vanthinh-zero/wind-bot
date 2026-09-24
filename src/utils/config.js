const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '../config/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

function envOrSetting(envName, settingPath, fallback = '') {
    const value = process.env[envName];
    if (value && value.trim()) return value.trim();

    return settingPath.split('.').reduce((current, key) => current?.[key], settings) ?? fallback;
}

function getSettings() {
    return settings;
}

module.exports = { getSettings, envOrSetting };
