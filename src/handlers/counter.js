const fs = require('fs');
const DATA_FILE = './database.json';

// Hàm đọc dữ liệu nội bộ
function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

// Hàm ghi dữ liệu nội bộ
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
}

// 1. Hàm tăng số tin nhắn của một User
function addMessageCount(userId, username) {
    const data = loadData();

    if (!data[userId]) {
        data[userId] = { username: username, count: 0 };
    }

    data[userId].count += 1;
    data[userId].username = username; // Cập nhật lại tên nếu họ đổi tên
    saveData(data);
}

// 2. Hàm lấy danh sách Top Chat
function getTopChat(limit = 10) {
    const data = loadData();
    
    const userList = Object.keys(data).map(id => ({
        id: id,
        username: data[id].username,
        count: data[id].count
    }));

    // Sắp xếp giảm dần và cắt lấy số lượng yêu cầu
    return userList.sort((a, b) => b.count - a.count).slice(0, limit);
}

// Xuất các hàm này ra để file khác có thể require() sử dụng
module.exports = {
    addMessageCount,
    getTopChat
};