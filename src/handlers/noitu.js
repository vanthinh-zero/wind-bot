const { EmbedBuilder } = require('discord.js');

// Quản lý các phòng chơi đang diễn ra
const activeGames = new Map();

// Hàm kiểm tra từ điển Tiếng Anh qua API trực tuyến chuẩn
async function isValidEnglishWord(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        return response.ok;
    } catch (error) {
        // Trường hợp mất mạng hoặc lỗi kết nối API thì cho qua để không ngắt trải nghiệm game
        return true; 
    }
}

async function handleNoiTuGame(message) {
    try {
        if (message.author.bot || !message.guild) return false;

        const rawContent = message.content.trim();
        const content = rawContent.toLowerCase();
        const isGameCommand = content === '!play' || content === '!stop-game' || content === '!noitu';
        const gameState = activeGames.get(message.channel.id);

        // Nếu kênh chưa bật game VÀ tin nhắn không phải lệnh bật game -> Cho qua
        if (!gameState && !isGameCommand) return false;

        // 1. LỆNH BẮT ĐẦU GAME (!play hoặc !noitu)
        if (content === '!play' || content === '!noitu') {
            if (gameState) {
                await message.reply('🎮 Trận đấu nối từ đang diễn ra tại kênh này rồi!');
                return true;
            }
            
            const pool = ["apple", "banana", "computer", "database", "elephant", "galaxy", "heart", "nature"];
            const startWord = pool[Math.floor(Math.random() * pool.length)];

            activeGames.set(message.channel.id, {
                lastWord: startWord, 
                lastPlayerId: null, 
                lastPlayerUsername: 'Hệ thống', 
                usedWords: new Set([startWord])
            });

            const gameEmbed = new EmbedBuilder()
                .setTitle('🎮 MINIGAME NỐI TỪ TIẾNG ANH 🎮')
                .setDescription(`Bắt đầu với từ: **${startWord.toUpperCase()}**\n👉 Nhập từ tiếp theo bắt đầu bằng: **"${startWord.slice(-1).toUpperCase()}"**.\n⏱️ *Thời gian: Vô hạn (Chơi cho đến khi có người sai)!*`)
                .setColor(0x00FF00);

            await message.channel.send({ embeds: [gameEmbed] });
            return true;
        }

        // 2. LỆNH DỪNG GAME (!stop-game)
        if (content === '!stop-game') {
            if (!gameState) return false;
            
            activeGames.delete(message.channel.id);
            await message.channel.send('🛑 **Minigame Nối Từ đã bị buộc dừng!**');
            return true;
        }

        // 3. LOGIC CHAT TỰ ĐỘNG (XỬ LÝ LƯỢT NỐI TỪ)
        if (gameState && !content.startsWith('!')) {
            const cleanContent = content;

            // Chỉ nhận 1 từ tiếng Anh gồm các chữ cái a-z
            if (!/^[a-z]+$/.test(cleanContent)) return false; 

            let loseReason = '';

            // Kiểm tra 1: Tự nối từ của chính mình
            if (message.author.id === gameState.lastPlayerId) {
                loseReason = `Bạn không được tự nối từ của chính mình!`;
            }
            // Kiểm tra 2: Từ đã từng được sử dụng
            else if (gameState.usedWords.has(cleanContent)) {
                loseReason = `Từ **"${cleanContent.toUpperCase()}"** đã được sử dụng trước đó rồi!`;
            }
            // Kiểm tra 3: Chữ cái đầu không khớp với chữ cái cuối của từ trước
            else if (cleanContent.charAt(0) !== gameState.lastWord.slice(-1)) {
                loseReason = `Từ **"${cleanContent.toUpperCase()}"** bắt đầu bằng chữ **"${cleanContent.charAt(0).toUpperCase()}"**, trong khi từ trước kết thúc bằng chữ **"${gameState.lastWord.slice(-1).toUpperCase()}"**!`;
            }
            // Kiểm tra 4: Kiểm tra từ điển Anh - Anh chuẩn
            else {
                const validWord = await isValidEnglishWord(cleanContent);
                if (!validWord) {
                    loseReason = `Từ **"${cleanContent.toUpperCase()}"** không có trong từ điển tiếng Anh!`;
                }
            }

            // XỬ LÝ KHI NGƯỜI CHƠI THUA
            if (loseReason) {
                activeGames.delete(message.channel.id);

                const loseEmbed = new EmbedBuilder()
                    .setTitle('💥 TRÒ CHƠI KẾT THÚC 💥')
                    .setDescription(`❌ <@${message.author.id}> đã thua cuộc!\n**Lý do:** ${loseReason}\n\n🏆 Người chiến thắng hiệp này: **${gameState.lastPlayerUsername}**`)
                    .setColor(0xFF0000)
                    .setTimestamp();

                await message.reply({ embeds: [loseEmbed] });
                return true;
            }

            // NỐI TỪ THÀNH CÔNG -> CẬP NHẬT TRẠNG THÁI
            gameState.lastWord = cleanContent;
            gameState.lastPlayerId = message.author.id;
            gameState.lastPlayerUsername = message.author.username; 
            gameState.usedWords.add(cleanContent);

            await message.react('✅').catch(() => {});
            await message.channel.send(`👉 Từ tiếp theo cần bắt đầu bằng chữ: **${cleanContent.slice(-1).toUpperCase()}** (Lượt vừa rồi: *${message.author.username}*)`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Lỗi xử lý game Nối Từ:', error);
        return false;
    }
}

module.exports = { handleNoiTuGame };