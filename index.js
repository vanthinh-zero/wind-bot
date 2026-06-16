require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, MessageFlags } = require('discord.js');

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
const { handleChatInteraction } = require('./src/handlers/chat.js');

// Hệ thống bói bài Tarot & Server Boost
const { handleTarotCommand, handleTarotInteraction } = require('./src/handlers/tarotModule.js');
const { handleServerBoost, handleBoostTicketInteraction } = require('./src/handlers/boostHandler.js');

// --- KHỞI TẠO WEB SERVER (Giữ bot luôn online 24/7) ---
const app = parentExpress = express();
app.get('/', (req, res) => res.send('🤖 Wind Bot đang vận hành mượt mà!'));
app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log('🌐 Web Server đang lắng nghe tại port: 3000');
});

// --- KHỞI TẠO DISCORD CLIENT VỚI ĐẦY ĐỦ INTENTS ---
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
});

// --- SỰ KIỆN THÀNH VIÊN VÀ TRẠNG THÁI VOICE ---
client.on('guildMemberAdd', async (member) => { 
    try { await handleWelcomeMember(member); } catch (e) { console.error('Lỗi Welcome:', e); }
});
client.on('guildMemberUpdate', async (oldMember, newMember) => { 
    try { await handleServerBoost(oldMember, newMember); } catch (e) { console.error('Lỗi Boost:', e); }
});
client.on('voiceStateUpdate', async (oldState, newState) => { 
    try { await handleVoiceStateUpdate(oldState, newState); } catch (e) { console.error('Lỗi Voice:', e); }
});

// --- SỰ KIỆN XỬ LÝ LỆNH CHAT (MESSAGE CREATE) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    try {
        if (await handleAutoMod(message)) return;
        if (await handleAdminCommands(message)) return;

        if (message.content === '!tutien') { await sendTuTienMainMenu(message); return; }
        if (message.content === '!tarot') { await handleTarotCommand(message); return; }
        
        if (message.content === '!stop-bot' && message.author.id === process.env.ADMIN_ID) {
            await message.channel.send('🤖 Hệ thống đang ngắt kết nối an toàn theo lệnh Admin...');
            client.destroy();
            process.exit(0);
        }

        if (await handlePoemCommand(message)) return;
        if (await handleChuaLanhCommand(message)) return;
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

// --- SỰ KIỆN ĐIỀU PHỐI TƯƠNG TÁC (INTERACTION CREATE) ---
client.on('interactionCreate', async (interaction) => {
    try {
        // --- A. XỬ LÝ NÚT BẤM (BUTTONS) ---
        if (interaction.isButton()) {
            const customId = interaction.customId;
            
            // Tách biệt luồng Tarot độc lập hoàn toàn bằng lệnh return
            if (customId.startsWith('tarot_')) { 
                await handleTarotInteraction(interaction); 
                return; 
            }
            
            if (customId.startsWith('tt_')) { await handleTuTienInteraction(interaction); return; }
            if (customId.startsWith('vm_')) { await handleVoiceMenuInteraction(interaction); return; }
            if (customId.includes('ticket') && !customId.includes('boost')) { await handleTicketInteraction(interaction); return; }
            if (customId === 'boost_ticket_create') { await handleBoostTicketInteraction(interaction); return; }
        }
        
        // --- B. XỬ LÝ BIỂU MẪU NHẬP LIỆU (MODAL SUBMITS) ---
        if (interaction.isModalSubmit()) {
            const customId = interaction.customId;
            if (customId.startsWith('vmm_')) { await handleVoiceModalSubmit(interaction); return; }
        }
        
    } catch (error) {
        console.error('❌ Lỗi xử lý tương tác phát sinh tại index.js:', error);
    }
});

// --- CƠ CHẾ BẢO VỆ CHỐNG TỰ ĐỘNG SẬP NGUỒN BOT ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Phát hiện Unhandled Rejection tại:', promise, '-> Lý do:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Phát hiện Uncaught Exception nghiêm trọng:', err);
});

client.login(process.env.TOKEN);