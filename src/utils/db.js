const { QuickDB } = require('quick.db');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new QuickDB({
    filePath: path.join(dataDir, 'windbot.sqlite')
});

const INFINITY_SYMBOL = '∞';

// ─── 1. CẤU HÌNH SERVER / GUILD ───
async function getGuildConfig(guildId) {
    if (!guildId) return {};
    return (await db.get(`guilds.${guildId}`)) || {};
}

async function setGuildChannel(guildId, channelType, channelId) {
    if (!guildId || !channelType) return false;
    await db.set(`guilds.${guildId}.channels.${channelType}`, channelId);
    return true;
}

async function getGuildChannel(guildId, channelType) {
    if (!guildId || !channelType) return null;
    return (await db.get(`guilds.${guildId}.channels.${channelType}`)) || null;
}

// ─── 2. HỆ THỐNG TIỀN TỆ / KINH TẾ (ECONOMY) ───
async function getUserEconomy(userId) {
    const ADMIN_ID = process.env.ADMIN_ID;
    if (ADMIN_ID && userId === ADMIN_ID) {
        const data = (await db.get(`economy.${userId}`)) || {};
        return {
            balance: INFINITY_SYMBOL,
            lastDaily: data.lastDaily || null,
            job: data.job || 'admin'
        };
    }

    let data = await db.get(`economy.${userId}`);
    if (!data) {
        data = { balance: 0, lastDaily: null };
        await db.set(`economy.${userId}`, data);
    }
    if (typeof data === 'number') {
        data = { balance: data, lastDaily: null };
        await db.set(`economy.${userId}`, data);
    }
    return data;
}

async function getUserMoney(userId) {
    const ADMIN_ID = process.env.ADMIN_ID;
    if (ADMIN_ID && userId === ADMIN_ID) return INFINITY_SYMBOL;
    const eco = await getUserEconomy(userId);
    return typeof eco.balance === 'number' ? eco.balance : 0;
}

async function addMoney(userId, amount) {
    const ADMIN_ID = process.env.ADMIN_ID;
    if (ADMIN_ID && userId === ADMIN_ID) return INFINITY_SYMBOL;

    const current = await getUserMoney(userId);
    const newBalance = Math.max(0, (typeof current === 'number' ? current : 0) + Number(amount));
    await db.set(`economy.${userId}.balance`, newBalance);
    return newBalance;
}

async function setMoney(userId, amount) {
    const ADMIN_ID = process.env.ADMIN_ID;
    if (ADMIN_ID && userId === ADMIN_ID) return INFINITY_SYMBOL;
    const newBalance = Math.max(0, Number(amount));
    await db.set(`economy.${userId}.balance`, newBalance);
    return newBalance;
}

async function updateUserEconomy(userId, key, value) {
    await db.set(`economy.${userId}.${key}`, value);
}

async function getGuildEconomy(guildId, userId) {
    if (!guildId) return getUserEconomy(userId);
    const adminId = process.env.ADMIN_ID;
    if (adminId && userId === adminId) return { balance: INFINITY_SYMBOL, lastDaily: null, job: 'admin' };

    const key = `economy.guilds.${guildId}.${userId}`;
    let data = await db.get(key);
    if (!data) {
        const legacy = await db.get(`economy.${userId}`);
        data = {
            balance: typeof legacy?.balance === 'number' ? legacy.balance : 0,
            lastDaily: null
        };
        await db.set(key, data);
    }
    return data;
}

async function getGuildMoney(guildId, userId) {
    if (!guildId) return getUserMoney(userId);
    const economy = await getGuildEconomy(guildId, userId);
    if (typeof economy.balance === 'number') return economy.balance;
    const userBal = await getUserMoney(userId);
    return typeof userBal === 'number' ? userBal : 0;
}

async function addGuildMoney(guildId, userId, amount) {
    if (!guildId) return addMoney(userId, amount);
    const current = await getGuildMoney(guildId, userId);
    if (current === INFINITY_SYMBOL) return current;
    const next = Math.max(0, Number(current || 0) + Number(amount));
    await db.set(`economy.guilds.${guildId}.${userId}.balance`, next);
    // Đồng bộ vào user economy toàn cục
    await db.set(`economy.${userId}.balance`, next);
    return next;
}

async function updateGuildEconomy(guildId, userId, key, value) {
    if (!guildId) return updateUserEconomy(userId, key, value);
    await db.set(`economy.guilds.${guildId}.${userId}.${key}`, value);
    await db.set(`economy.${userId}.${key}`, value);
}

function formatMoney(amount) {
    if (amount === INFINITY_SYMBOL || typeof amount === 'string') {
        return amount;
    }
    return Number(amount || 0).toLocaleString();
}

// ─── 3. HỆ THỐNG HỒ SƠ THÀNH VIÊN (PROFILES) ───
const DEFAULT_GIF = 'https://media.discordapp.net/attachments/1528282202222235718/1528878087683706880/MOO_MOO_9.gif?ex=6a608eed&is=6a5f3d6d&hm=1ed4637eb577a1624a0d6d336fa3069836c6a77285de6fc4c6df4d91af18f581&=';
const DEFAULT_DIVIDER = '────୨ৎ────────୨ৎ────────୨ৎ────';

