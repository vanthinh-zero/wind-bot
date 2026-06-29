require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');

// --- IMPORT TẤT CẢ CÁC HANDLERS HỆ THỐNG ---
const { handleAutoMod, handleAdminCommands } = require('./src/handlers/automod.js');
const { handleNoiTuGame } = require('./src/handlers/noitu.js');
const { handleTicketInteraction } = require('./src/handlers/ticket.js');
const { sendTuTienMainMenu, handleTuTienInteraction } = require('./src/handlers/tutien.js');
const { handleVoiceStateUpdate } = require('./src/handlers/voice.js');
const { handleVoiceMenuInteraction, handleVoiceModalSubmit } = require('./src/handlers/voiceMenu.js');
const { handleWelcomeMember } = require('./src/handlers/welcome.js');
const { handleTaiXiuGame } = require('./src/handlers/taixiu.js');
const { handlePetSystem } = require('./src/handlers/pet.js'); 
const { startAutoPoem, handlePoemCommand } = require('./src/handlers/poem.js'); 
const { handleAvatarCheck } = require('./src/handlers/avatar.js'); 
const { handleChuaLanhCommand } = require('./src/handlers/chualanh.js'); 
const { handleLamViecGame } = require('./src/handlers/lamviec.js');
const { handleTarotCommand, handleTarotInteraction } = require('./src/handlers/tarotModule.js');
const { handleServerBoost, handleBoostTicketInteraction } = require('./src/handlers/boostHandler.js');

// 💬 IMPORT TÍNH NĂNG CHAT (Bao gồm hàm Auto Spam rộn ràng)
const { handleChatInteraction, initAutoSpam } = require('./src/handlers/chat.js');

// --- IMPORT MODULE ĐỀ THI ---
const { handleDeThiCommand, handleDeThiInteraction } = require('./src/handlers/dethi.js');

// --- IMPORT MODULE ANTI-RAID & FAKE-RAID BẢO AN ---
const { handleAntiSpam, handleFakeRaidCommand } = require('./src/handlers/antiRaid.js');

// --- IMPORT MODULE MARKETING (DISBOARD BUMP) ---
const { start25hReminder, handlePostToFacebook } = require('./src/handlers/marketing.js');

// 📚 IMPORT MODULE TỪ VỰNG TIẾNG ANH ĐỊNH KỲ & LỆNH CHAT
const vocabularySystem = require('./src/handlers/vocabulary.js');

// --- KHỞI TẠO WEB SERVER ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 Quản gia Wind đang sống nhăn răng trên Render sếp ơi! 🚀');
});

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🌐 [Render Hub]: Web Server đang mở tại cổng: ${PORT}`);
    console.log(`==================================================`);
});

// --- KHỞI TẠO DISCORD CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildVoiceStates 
    ]
});

// --- SỰ KIỆN KHỞI CHẠY BOT ---
client.once(Events.ClientReady, (readyClient) => {
    console.log('==================================================');
    console.log(`🤖 Bot đã trực tuyến thành công dưới tên: ${readyClient.user.tag}`);
    console.log('==================================================');
    
    startAutoPoem(readyClient);
    start25hReminder(client);

    // 📚 Kích hoạt gửi từ vựng tự động định kỳ (Mỗi 3 tiếng)
    try {
        if (typeof vocabularySystem === 'function') {
            vocabularySystem(readyClient);
            console.log('📚 [System Check]: Module Từ vựng tiếng Anh tự động đã khởi chạy!');
        }
    } catch (e) {
        console.error('❌ Lỗi khởi chạy Module Từ vựng:', e);
    }

    try {
        initAutoSpam(readyClient);
    } catch (e) {
        console.error('Lỗi khi khởi chạy Auto Spam:', e);
    }
});

// --- SỰ KIỆN THÀNH VIÊN & VOICE ---
client.on('guildMemberAdd', async (member) => { 
    try { await handleWelcomeMember(member); } catch (e) { console.error('Lỗi Welcome:', e); }
});
client.on('guildMemberUpdate', async (oldMember, newMember) => { 
    try { await handleServerBoost(oldMember, newMember); } catch (e) { console.error('Lỗi Boost:', e); }
});
client.on('voiceStateUpdate', async (oldState, newState) => { 
    try { await handleVoiceStateUpdate(oldState, newState); } catch (e) { console.error('Lỗi Voice:', e); }
});

// --- SỰ KIỆN MESSAGE CREATE ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    try {
        if (await handleFakeRaidCommand(message)) return;

        const isSpamRaid = await handleAntiSpam(message);
        if (isSpamRaid) return;

        if (await handleAutoMod(message)) return;
        if (await handleAdminCommands(message)) return;

        if (message.content.startsWith('!dethi')) { 
            await handleDeThiCommand(message); 
            return; 
        }

        if (await handlePostToFacebook(message)) return;
        if (await handleChuaLanhCommand(message)) return;

        // 📚 LỆNH GỌI TỪ VỰNG TỨC THÌ (!vocab)
        if (message.content === '!vocab') {
            // Kiểm tra xem handler có hàm support gửi thủ công theo message không
            if (vocabularySystem && typeof vocabularySystem.sendVocabToMessageChannel === 'function') {
                await vocabularySystem.sendVocabToMessageChannel(message);
            } else {
                // Nếu sếp chưa sửa file vocabulary.js, bot tạm thời thông báo
                await message.reply('📚 Tính năng đang load dữ liệu, vui lòng đợi trong giây lát hoặc cập nhật file handler!');
            }
            return;
        }

        if (message.content === '!tutien') { await sendTuTienMainMenu(message); return; }
        if (message.content === '!tarot') { await handleTarotCommand(message); return; }
        
        if (message.content === '!stop-bot' && message.author.id === process.env.ADMIN_ID) {
            await message.channel.send('🤖 Hệ thống đang ngắt kết nối an toàn theo lệnh Admin...');
            client.destroy();
            process.exit(0);
        }

        if (await handlePoemCommand(message)) return;
        if (await handleAvatarCheck(message)) return;
        if (await handleLamViecGame(message)) return; 
        
        if (await handleChatInteraction(message)) return; 

        await handleNoiTuGame(message);
        await handleTaiXiuGame(message);
        await handlePetSystem(message);

    } catch (error) { 
        console.error('❌ Lỗi phát sinh tại luồng messageCreate:', error); 
    }
});

// --- SỰ KIỆN INTERACTION CREATE ---
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.customId?.startsWith('submit_full_') || interaction.customId?.startsWith('modal_full_')) {
            await handleDeThiInteraction(interaction);
            return;
        }

        if (interaction.isButton()) {
            const customId = interaction.customId;
            if (customId.startsWith('tarot_')) { await handleTarotInteraction(interaction); return; }
            if (customId.startsWith('tt_')) { await handleTuTienInteraction(interaction); return; }
            if (customId.startsWith('vm_')) { await handleVoiceMenuInteraction(interaction); return; }
            if (customId.includes('ticket') && !customId.includes('boost')) { await handleTicketInteraction(interaction); return; }
            if (customId === 'boost_ticket_create') { await handleBoostTicketInteraction(interaction); return; }
        }

        if (interaction.isModalSubmit()) {
            const customId = interaction.customId;
            if (customId.startsWith('vmm_')) { await handleVoiceModalSubmit(interaction); return; }
        }
    } catch (error) {
        console.error('❌ Lỗi xử lý tương tác phát sinh tại index.js:', error);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Phát hiện Unhandled Rejection tại:', promise, '-> Lý do:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Phát hiện Uncaught Exception nghiêm trọng:', err);
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);