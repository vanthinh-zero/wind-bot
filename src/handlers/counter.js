const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, '../../database.json');

function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        return {};
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
}

function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMessageCount(userId, username) {
    try {
        const data = loadData();
        const today = getTodayStr();

        if (!data[userId]) {
            data[userId] = { username: username, totalMessages: 0, totalVoiceMinutes: 0, dailyMessages: {}, dailyVoice: {} };
        }
        
        data[userId].username = username;
        data[userId].totalMessages = (data[userId].totalMessages || 0) + 1;
        
        if (!data[userId].dailyMessages) data[userId].dailyMessages = {};
        data[userId].dailyMessages[today] = (data[userId].dailyMessages[today] || 0) + 1;

        saveData(data);
    } catch (e) {
        console.error('❌ Lỗi lưu tin nhắn:', e);
    }
}

function addVoiceMinutes(userId, username, minutes) {
    try {
        const data = loadData();
        const today = getTodayStr();

        if (!data[userId]) {
            data[userId] = { username: username, totalMessages: 0, totalVoiceMinutes: 0, dailyMessages: {}, dailyVoice: {} };
        }

        data[userId].username = username;
        data[userId].totalVoiceMinutes = (data[userId].totalVoiceMinutes || 0) + minutes;

        if (!data[userId].dailyVoice) data[userId].dailyVoice = {};
        data[userId].dailyVoice[today] = (data[userId].dailyVoice[today] || 0) + minutes;

        saveData(data);
    } catch (e) {
        console.error('❌ Lỗi lưu dữ liệu voice:', e);
    }
}

// 📊 HÀM LẤY DATA RANKING 30 NGÀY
function getTopData(limit = 5) {
    try {
        const data = loadData();
        const keys = Object.keys(data);
        
        const userList = keys.map(id => {
            const dailyMsg = data[id].dailyMessages || {};
            
            // Lấy dữ liệu của 30 ngày gần nhất
            let last30DaysMsg = Object.values(dailyMsg).slice(-30);
            
            // Đảm bảo mảng luôn đủ 30 phần tử để tránh làm gãy đường biểu đồ
            while (last30DaysMsg.length < 30) {
                last30DaysMsg.unshift(0); 
            }
            
            // Nếu ngày hiện tại chưa ghi nhận, gán fallback nhẹ bằng tổng để biểu đồ đi lên mượt mà
            if (last30DaysMsg[29] === 0 && (data[id].totalMessages || 0) > 0) {
                last30DaysMsg[29] = data[id].totalMessages;
            }

            return {
                id: id,
                username: data[id].username || 'Unknown',
                messages: data[id].totalMessages || 0,
                voiceHours: ((data[id].totalVoiceMinutes || 0) / 60).toFixed(1),
                chartData: last30DaysMsg // Mảng chứa 30 điểm mốc dữ liệu
            };
        });

        // Sắp xếp giảm dần theo tin nhắn
        return userList.sort((a, b) => b.messages - a.messages).slice(0, limit);
    } catch (e) {
        console.error('❌ Lỗi lấy danh sách xếp hạng:', e);
        return [];
    }
}

module.exports = { addMessageCount, addVoiceMinutes, getTopChat: getTopData };