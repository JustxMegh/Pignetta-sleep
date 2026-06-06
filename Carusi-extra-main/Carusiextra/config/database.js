const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '../data/temproles.json');
const configFile = path.join(__dirname, '../data/config.json');

// Inizializza i file se non esistono
if (!fs.existsSync(path.dirname(dbFile))) fs.mkdirSync(path.dirname(dbFile), { recursive: true });
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, '[]');
if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, '{"logChannelId": null}');

const loadTempRoles = () => JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
const saveTempRoles = (data) => fs.writeFileSync(dbFile, JSON.stringify(data, null, 4));

const loadConfig = () => JSON.parse(fs.readFileSync(configFile, 'utf-8'));
const saveConfig = (data) => fs.writeFileSync(configFile, JSON.stringify(data, null, 4));

module.exports = { loadTempRoles, saveTempRoles, loadConfig, saveConfig };
