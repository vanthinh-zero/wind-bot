const { db } = require('../utils/db');
const path = require('path');
const fs = require('fs');

function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── AUTO MIGRATE database.json → SQLite ───
async function autoMigrateCounterData() {
    try {
        const isMigrated = await db.get('system.migrated_counter_json');
        if (isMigrated) return;

        const dataFile = path.join(process.cwd(), 'database.json');
        if (fs.existsSync(dataFile)) {
            const raw = fs.readFileSync(dataFile, 'utf-8');
            const data = JSON.parse(raw || '{}');
            for (const [uid, udata] of Object.entries(data)) {
                await db.set(`counter.${uid}`, udata);
            }
            console.log(`✅ [Database] Đã di chuyển ${Object.keys(data).length} bản ghi từ database.json sang SQLite!`);
        }

        await db.set('system.migrated_counter_json', true);
    } catch (e) {
        console.error('❌ [Database] Lỗi migrate counter data:', e);
    }
}

autoMigrateCounterData();

// ─── CRUD FUNCTIONS ───
const pendingUsers = new Map();
const pendingGuilds = new Map();
let flushPromise = null;

async function flushCounterWrites() {
    if (flushPromise) return flushPromise;

    flushPromise = (async () => {
        const users = [...pendingUsers.entries()];
        const guilds = [...pendingGuilds.entries()];
        pendingUsers.clear();
        pendingGuilds.clear();

        for (const [userId, pending] of users) {
            const data = (await db.get(`counter.${userId}`)) || {
                username: pending.username,
                totalMessages: 0,
                totalVoiceMinutes: 0,
                dailyMessages: {},
                dailyVoice: {}
            };
            data.username = pending.username || data.username;
            data.totalMessages = (data.totalMessages || 0) + pending.messages;
            data.dailyMessages = data.dailyMessages || {};
            data.dailyMessages[pending.today] = (data.dailyMessages[pending.today] || 0) + pending.messages;
            await db.set(`counter.${userId}`, data);
        }

        for (const [guildId, pending] of guilds) {
            const climate = (await db.get(`climate.${guildId}`)) || { messages: 0, activeUsers: {}, lastMessageAt: 0 };
            climate.messages = (climate.messages || 0) + pending.messages;
            climate.activeUsers = climate.activeUsers || {};
            for (const [userId, count] of Object.entries(pending.activeUsers)) {
                climate.activeUsers[userId] = (climate.activeUsers[userId] || 0) + count;
            }
            climate.lastMessageAt = pending.lastMessageAt;
            await db.set(`climate.${guildId}`, climate);
        }
    })().finally(() => {
        flushPromise = null;
    });

    return flushPromise;
}

const flushTimer = setInterval(() => {
    flushCounterWrites().catch(error => console.error('❌ Lỗi flush counter:', error));
}, 5000);
flushTimer.unref?.();

async function addMessageCount(userId, username, guildId = null) {
    try {
        const today = getTodayStr();
        const userPending = pendingUsers.get(userId) || { username, today, messages: 0 };
        userPending.username = username || userPending.username;
        userPending.today = today;
        userPending.messages += 1;
        pendingUsers.set(userId, userPending);
        if (guildId) {
            const guildPending = pendingGuilds.get(guildId) || { messages: 0, activeUsers: {}, lastMessageAt: 0 };
            guildPending.messages += 1;
            guildPending.activeUsers[userId] = (guildPending.activeUsers[userId] || 0) + 1;
            guildPending.lastMessageAt = Date.now();
            pendingGuilds.set(guildId, guildPending);
        }
    } catch (e) {
        console.error('❌ Lỗi lưu tin nhắn:', e);
    }
}

async function addVoiceMinutes(userId, username, minutes) {
    try {
        const today = getTodayStr();
        let data = (await db.get(`counter.${userId}`)) || {
            username: username,
            totalMessages: 0,
            totalVoiceMinutes: 0,
            dailyMessages: {},
            dailyVoice: {}
        };

        data.username = username || data.username;
        data.totalVoiceMinutes = (data.totalVoiceMinutes || 0) + minutes;
        if (!data.dailyVoice) data.dailyVoice = {};
        data.dailyVoice[today] = (data.dailyVoice[today] || 0) + minutes;

        await db.set(`counter.${userId}`, data);
    } catch (e) {
        console.error('❌ Lỗi lưu dữ liệu voice:', e);
    }
}

// 📊 HÀM LẤY DATA RANKING 30 NGÀY
async function getTopData(limit = 5) {
    try {
        await flushCounterWrites();
        const allData = (await db.get('counter')) || {};
        const keys = Object.keys(allData);

        const userList = keys.map(id => {
            const dailyMsg = allData[id].dailyMessages || {};

            // Lấy dữ liệu của 30 ngày gần nhất
            let last30DaysMsg = Object.values(dailyMsg).slice(-30);

            // Đảm bảo mảng luôn đủ 30 phần tử
            while (last30DaysMsg.length < 30) {
                last30DaysMsg.unshift(0);
            }

            // Nếu ngày hiện tại chưa ghi nhận, gán fallback nhẹ
            if (last30DaysMsg[29] === 0 && (allData[id].totalMessages || 0) > 0) {
                last30DaysMsg[29] = allData[id].totalMessages;
            }

            return {
                id: id,
                username: allData[id].username || 'Unknown',
                messages: allData[id].totalMessages || 0,
                voiceHours: ((allData[id].totalVoiceMinutes || 0) / 60).toFixed(1),
                chartData: last30DaysMsg
            };
        });

        return userList.sort((a, b) => b.messages - a.messages).slice(0, limit);
    } catch (e) {
        console.error('❌ Lỗi lấy danh sách xếp hạng:', e);
        return [];
    }
}

module.exports = { addMessageCount, addVoiceMinutes, getTopChat: getTopData, flushCounterWrites };