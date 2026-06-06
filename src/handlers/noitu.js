const { EmbedBuilder } = require('discord.js');
const wordExists = require('word-exists'); // Thêm thư viện kiểm tra từ điển
const activeGames = new Map();
const NOITU_CHANNEL_ID = process.env.NOITU_CHANNEL_ID?.trim() || '';

async function handleNoiTuGame(message) {
    if (message.author.bot || !message.guild) return;

    const isGameCommand = message.content === '!play' || message.content === '!stop-game';
    const isChannelPlaying = activeGames.has(message.channel.id);

    if ((isGameCommand || isChannelPlaying) && message.channel.id !== NOITU_CHANNEL_ID) {
        if (isGameCommand) {
            const reply = await message.reply(`❌ Trò chơi này chỉ chạy tại kênh <#${NOITU_CHANNEL_ID}>!`);
            setTimeout(() => {
                if (message.deletable) message.delete().catch(() => {});
                reply.delete().catch(() => {});
            }, 4000);
        }
        return;
    }

    if (message.content === '!play') {
        if (activeGames.has(message.channel.id)) return message.reply('🎮 Trận đấu nối từ đang diễn ra rồi!');
        
        // Gốc từ ban đầu chuẩn nghĩa
        const pool = ["apple", "banana", "computer", "database", "elephant", "galaxy", "heart", "nature"];
        const startWord = pool[Math.floor(Math.random() * pool.length)];
        
        const timeoutId = setTimeout(async () => {
            if (activeGames.has(message.channel.id)) {
                activeGames.delete(message.channel.id);
                await message.channel.send('⏰ **Trò chơi kết thúc tự động** do không có ai tiếp tục!');
            }
        }, 5 * 60 * 1000);

        activeGames.set(message.channel.id, {
            lastWord: startWord, 
            lastPlayerId: null, 
            lastPlayerUsername: 'Hệ thống', 
            usedWords: new Set([startWord]), 
            timeoutId
        });

        const gameEmbed = new EmbedBuilder()
            .setTitle('🎮 MINIGAME NỐI TỪ TIẾNG ANH 🎮')
            .setDescription(`Bắt đầu với từ: **${startWord.toUpperCase()}**\n👉 Nhập từ tiếp theo bắt đầu bằng: **"${startWord.slice(-1).toUpperCase()}"**.`)
            .setColor(0x00FF00);

        await message.channel.send({ embeds: [gameEmbed] });
        return;
    }

    if (message.content === '!stop-game') {
        const gameState = activeGames.get(message.channel.id);
        if (!gameState) return;
        clearTimeout(gameState.timeoutId);
        activeGames.delete(message.channel.id);
        await message.channel.send('🛑 **Minigame Nối Từ đã bị buộc dừng!**');
        return;
    }

    // LOGIC CHAT TỰ ĐỘNG
    const gameState = activeGames.get(message.channel.id);
    if (gameState && !message.content.startsWith('!')) {
        const cleanContent = message.content.trim().toLowerCase();

        // Chỉ nhận ký tự chữ cái, không nhận câu có khoảng trắng hoặc ký tự đặc biệt
        if (!/^[a-z]+$/.test(cleanContent)) return; 

        let loseReason = '';

        // 1. Kiểm tra nếu tự nối từ của chính mình
        if (message.author.id === gameState.lastPlayerId) {
            loseReason = `Bạn không được tự nối từ của chính mình!`;
        }
        // 2. Kiểm tra từ đã từng được sử dụng chưa
        else if (gameState.usedWords.has(cleanContent)) {
            loseReason = `Từ **"${cleanContent.toUpperCase()}"** đã được sử dụng trước đó rồi!`;
        }
        // 3. Kiểm tra chữ cái đầu và cuối
        else if (cleanContent.charAt(0) !== gameState.lastWord.slice(-1)) {
            loseReason = `Từ **"${cleanContent.toUpperCase()}"** bắt đầu bằng chữ **"${cleanContent.charAt(0).toUpperCase()}"**, trong khi từ trước kết thúc bằng chữ **"${gameState.lastWord.slice(-1).toUpperCase()}"**!`;
        }
        // 4. 🔥 QUAN TRỌNG: Kiểm tra từ này có nghĩa trong từ điển Anh-Anh không
        else if (!wordExists(cleanContent)) {
            loseReason = `Từ **"${cleanContent.toUpperCase()}"** không tồn tại trong từ điển tiếng Anh hợp lệ!`;
        }

        // XỬ LÝ THUA CUỘC
        if (loseReason) {
            clearTimeout(gameState.timeoutId);
            activeGames.delete(message.channel.id);

            const loseEmbed = new EmbedBuilder()
                .setTitle('💥 TRÒ CHƠI KẾT THÚC 💥')
                .setDescription(`❌ <@${message.author.id}> đã thua cuộc!\n**Lý do:** ${loseReason}\n\n🏆 Người chiến thắng hiệp này: **${gameState.lastPlayerUsername}**`)
                .setColor(0xFF0000)
                .setTimestamp();

            await message.reply({ embeds: [loseEmbed] });
            return;
        }

        // TIẾP TỤC GAME
        clearTimeout(gameState.timeoutId);
        const newTimeoutId = setTimeout(async () => {
            if (activeGames.has(message.channel.id)) {
                activeGames.delete(message.channel.id);
                await message.channel.send('⏰ Tự động kết thúc game do quá thời gian phản hồi!');
            }
        }, 5 * 60 * 1000);

        gameState.lastWord = cleanContent;
        gameState.lastPlayerId = message.author.id;
        gameState.lastPlayerUsername = message.author.username; 
        gameState.usedWords.add(cleanContent);
        gameState.timeoutId = newTimeoutId;

        await message.react('✅').catch(() => {});
        await message.channel.send(`👉 Từ tiếp theo cần bắt đầu bằng chữ: **${cleanContent.slice(-1).toUpperCase()}** (Lượt vừa rồi: *${message.author.username}*)`);
    }
}

module.exports = { handleNoiTuGame };