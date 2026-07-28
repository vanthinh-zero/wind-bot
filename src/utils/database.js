const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { LINH_CAN_TYPES } = require('../config/tutien_config');

const DB_FILE = './tutien_db.json';
const LINHTHACH_FILE = './linhthach.json';

let tuTienData = new Map();
let linhThachData = new Map();

// ─── 1. TẢI DỮ LIỆU BAN ĐẦU ───
// Tải database Tu Tiên
if (fsSync.existsSync(DB_FILE)) {
    try {
        const rawData = fsSync.readFileSync(DB_FILE, 'utf8');
        tuTienData = new Map(Object.entries(JSON.parse(rawData)));
        console.log('📦 [Database] Đã tải dữ liệu Tu Tiên thành công!');
    } catch (err) {
        console.error('❌ [Database] Lỗi đọc file tutien_db.json:', err);
    }
}

// Tải database Linh Thạch
if (fsSync.existsSync(LINHTHACH_FILE)) {
    try {
        const rawData = fsSync.readFileSync(LINHTHACH_FILE, 'utf8');
        linhThachData = new Map(Object.entries(JSON.parse(rawData)));
        console.log('💎 [Database] Đã tải dữ liệu Linh Thạch thành công!');
    } catch (err) {
        console.error('❌ [Database] Lỗi đọc file linhthach.json:', err);
    }
}

// ─── 2. HÀM LƯU DỮ LIỆU ───
async function saveTuTienData() {
    try {
        const obj = Object.fromEntries(tuTienData);
        await fs.writeFile(DB_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
        console.error('❌ [Database] Lỗi lưu file tutien_db.json:', err);
    }
}

async function saveLinhThachData() {
    try {
        const obj = Object.fromEntries(linhThachData);
        await fs.writeFile(LINHTHACH_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
        console.error('❌ [Database] Lỗi lưu file linhthach.json:', err);
    }
}

// ─── 3. QUẢN LÝ LINH THẠCH ───
function getLinhThach(userId) {
    return linhThachData.get(userId) || 0;
}

function addLinhThach(userId, amount) {
    const hienTai = getLinhThach(userId);
    const moi = Math.max(0, hienTai + amount); // Đảm bảo số dư không bị âm
    linhThachData.set(userId, moi);
    saveLinhThachData(); // Tự động lưu vào linhthach.json
    return moi;
}

// ─── 4. QUẢN LÝ TU SĨ ───
function getTuSi(userId, username) {
    if (!tuTienData.has(userId)) {
        const randomLinhCan = LINH_CAN_TYPES[Math.floor(Math.random() * LINH_CAN_TYPES.length)];
        tuTienData.set(userId, {
            name: username,
            canhGioiId: 1,
            exp: 0,
            lastTuLuyen: 0,
            lastLichLuyen: 0,
            linhCan: randomLinhCan.name,
            lastPillTime: 0,
            pillCountToday: 0,
            isTrucCoActive: false,
            isPhaMaActive: false,
            bag: { quy_nguyen: 0, tu_khi: 0, truc_co_dan: 0, pha_ma_dan: 0 }
        });
        
        // Cấp 100 Linh Thạch tân thủ vào linhthach.json
        if (!linhThachData.has(userId)) {
            linhThachData.set(userId, 100);
            saveLinhThachData();
        }

        saveTuTienData();
    }

    const data = tuTienData.get(userId);
    if (!data.bag) data.bag = { quy_nguyen: 0, tu_khi: 0, truc_co_dan: 0, pha_ma_dan: 0 };
    if (data.isTrucCoActive === undefined) data.isTrucCoActive = false;
    if (data.isPhaMaActive === undefined) data.isPhaMaActive = false;
    
    return data;
}

function getAllTuSi() {
    return Object.fromEntries(tuTienData);
}

module.exports = { 
    getTuSi, 
    saveTuTienData, 
    getLinhThach, 
    addLinhThach,
    getAllTuSi 
};