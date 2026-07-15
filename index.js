require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');

// --- IMPORT TẤT CẢ CÁC HANDLERS HỆ THỐNG SẴN CÓ ---
const { handleWindCommand } = require('./src/handlers/wind.js'); 
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

// 🚀 HỆ THỐNG BOOSTER
const { 
    handleServerBoost, 
    handleBoostTicketInteraction, 
    checkAndCleanVipRoom, 
    handleMenuVipCommand, 
    handleSpawnVipRoomCommand 
} = require('./src/handlers/boostHandler.js');

// 📊 HỆ THỐNG ĐẾM TIN NHẮN & DASHBOARD ĐỒ HỌA MỚI
const { addMessageCount } = require('./src/handlers/counter.js');
const { handleTopChatImageCommand } = require('./src/handlers/topchatImage.js');

// 🏷️ MODULE AUTOROLE
const { 
    handleAutoRoleCommand, 
    handleAutoRoleInteraction,
    handleAutoRoleReactionAdd, 
    handleAutoRoleReactionRemove 
} = require('./src/handlers/autorole.js');

// 💬 TÍNH NĂNG CHAT TỰ ĐỘNG
const { handleChatInteraction, initAutoSpam } = require('./src/handlers/chat.js');

// --- MODULE ĐỀ THI ---
const { handleDeThiCommand, handleDeThiInteraction } = require('./src/handlers/dethi.js');

// --- MODULE ANTI-RAID & FAKE-RAID BẢO AN ---
const { handleAntiSpam, handleFakeRaidCommand } = require('./src/handlers/antiRaid.js');

// --- MODULE MARKETING (DISBOARD BUMP) ---
const start25hReminder = require('./src/handlers/marketing.js').start25hReminder || require('./src/handlers/marketing.js');
const handlePostToFacebook = require('./src/handlers/marketing.js').handlePostToFacebook;

// 📚 MODULE TỪ VỰNG TIẾNG ANH ĐỊNH KỲ
const vocabularySystem = require('./src/handlers/vocabulary.js');

// --- KHỞI TẠO WEB SERVER ĐỂ TREO BOT ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 Quản gia Wind đang hoạt động bình thường sếp ơi! 🚀');
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
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// --- SỰ KIỆN KHỞI CHẠY BOT ---
client.once(Events.ClientReady, (readyClient) => {
    console.log('==================================================');
    console.log(`🤖 Bot đã trực tuyến thành công dưới tên: ${readyClient.user.tag}`);
    console.log('==================================================');
    
    if (typeof startAutoPoem === 'function') startAutoPoem(readyClient);
    if (typeof start25hReminder === 'function') start25hReminder(client);

    try {
        if (typeof vocabularySystem === 'function') {
            vocabularySystem(readyClient);
        }
    } catch (e) {
        console.error('❌ Lỗi khởi chạy Module Từ vựng:', e);
    }

    try {
        if (typeof initAutoSpam === 'function') initAutoSpam(readyClient);
    } catch (e) {
        console.error('Lỗi khi khởi chạy Auto Spam:', e);
    }
});

