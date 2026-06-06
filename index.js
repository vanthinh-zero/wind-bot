require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');

// =========================================================
// IMPORT CÁC MODULES HÀM XỬ LÝ (Đã tối ưu luồng nạp)
// =========================================================
const { handleAutoMod, handleAdminCommands } = require('./src/handlers/automod.js');
const { handleNoiTuGame } = require('./src/handlers/noitu.js');
const { handleTicketInteraction } = require('./src/handlers/ticket.js');
const { sendTuTienMainMenu, handleTuTienInteraction } = require('./src/handlers/tutien.js');
const { handleVoiceStateUpdate } = require('./src/handlers/voice.js');
// 💡 ĐÃ TÍCH HỢP CẢ 2 HÀM (HÀM XỬ LÝ NÚT VÀ HÀM XỬ LÝ MÔ HÌNH NHẬP LIỆU)
const { handleVoiceMenuInteraction, handleVoiceModalSubmit } = require('./src/handlers/voiceMenu.js');

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
const { TOKEN, WELCOME_CHANNEL_ID, RULES_CHANNEL_ID, TICKET_CHANNEL_ID, START_ROLE_ID, ADMIN_ID, VOICE_CREATOR_CHANNEL_ID } = process.env;

// Sự kiện khi Bot kích hoạt thành công
client.once(Events.ClientReady, (readyClient) => {
    console.log('==================================================');
    console.log(`🤖 Bot đã trực tuyến thành công dưới tên: ${readyClient.user.tag}`);
    console.log('==================================================');
});

// Sự kiện chào mừng thành viên mới gia nhập Server
client.on('guildMemberAdd', async (member) => {
    if (START_ROLE_ID) {
        const role = member.guild.roles.cache.get(START_ROLE_ID);
        if (role) await member.roles.add(role).catch(() => {});
    }

    const wlChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!wlChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🎉 CHÀO MỪNG ĐẠO HỮU MỚI! 🎉`)
        .setDescription(`Chào mừng ${member} đã nhập môn thành công!\n\n📌 Lên hương nghe giảng luật tại: <#${RULES_CHANNEL_ID}>\n🎫 Cần trưởng lão hỗ trợ bấm tại: <#${TICKET_CHANNEL_ID}>`)
        .setTimestamp();
        
    await wlChannel.send({ embeds: [embed] }).catch(() => {});
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

// Xử lý Tin Nhắn Chat
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    try {
        // 1. Chạy hệ thống Quét từ cấm
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

        // 5. Minigame nối từ Tiếng Anh
        await handleNoiTuGame(message);
    } catch (error) {
        console.error('❌ Lỗi xử lý tin nhắn:', error);
    }
});

// =========================================================
// ⚡ HỆ THỐNG XỬ LÝ TƯƠNG TÁC (ĐÃ TÁCH BIỆT BUTTON & MODAL)
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