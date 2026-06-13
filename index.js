require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');

// =========================================================
// IMPORT CÁC MODULES HÀM XỬ LÝ (Đã tối ưu luồng nạp)
// =========================================================
const { handleAutoMod, handleAdminCommands } = require('./src/handlers/automod.js');
const { handleNoiTuGame } = require('./src/handlers/noitu.js');
const { handleTicketInteraction } = require('./src/handlers/ticket.js');
const { sendTuTienMainMenu, handleTuTienInteraction } = require('./src/handlers/tutien.js');
const { handleVoiceStateUpdate } = require('./src/handlers/voice.js');
const { handleVoiceMenuInteraction, handleVoiceModalSubmit } = require('./src/handlers/voiceMenu.js');

// CÁC HANDLER KINH TẾ - GIẢI TRÍ - ĐỜI SỐNG - CHỮA LÀNH
const { handleWelcomeMember } = require('./src/handlers/welcome.js');
const { handleTaiXiuGame } = require('./src/handlers/taixiu.js');
const { handlePetSystem } = require('./src/handlers/pet.js'); 
const { startAutoPoem, handlePoemCommand } = require('./src/handlers/poem.js'); // 📖 Hệ thống Thơ ca & Tâm sự Chữa lành
const { handleAvatarCheck } = require('./src/handlers/avatar.js'); // 🖼️ Hệ thống Soi Avatar chuyên biệt
const { handleChuaLanhCommand } = require('./src/handlers/chualanh.js'); // 🩹 Hệ thống tự sự Chữa Lành riêng biệt

// 🏪 IMPORT HỆ THỐNG GAME LÀM VIỆC MỚI TÍCH HỢP
const { handleLamViecGame } = require('./src/handlers/lamviec.js');

// Khởi tạo Web Server giữ Bot online 24/7
const app = express();
app.get('/', (req, res) => res.send('🤖 Bot đang tu luyện, vui lòng không làm phiền!'));
app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log('🌐 Web Server đang lắng nghe tại port: 3000');
});

// Khởi tạo Client Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildVoiceStates 
    ]
});

// Lấy các biến môi trường từ file .env
const { 
    TOKEN, 
    ADMIN_ID, 
    KENH_TAI_XIU, 
    KENH_NUOI_PET, 
    KENH_LOG_AUTOMOD, 
    KENH_NGAM_THO, 
    KENH_CHECK_AVATAR,
    KENH_CHUA_LANH,
    KENH_LAM_VIEC // Thêm biến kênh làm việc
} = process.env;

// Sự kiện khi Bot kích hoạt thành công
client.once(Events.ClientReady, (readyClient) => {
    console.log('==================================================');
    console.log(`🤖 Bot đã trực tuyến thành công dưới tên: ${readyClient.user.tag}`);
    console.log(`🎰 Kênh Tài Xỉu: ${KENH_TAI_XIU || 'Chưa cấu hình'}`);
    console.log(`🐾 Kênh Nuôi Pet: ${KENH_NUOI_PET || 'Chưa cấu hình'}`);
    console.log(`🏪 Kênh Làm Việc: ${KENH_LAM_VIEC || 'Chưa cấu hình'}`); // Log kiểm tra kênh làm việc
    console.log(`🚨 Kênh Log AutoMod: ${KENH_LOG_AUTOMOD || 'Chưa cấu hình'}`);
    console.log(`📖 Kênh Ngâm Thơ & Chữa Lành: ${KENH_NGAM_THO || 'Chưa cấu hình'}`);
    console.log(`🖼️ Kênh Check Avatar: ${KENH_CHECK_AVATAR || 'Chưa cấu hình'}`);
    console.log(`🩹 Kênh Chữa Lành Riêng Biệt: ${KENH_CHUA_LANH || 'Chưa cấu hình'}`);
    console.log('==================================================');

    // Kích hoạt luồng chạy ngầm tự động ngâm thơ ngẫu nhiên theo giờ giấc
    startAutoPoem(readyClient);
});

// =========================================================
// 👋 SỰ KIỆN CHÀO MỪNG THÀNH VIÊN MỚI GIA NHẬP SERVER
// =========================================================
client.on('guildMemberAdd', async (member) => {
    await handleWelcomeMember(member);
});