// --- SỰ KIỆN THÀNH VIÊN VÀ VOICE STATE ---
client.on('guildMemberAdd', async (member) => { 
    try { await handleWelcomeMember(member); } catch (e) { console.error('Lỗi Welcome:', e); }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => { 
    try { await handleServerBoost(oldMember, newMember); } catch (e) { console.error('Lỗi Boost:', e); }
});

client.on('voiceStateUpdate', async (oldState, newState) => { 
    try { 
        await handleVoiceStateUpdate(oldState, newState); 
        await checkAndCleanVipRoom(oldState, newState);   
    } catch (e) { 
        console.error('Lỗi Voice:', e); 
    }
});

// --- SỰ KIỆN NHẬN TIN NHẮN (MESSAGE CREATE) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    addMessageCount(message.author.id, message.author.username);

    try {
        const msgContent = message.content.trim().toLowerCase();

        if (msgContent === '!spawnviproom') {
            await handleSpawnVipRoomCommand(message);
            return; 
        }

        if (msgContent === '!menuvip') {
            await handleMenuVipCommand(message);
            return;
        }

        if (await handleFakeRaidCommand(message)) return;
        const isSpamRaid = await handleAntiSpam(message);
        if (isSpamRaid) return;

        if (await handleAutoMod(message)) return;
        if (await handleAdminCommands(message)) return;
        if (await handleAutoRoleCommand(message)) return;

        if (message.content.startsWith('!dethi')) { 
            await handleDeThiCommand(message); 
            return; 
        }

        if (handlePostToFacebook && await handlePostToFacebook(message)) return;
        if (await handleChuaLanhCommand(message)) return;

        if (msgContent === '!wind') {
            await handleWindCommand(message);
            return;
        }

        if (msgContent === '!topchat') {
            await handleTopChatImageCommand(message);
            return;
        }

        if (message.content === '!vocab') {
            if (vocabularySystem && typeof vocabularySystem.sendVocabToMessageChannel === 'function') {
                await vocabularySystem.sendVocabToMessageChannel(message);
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

// --- SỰ KIỆN XỬ LÝ TƯƠNG TÁC (LOCK CHỐNG XUNG ĐỘT) ---
client.on('interactionCreate', async (interaction) => {
    const customId = interaction.customId || '';

    try {
        // 🚀 ĐIỀU HƯỚNG ƯU TIÊN SỐ 1: Phân phối thẳng các tương tác liên quan đến Voice Menu thường
        if (interaction.isButton() && customId.startsWith('vm_')) {
            await handleVoiceMenuInteraction(interaction);
            return;
        }
        if (interaction.isModalSubmit() && customId.startsWith('vmm_')) {
            await handleVoiceModalSubmit(interaction);
            return;
        }

        // 🛡️ BẢO VỆ 2: Cụm tính năng VIP Booster
        const isBoostInteraction = 
            customId === 'boost_ticket_create' || 
            customId === 'boost_voice_modal_trigger' || 
            customId === 'boost_voice_modal_submit' || 
            customId.startsWith('vip_');

        if (isBoostInteraction) {
            await handleBoostTicketInteraction(interaction);
            return; 
        }

        // 🛡️ BẢO VỆ 3: Hệ thống tự phát Role cá nhân công khai
        if (customId === 'start_private_autorole') {
            await handleAutoRoleInteraction(interaction);
            return;
        }

        // 🛡️ BẢO VỆ 4: Hệ thống nộp đề thi học tập
        if (customId.startsWith('submit_full_') || customId.startsWith('modal_full_')) {
            await handleDeThiInteraction(interaction);
            return;
        }

        // 5. Phân phối các nút bấm thông thường còn lại
        if (interaction.isButton()) {
            if (customId.startsWith('tarot_')) { await handleTarotInteraction(interaction); return; }
            if (customId.startsWith('tt_')) { await handleTuTienInteraction(interaction); return; }
            if (customId.includes('ticket')) { await handleTicketInteraction(interaction); return; }
        }
    } catch (error) {
        console.error('❌ Lỗi xử lý tương tác phát sinh tại index.js:', error);
    }
});

// --- SỰ KIỆN THÀNH VIÊN THẢ VÀ GỠ REACTION ---
client.on('messageReactionAdd', async (reaction, user) => {
    try { await handleAutoRoleReactionAdd(reaction, user); } catch (e) { console.error('❌ Lỗi thả reaction:', e); }
});

client.on('messageReactionRemove', async (reaction, user) => {
    try { await handleAutoRoleReactionRemove(reaction, user); } catch (e) { console.error('❌ Lỗi bỏ reaction:', e); }
});

// --- BIỆN PHÁP CHỐNG SẬP BOT TOÀN CỤC ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Phát hiện lỗi Unhandled Rejection tại:', promise, '-> Lý do:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Phát hiện lỗi Uncaught Exception nghiêm trọng:', err);
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);