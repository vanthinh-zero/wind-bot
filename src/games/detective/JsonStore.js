const fs = require('fs');
const path = require('path');

class JsonStore {
  constructor(dataDir = path.join(process.cwd(), 'data', 'detective-db')) {
    this.dataDir = dataDir;
    fs.mkdirSync(dataDir, { recursive: true });
    this.cache = {};
  }

  file(collection) {
    return path.join(this.dataDir, collection + '.json');
  }

  load(collection) {
    if (this.cache[collection]) return this.cache[collection];
    const file = this.file(collection);
    if (!fs.existsSync(file)) {
      this.cache[collection] = {};
      return this.cache[collection];
    }
    try {
      this.cache[collection] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      console.error('❌ [Detective] Không thể đọc ' + collection + '.json:', error.message);
      this.cache[collection] = {};
    }
    return this.cache[collection];
  }

  save(collection) {
    const file = this.file(collection);
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(this.cache[collection], null, 2), 'utf8');
    fs.renameSync(temp, file);
  }

  get(collection, key) {
    return this.load(collection)[key];
  }

  set(collection, key, value) {
    this.load(collection)[key] = value;
    this.save(collection);
  }

  values(collection) {
    return Object.values(this.load(collection));
  }
}

module.exports = JsonStore;