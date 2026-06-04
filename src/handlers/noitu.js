const { EmbedBuilder } = require('discord.js');
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
        const pool = ["apple", "banana", "computer", "database", "elephant", "galaxy"];
        const startWord = pool[Math.floor(Math.random() * pool.length)];
        
        const timeoutId = setTimeout(async () => {
            if (activeGames.has(message.channel.id)) {
                activeGames.delete(message.channel.id);
                await message.channel.send('⏰ **Trò chơi kết thúc tự động** do không có ai tiếp tục!');
            }
        }, 5 * 60 * 1000);

        activeGames.set(message.channel.id, {
            lastWord: startWord, lastPlayerId: null, usedWords: new Set([startWord]), timeoutId
        });

        const gameEmbed = new EmbedBuilder()
            .setTitle('🎮 MINIGAME NỐI TỪ TIẾNG ANH 🎮')
            .setDescription(`Bắt đầu với từ: **${startWord.toUpperCase()}**\n👉 Nhập chữ bắt đầu bằng: **"${startWord.slice(-1).toUpperCase()}"**.`)
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

    // Logic xử lý chat tự động
    const gameState = activeGames.get(message.channel.id);
    if (gameState && !message.content.startsWith('!')) {
        const cleanContent = message.content.trim().toLowerCase();
        if (!/^[a-z]+$/.test(cleanContent) || message.author.id === gameState.lastPlayerId || gameState.usedWords.has(cleanContent)) return;

        if (cleanContent.charAt(0) !== gameState.lastWord.slice(-1)) return;

        clearTimeout(gameState.timeoutId);
        const newTimeoutId = setTimeout(async () => {
            if (activeGames.has(message.channel.id)) {
                activeGames.delete(message.channel.id);
                await message.channel.send('⏰ Tự động kết thúc game do quá thời gian phản hồi!');
            }
        }, 5 * 60 * 1000);

        gameState.lastWord = cleanContent;
        gameState.lastPlayerId = message.author.id;
        gameState.usedWords.add(cleanContent);
        gameState.timeoutId = newTimeoutId;

        await message.react('✅').catch(() => {});
        await message.channel.send(`👉 Từ tiếp theo cần bắt đầu bằng chữ: **${cleanContent.slice(-1).toUpperCase()}**`);
    }
}

module.exports = { handleNoiTuGame };