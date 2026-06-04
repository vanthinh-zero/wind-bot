const fs = require('fs').promises;
const fsSync = require('fs');
const { LINH_CAN_TYPES } = require('../config/tutien_config');

const DB_FILE = './tutien_db.json';
let tuTienData = new Map();

if (fsSync.existsSync(DB_FILE)) {
    try {
        const rawData = fsSync.readFileSync(DB_FILE, 'utf8');
        tuTienData = new Map(Object.entries(JSON.parse(rawData)));
        console.log('📦 [Database] Đã tải dữ liệu Tu Tiên thành công!');
    } catch (err) {
        console.error('❌ [Database] Lỗi đọc file:', err);
    }
}

async function saveTuTienData() {
    try {
        const obj = Object.fromEntries(tuTienData);
        await fs.writeFile(DB_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
        console.error('❌ [Database] Lỗi lưu file:', err);
    }
}

function getTuSi(userId, username) {
    if (!tuTienData.has(userId)) {
        const randomLinhCan = LINH_CAN_TYPES[Math.floor(Math.random() * LINH_CAN_TYPES.length)];
        tuTienData.set(userId, {
            name: username,
            canhGioiId: 1,
            exp: 0,
            linhThach: 100,
            lastTuLuyen: 0,
            lastLichLuyen: 0,
            linhCan: randomLinhCan.name,
            lastPillTime: 0,
            pillCountToday: 0,
            isTrucCoActive: false,
            isPhaMaActive: false,
            bag: { quy_nguyen: 0, tu_khi: 0, truc_co_dan: 0, pha_ma_dan: 0 }
        });
        saveTuTienData();
    }
    const data = tuTienData.get(userId);
    if (!data.bag) data.bag = { quy_nguyen: 0, tu_khi: 0, truc_co_dan: 0, pha_ma_dan: 0 };
    if (data.isTrucCoActive === undefined) data.isTrucCoActive = false;
    if (data.isPhaMaActive === undefined) data.isPhaMaActive = false;
    return data;
}

module.exports = { getTuSi, saveTuTienData };