// =========================================================
// 🎤 SỰ KIỆN VOICE (Gọi trực tiếp từ file handler riêng biệt)
// =========================================================
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        await handleVoiceStateUpdate(oldState, newState);
    } catch (error) {
        console.error('❌ Lỗi Voice State:', error);
    }
});

// =========================================================
// 💬 XỬ LÝ TIN NHẮN CHAT (MESSAGE CREATE)
// =========================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    try {
        // 1. Chạy hệ thống Quét từ cấm & link bẩn
        const isMuted = await handleAutoMod(message);
        if (isMuted) return;

        // 2. Chạy lệnh dành cho Ban Quản Trị
        const isAdminCmd = await handleAdminCommands(message);
        if (isAdminCmd) return;

        // 3. Lệnh triệu hồi giao diện Tu Tiên
        if (message.content === '!tutien') {
            await sendTuTienMainMenu(message);
            return;
        }

        // 4. Lệnh đóng Bot khẩn cấp từ xa
        if (message.content === '!stop-bot' && message.author.id === ADMIN_ID) {
            await message.channel.send('🤖 Hệ thống đang đóng toàn bộ cổng liên kết...');
            client.destroy();
            process.exit(0);
        }

        // 📖 5. Hệ thống gọi thơ thủ công và các mật lệnh tâm sự
        const isPoemSystem = await handlePoemCommand(message);
        if (isPoemSystem) return;

        // 🩹 5.5. Hệ thống tự sự chữa lành về thanh xuân (MỚI)
        const isChuaLanh = await handleChuaLanhCommand(message);
        if (isChuaLanh) return;

        // 🖼️ 6. Hệ thống Check Avatar theo yêu cầu
        const isAvatarCmd = await handleAvatarCheck(message);
        if (isAvatarCmd) return;

        // 🏪 6.5. HỆ THỐNG GAME LÀM VIỆC KIẾM TIỀN (MỚI TÍCH HỢP)
        const isLamViecCmd = await handleLamViecGame(message);
        if (isLamViecCmd) return; // Nếu đúng lệnh làm việc, dừng xử lý tiếp bên dưới để tránh đụng độ

        // 7. Minigame nối từ Tiếng Anh
        await handleNoiTuGame(message);

        // 🎰 8. Minigame Tài Xỉu Thử Vận May
        await handleTaiXiuGame(message);

        // 🐾 9. Minigame nuôi Linh thú
        await handlePetSystem(message);

    } catch (error) {
        console.error('❌ Lỗi xử lý tin nhắn:', error);
    }
});

// =========================================================
// ⚡ HỆ THỐNG XỬ LÝ TƯƠNG TÁC (BUTTON & MODAL INTERACTION)
// =========================================================
client.on('interactionCreate', async (interaction) => {
    
    if (interaction.isButton()) {
        
        if (interaction.customId.includes('ticket')) {
            try {
                await handleTicketInteraction(interaction);
            } catch (error) {
                console.error('❌ Lỗi Tương tác Ticket:', error);
            }
            return; 
        }

        if (interaction.customId.startsWith('tt_')) {
            try {
                await handleTuTienInteraction(interaction);
            } catch (error) {
                console.error('❌ Lỗi Tương tác Tu Tiên:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ Thiên địa chấn động, chân khí đảo lộn (Hệ thống gặp sự cố)!', 
                        ephemeral: true 
                    }).catch(() => {});
                }
            }
            return; 
        }

        if (interaction.customId.startsWith('vm_')) {
            try {
                await handleVoiceMenuInteraction(interaction);
            } catch (error) {
                console.error('❌ Lỗi Tương tác Nút Voice:', error);
            }
            return;
        }
    }

    if (interaction.isModalSubmit()) {
        
        if (interaction.customId.startsWith('vmm_')) {
            try {
                await handleVoiceModalSubmit(interaction);
            } catch (error) {
                console.error('❌ Lỗi xử lý bảng nhập liệu Voice:', error);
            }
            return;
        }
    }
});

process.on('unhandledRejection', (reason) => console.error('❌ Lỗi bất đồng bộ toàn cục:', reason));
process.on('uncaughtException', (err) => console.error('❌ Lỗi nghiêm trọng toàn cục:', err));

client.login(TOKEN);