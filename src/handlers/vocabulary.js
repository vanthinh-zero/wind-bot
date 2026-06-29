// src/handlers/vocabulary.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CHANNEL_ID = process.env.VOCAB_CHANNEL_ID; 
const INTERVAL_TIME = 3 * 60 * 60 * 1000; // Định kỳ lặp lại đúng 3 tiếng

// --- ĐÃ SỬA: Đường dẫn trỏ thẳng tới file vocab.json nằm tại thư mục src/config/ ---
const dbPath = path.join(__dirname, '../config/vocab.json');

// Hàm đọc dữ liệu từ file JSON
function loadVocabulary() {
    try {
        if (!fs.existsSync(dbPath)) {
            console.error(`❌ Không tìm thấy file dữ liệu tại: ${dbPath}.`);
            return [];
        }
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("❌ Lỗi khi đọc file từ vựng JSON:", error);
        return [];
    }
}

let usedWordIndexes = []; 

// Hàm chọn ngẫu nhiên từ vựng thông minh tuân theo luật không trùng
function getNextWords(vocabularyIndex) {
    let selectedWords = [];
    if (vocabularyIndex.length === 0) return [];

    // Chọn số lượng từ ngẫu nhiên từ 3 đến 5 từ mỗi lần gửi
    const finalCount = Math.floor(Math.random() * (5 - 3 + 1)) + 3; 

    for (let i = 0; i < finalCount; i++) {
        // Nếu đã dùng hết sạch từ vựng -> Tự động reset bộ nhớ để lặp lại vòng mới
        if (usedWordIndexes.length === vocabularyIndex.length) {
            console.log("--- Đã dùng hết kho từ vựng! Tiến hành lặp lại vòng mới. ---");
            usedWordIndexes = [];
        }

        let availableIndexes = vocabularyIndex
            .map((_, index) => index)
            .filter(index => !usedWordIndexes.includes(index) && !selectedWords.some(w => vocabularyIndex[index].word === w.word));

        if (availableIndexes.length === 0) {
            usedWordIndexes = [];
            availableIndexes = vocabularyIndex.map((_, index) => index).filter(index => !selectedWords.some(w => vocabularyIndex[index].word === w.word));
        }

        const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
        selectedWords.push(vocabularyIndex[randomIndex]);
        usedWordIndexes.push(randomIndex); // Đánh dấu index này đã dùng
    }
    return selectedWords;
}

// 1. Hàm tự động gửi định kỳ vào kênh cấu hình ở .env
async function sendVocabMessage(client) {
    try {
        if (!CHANNEL_ID) return console.error("⚠️ Chưa cấu hình VOCAB_CHANNEL_ID trong file .env!");

        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) return console.error("⚠️ Không tìm thấy channel Discord ứng với ID từ vựng này!");

        const vocabularyIndex = loadVocabulary();
        if (vocabularyIndex.length === 0) return console.log("Kho từ vựng trống, không có gì để gửi.");

        const wordsToSend = getNextWords(vocabularyIndex); 

        let messageContent = `📚 **[BÀI HỌC ĐỊNH KỲ] - ĐẠO HỮU NẠP KIẾN THỨC** \n\n`;
        wordsToSend.forEach((item, index) => {
            messageContent += `${index + 1}. **${item.word}** (${item.pos}): *${item.meaning}*\n`;
            messageContent += `   👉 *Cấu trúc:* \`${item.structure}\`\n\n`;
        });
        messageContent += `Chúc các đạo hữu tu luyện tinh tấn, sớm ngày phi thăng! 🚀`;

        await channel.send(messageContent);
        console.log(`[${new Date().toLocaleTimeString()}] Đã gửi tự động thành công ${wordsToSend.length} từ vựng vào channel.`);
    } catch (error) {
        console.error("❌ Lỗi khi gửi tin nhắn từ vựng định kỳ:", error);
    }
}

// 2. Hàm xử lý lệnh chat tức thì (!vocab) gửi thẳng vào kênh người dùng gọi lệnh
async function sendVocabToMessageChannel(message) {
    try {
        const vocabularyIndex = loadVocabulary();
        if (vocabularyIndex.length === 0) {
            return message.reply("📚 Kho từ vựng hiện tại đang trống sếp ơi!");
        }

        const wordsToSend = getNextWords(vocabularyIndex); 

        let messageContent = `📚 **[BÀI HỌC TỨC THÌ] - ĐẠO HỮU TRIỆU HỒI KIẾN THỨC** \n\n`;
        wordsToSend.forEach((item, index) => {
            messageContent += `${index + 1}. **${item.word}** (${item.pos}): *${item.meaning}*\n`;
            messageContent += `   👉 *Cấu trúc:* \`${item.structure}\`\n\n`;
        });
        messageContent += `Chúc đạo hữu tu luyện tinh tấn! ✨`;

        await message.channel.send(messageContent);
    } catch (error) {
        console.error("❌ Lỗi khi chạy lệnh ném từ vựng thủ công:", error);
    }
}

// 3. Xuất các hàm ra ngoài cho file index.js sử dụng
const mainExport = (client) => {
    // Gửi ngay 1 lần khi bot vừa online để check luồng hoạt động
    sendVocabMessage(client);

    // Kích hoạt loop tự động gửi sau mỗi 3 tiếng
    setInterval(() => {
        sendVocabMessage(client);
    }, INTERVAL_TIME);
};

// Đính kèm hàm gọi lệnh tức thì vào object export
mainExport.sendVocabToMessageChannel = sendVocabToMessageChannel;

module.exports = mainExport;