const DEFAULT_PROFILE = {
    title: 'HỒ SƠ THÀNH VIÊN',
    bio: 'Xin chào! Rất vui được làm quen với mọi người.',
    status: 'Đang hoạt động',
    color: '#2B2D31',
    media: DEFAULT_GIF,
    badge: '👑',
    divider: DEFAULT_DIVIDER,
    footerText: 'Dùng các lệnh /set... để trang trí hồ sơ',
    relationships: { totinh: null, kethon: null, banthan: null }
};

async function getUserProfile(userId) {
    let profile = await db.get(`profiles.${userId}`);
    if (!profile) {
        profile = { ...DEFAULT_PROFILE };
        await db.set(`profiles.${userId}`, profile);
    }
    const merged = { ...DEFAULT_PROFILE, ...profile };
    if (!merged.relationships) {
        merged.relationships = { totinh: null, kethon: null, banthan: null };
    }
    return merged;
}

async function updateUserProfile(userId, key, value) {
    let profile = await db.get(`profiles.${userId}`);
    if (!profile) {
        profile = { ...DEFAULT_PROFILE };
    }
    profile[key] = value;
    await db.set(`profiles.${userId}`, profile);
    return profile;
}

// ─── 4. HỆ THỐNG THÚ CƯNG (PET) ───
const DEFAULT_PET_DATA = {
    activePetId: null,
    inventory: [],
    lastClaimTime: null
};

async function getUserPetData(userId) {
    let data = await db.get(`pets.${userId}`);
    if (!data) {
        data = { ...DEFAULT_PET_DATA, lastClaimTime: Date.now() };
        await db.set(`pets.${userId}`, data);
        return data;
    }
    // Migration: convert legacy hasPet format
    if (data.hasPet !== undefined) {
        const migrated = {
            activePetId: data.hasPet ? 'pet_legacy_1' : null,
            inventory: data.hasPet ? [{
                id: 'pet_legacy_1',
                name: data.name,
                level: data.level || 1,
                exp: data.exp || 0,
                food: data.food || 100,
                originalOwner: userId,
                lockUntil: 0
            }] : [],
            lastClaimTime: Date.now()
        };
        await db.set(`pets.${userId}`, migrated);
        return migrated;
    }
    if (!data.lastClaimTime) {
        data.lastClaimTime = Date.now();
        await db.set(`pets.${userId}`, data);
    }
    return data;
}

async function saveUserPetData(userId, data) {
    await db.set(`pets.${userId}`, data);
}

// ─── 5. TỰ ĐỘNG DI CHUYỂN DỮ LIỆU CŨ (MIGRATION) ───
async function autoMigrateLegacyData() {
    try {
        const isMigrated = await db.get('system.migrated_legacy_json');
        if (isMigrated) return;

        console.log('🔄 [Database] Đang quét và di chuyển dữ liệu từ file JSON cũ sang SQLite...');

        // Di chuyển money.json
        const moneyPath = path.join(process.cwd(), 'money.json');
        if (fs.existsSync(moneyPath)) {
            const rawMoney = fs.readFileSync(moneyPath, 'utf8');
            const moneyData = JSON.parse(rawMoney || '{}');
            for (const [uid, udata] of Object.entries(moneyData)) {
                await db.set(`economy.${uid}`, udata);
            }
            console.log(`✅ [Database] Đã di chuyển ${Object.keys(moneyData).length} người dùng từ money.json sang SQLite!`);
        }

        // Di chuyển profiles.json
        const profilesPath = path.join(process.cwd(), 'profiles.json');
        if (fs.existsSync(profilesPath)) {
            const rawProfiles = fs.readFileSync(profilesPath, 'utf8');
            const profilesData = JSON.parse(rawProfiles || '{}');
            for (const [uid, pdata] of Object.entries(profilesData)) {
                await db.set(`profiles.${uid}`, pdata);
            }
            console.log(`✅ [Database] Đã di chuyển ${Object.keys(profilesData).length} hồ sơ từ profiles.json sang SQLite!`);
        }

        // Di chuyển pet_db.json
        const petDbPath = path.join(process.cwd(), 'pet_db.json');
        if (fs.existsSync(petDbPath)) {
            const rawPets = fs.readFileSync(petDbPath, 'utf8');
            const petData = JSON.parse(rawPets || '{}');
            for (const [uid, pdata] of Object.entries(petData)) {
                await db.set(`pets.${uid}`, pdata);
            }
            console.log(`✅ [Database] Đã di chuyển ${Object.keys(petData).length} dữ liệu Pet từ pet_db.json sang SQLite!`);
        }

        await db.set('system.migrated_legacy_json', true);
        console.log('🎉 [Database] Hoàn tất quá trình di chuyển dữ liệu sang SQLite an toàn!');
    } catch (err) {
        console.error('❌ [Database] Lỗi trong quá trình di chuyển dữ liệu sang SQLite:', err);
    }
}

// Khởi chạy kiểm tra di chuyển dữ liệu
autoMigrateLegacyData();

module.exports = {
    db,
    INFINITY_SYMBOL,
    getGuildConfig,
    setGuildChannel,
    getGuildChannel,
    getUserEconomy,
    getUserMoney,
    addMoney,
    getGuildEconomy,
    getGuildMoney,
    addGuildMoney,
    updateGuildEconomy,
    setMoney,
    updateUserEconomy,
    formatMoney,
    DEFAULT_PROFILE,
    DEFAULT_DIVIDER,
    DEFAULT_GIF,
    getUserProfile,
    updateUserProfile,
    getUserPetData,
    saveUserPetData
};
