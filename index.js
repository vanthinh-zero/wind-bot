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
const { TOKEN, ADMIN_ID, KENH_TAI_XIU, KENH_NUOI_PET, KENH_LOG_AUTOMOD, KENH_NGAM_THO, KENH_CHECK_AVATAR } = process.env;

// Sự kiện khi Bot kích hoạt thành công
client.once(Events.ClientReady, (readyClient) => {
    console.log('==================================================');
    console.log(`🤖 Bot đã trực tuyến thành công dưới tên: ${readyClient.user.tag}`);
    console.log(`🎰 Kênh Tài Xỉu: ${KENH_TAI_XIU || 'Chưa cấu hình'}`);
    console.log(`🐾 Kênh Nuôi Pet: ${KENH_NUOI_PET || 'Chưa cấu hình'}`);
    console.log(`🚨 Kênh Log AutoMod: ${KENH_LOG_AUTOMOD || 'Chưa cấu hình'}`);
    console.log(`📖 Kênh Ngâm Thơ & Chữa Lành: ${KENH_NGAM_THO || 'Chưa cấu hình'}`);
    console.log(`🖼️ Kênh Check Avatar: ${KENH_CHECK_AVATAR || 'Chưa cấu hình'}`);
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
        // 1. Chạy hệ thống Quét từ cấm & link bẩn (Sẽ log về KENH_LOG_AUTOMOD nếu vi phạm)
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

        // 📖 5. Hệ thống gọi thơ thủ công và các mật lệnh tâm sự (!poem, !tôi buồn, !tôi muốn được yêu, !triết lí, !mệt)
        const isPoemSystem = await handlePoemCommand(message);
        if (isPoemSystem) return;

        // 🖼️ 6. Hệ thống Check Avatar theo yêu cầu (Chỉ chạy tại KENH_CHECK_AVATAR)
        const isAvatarCmd = await handleAvatarCheck(message);
        if (isAvatarCmd) return;

        // 7. Minigame nối từ Tiếng Anh
        await handleNoiTuGame(message);

        // 🎰 8. Minigame Tài Xỉu Thử Vận May (Có Lưu Trữ Ví Tiền)
        await handleTaiXiuGame(message);

        // 🐾 9. Minigame nuôi Linh thú (Pet chỉ chạy tại KENH_NUOI_PET)
        await handlePetSystem(message);

    } catch (error) {
        console.error('❌ Lỗi xử lý tin nhắn:', error);
    }
});

// =========================================================
// ⚡ HỆ THỐNG XỬ LÝ TƯƠNG TÁC (BUTTON & MODAL INTERACTION)
// =========================================================
client.on('interactionCreate', async (interaction) => {
    
    // -----------------------------------------------------
    // 🔘 LUỒNG 1: XỬ LÝ CÁC NÚT BẤM (IS BUTTON)
    // -----------------------------------------------------
    if (interaction.isButton()) {
        
        // Phân luồng 1.1: Tương tác hệ thống Ticket
        if (interaction.customId.includes('ticket')) {
            try {
                await handleTicketInteraction(interaction);
            } catch (error) {
                console.error('❌ Lỗi Tương tác Ticket:', error);
            }
            return; 
        }

        // Phân luồng 1.2: Tương tác hệ thống Tu Tiên
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

        // Phân luồng 1.3: Tương tác Menu Voice điều khiển (vm_)
        if (interaction.customId.startsWith('vm_')) {
            try {
                await handleVoiceMenuInteraction(interaction);
            } catch (error) {
                console.error('❌ Lỗi Tương tác Nút Voice:', error);
            }
            return;
        }
    }

    // -----------------------------------------------------
    // 📝 LUỒNG 2: XỬ LÝ BẢNG POPUP NHẬP LIỆU (IS MODAL SUBMIT)
    // -----------------------------------------------------
    if (interaction.isModalSubmit()) {
        
        // Đón nhận dữ liệu từ bảng Đổi Tên / Giới Hạn Người (vmm_)
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

// Chống crash bot khi gặp lỗi bất ngờ từ các thư viện ngoài
process.on('unhandledRejection', (reason) => console.error('❌ Lỗi bất đồng bộ toàn cục:', reason));
process.on('uncaughtException', (err) => console.error('❌ Lỗi nghiêm trọng toàn cục:', err));

client.login(TOKEN);