require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');

// --- IMPORT TẤT CẢ CÁC HANDLERS HỆ THỐNG SẴN CÓ ---
const { handleWindCommand } = require('./src/handlers/wind.js'); 
const { handleAutoMod, handleAdminCommands } = require('./src/handlers/automod.js');
const { handleNoiTuGame } = require('./src/handlers/noitu.js'); 
const { handleTicketInteraction, sendTicketSetup } = require('./src/handlers/ticket.js');
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
const { handleRuleCommand, handleRuleInteraction } = require('./src/handlers/rule.js');

// 👤 MODULE PROFILE, RELATIONSHIP & SHOP CỬA HÀNG
const profileHandler = require('./src/handlers/profile.js');
const relationshipHandler = require('./src/handlers/relationship.js');
let shopHandler;
try {
    shopHandler = require('./src/handlers/shop.js');
} catch (e) {
    console.warn('⚠️ Chưa tìm thấy module shop.js hoặc lỗi import, bỏ qua shopHandler.');
}

// 🎵 IMPORT MODULE KIỂM TRA BOT NHẠC
const { handleMusicCheckCommand } = require('./src/handlers/musicChecker.js');

// 🚀 HỆ THỐNG BOOSTER (Hỗ trợ !svip Hub & !menuvip Control Panel)
const { 
    handleServerBoost, 
    handleBoostTicketInteraction, 
    handleMenuVipCommand, 
    handleSpawnVipCommand,
    handleAutoGrantPermission
} = require('./src/handlers/boostHandler.js');

// Bổ sung logic quét phòng trống an toàn trực tiếp
async function checkAndCleanVipRoom(oldState, newState) {
    try {
        const oldChannel = oldState.channel;
        if (!oldChannel) return;

        if (oldChannel.parentId === process.env.BOOSTER_CATEGORY_ID && oldChannel.members.size === 0) {
            setTimeout(async () => {
                const checkChannel = oldState.guild.channels.cache.get(oldChannel.id);
                if (checkChannel && checkChannel.members.size === 0) {
                    await checkChannel.delete().catch(() => null);
                }
            }, 2000);
        }
    } catch (e) {
        console.error('Lỗi khi dọn dẹp phòng VIP trống:', e);
    }
}

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
const start25hReminder = require('./src/handlers/marketing.js')?.start25hReminder || require('./src/handlers/marketing.js');

// 📚 MODULE TỪ VỰNG TIẾNG ANH ĐỊNH KỲ
const vocabularySystem = require('./src/handlers/vocabulary.js');

// --- KHỞI TẠO WEB SERVER ĐỂ TREO BOT CẢ NĂM TRÊN RENDER ---
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

// --- KHỞI TẠO DISCORD CLIENT VỚI ĐẦY ĐỦ INTENTS ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences
    ]
});

// --- SỰ KIỆN KHỞI CHẠY BOT ---
client.once(Events.ClientReady, async (readyClient) => {
    console.log('==================================================');
    console.log(`🤖 Bot đã trực tuyến thành công dưới tên: ${readyClient.user.tag}`);
    console.log('==================================================');
    
    try {
        const allSlashCommands = [
            ...(profileHandler?.commandsData || []),
            ...(relationshipHandler?.commandsData || relationshipHandler?.relationshipCommands || []),
            ...(shopHandler?.shopCommands || shopHandler?.commandsData || [])
        ];

        if (allSlashCommands.length > 0) {
            for (const [guildId, guild] of readyClient.guilds.cache) {
                await guild.commands.set(allSlashCommands).catch((e) => {
                    console.error(`⚠️ Không thể gán Slash Commands cho ${guild.name}:`, e.message);
                });
                console.log(`✅ [Slash Commands] Đã đăng ký tức thì cho Server: ${guild.name} (${guildId})`);
            }
        }
    } catch (e) {
        console.error('❌ Lỗi khi đăng ký Slash Commands Profile / Relationship / Shop:', e);
    }

    if (typeof startAutoPoem === 'function') startAutoPoem(readyClient);
    if (typeof start25hReminder === 'function') start25hReminder(readyClient);

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
client.on(Events.GuildMemberAdd, async (member) => { 
    try {
        if (typeof handleWelcomeMember === 'function') await handleWelcomeMember(member);
        if (typeof handleAutoGrantPermission === 'function') await handleAutoGrantPermission(member);
    } catch (error) {
        console.error('Lỗi trong sự kiện GuildMemberAdd:', error);
    }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
        if (typeof handleVoiceStateUpdate === 'function') await handleVoiceStateUpdate(oldState, newState);
        await checkAndCleanVipRoom(oldState, newState);
    } catch (error) {
        console.error('Lỗi trong sự kiện VoiceStateUpdate:', error);
    }
});

// --- SỰ KIỆN NHẬN TIN NHẮN (MESSAGE CREATE) ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    try {
        // 1. Kiểm tra Anti-Spam / Anti-Raid trước
        if (typeof handleAntiSpam === 'function') {
            const isSpam = await handleAntiSpam(message);
            if (isSpam) return;
        }

        // 2. Tự động cấp quyền cho bạn bè khi chủ phòng Tag tên trong chat voice
        if (typeof handleAutoGrantPermission === 'function') {
            await handleAutoGrantPermission(message);
        }

        // 3. Đếm tin nhắn & Chạy AutoMod ngầm
        if (typeof addMessageCount === 'function') await addMessageCount(message);
        if (typeof handleAutoMod === 'function') await handleAutoMod(message);
        if (typeof handleAdminCommands === 'function') await handleAdminCommands(message);

        const content = message.content.trim().toLowerCase();

        // 4. ĐIỀU HƯỚNG LỆNH CHÍNH XÁC (Sử dụng return để ngắt luồng chuẩn xác)
        
        // ✦ Lệnh !svip / !spawnvip -> Gửi Bảng Hub Trung Tâm Đặc Quyền Booster (Admin)
        if (content.startsWith('!svip') || content.startsWith('!spawnvip')) {
            if (typeof handleSpawnVipCommand === 'function') return await handleSpawnVipCommand(message);
        }

        // ✦ Lệnh !menuvip / !vip -> Gửi Bảng Điều Khiển Voice VIP (Khi ở trong phòng Voice VIP)
        if (content.startsWith('!menuvip') || content.startsWith('!vip')) {
            if (typeof handleMenuVipCommand === 'function') return await handleMenuVipCommand(message);
        }

        // ✦ Các lệnh tiện ích & trò chơi khác
        if (content.startsWith('!wind')) {
            if (typeof handleWindCommand === 'function') return await handleWindCommand(message);
        }
        if (content.startsWith('!noitu')) {
            if (typeof handleNoiTuGame === 'function') return await handleNoiTuGame(message);
        }
        if (content.startsWith('!taixiu') || content.startsWith('!tx')) {
            if (typeof handleTaiXiuGame === 'function') return await handleTaiXiuGame(message);
        }
        if (content.startsWith('!pet')) {
            if (typeof handlePetSystem === 'function') return await handlePetSystem(message);
        }
        if (content.startsWith('!poem') || content.startsWith('!tho')) {
            if (typeof handlePoemCommand === 'function') return await handlePoemCommand(message);
        }
        if (content.startsWith('!avatar') || content.startsWith('!avt')) {
            if (typeof handleAvatarCheck === 'function') return await handleAvatarCheck(message);
        }
        if (content.startsWith('!chualanh')) {
            if (typeof handleChuaLanhCommand === 'function') return await handleChuaLanhCommand(message);
        }
        if (content.startsWith('!work') || content.startsWith('!lamviec')) {
            if (typeof handleLamViecGame === 'function') return await handleLamViecGame(message);
        }
        if (content.startsWith('!tarot')) {
            if (typeof handleTarotCommand === 'function') return await handleTarotCommand(message);
        }
        if (content.startsWith('!rule') || content.startsWith('!luat')) {
            if (typeof handleRuleCommand === 'function') return await handleRuleCommand(message);
        }
        if (content.startsWith('!music') || content.startsWith('!botnhac')) {
            if (typeof handleMusicCheckCommand === 'function') return await handleMusicCheckCommand(message);
        }
        if (content.startsWith('!topchat')) {
            if (typeof handleTopChatImageCommand === 'function') return await handleTopChatImageCommand(message);
        }
        if (content.startsWith('!autorole')) {
            if (typeof handleAutoRoleCommand === 'function') return await handleAutoRoleCommand(message);
        }
        if (content.startsWith('!dethi') || content.startsWith('!exam')) {
            if (typeof handleDeThiCommand === 'function') return await handleDeThiCommand(message);
        }
        if (content.startsWith('!fakeraid')) {
            if (typeof handleFakeRaidCommand === 'function') return await handleFakeRaidCommand(message);
        }
        if (content.startsWith('!ticket')) {
            if (typeof sendTicketSetup === 'function') return await sendTicketSetup(message);
        }
        if (content.startsWith('!tutien')) {
            if (typeof sendTuTienMainMenu === 'function') return await sendTuTienMainMenu(message);
        }

        // ✦ ĐẤU LỆNH CHAT VÀ QUẢN LÝ TỪ KHÓA (!tukhoa, !chat, !mood, !trathongtin, !)
        if (content.startsWith('!tukhoa') || content.startsWith('!chat') || content.startsWith('!mood') || content.startsWith('!trathongtin') || content.startsWith('!thongketag') || content.startsWith('!taocontent')) {
            if (typeof handleChatInteraction === 'function') {
                return await handleChatInteraction(message);
            }
        }

        // 5. Nếu tin nhắn bắt đầu bằng dấu '!' nhưng không trùng bất kỳ lệnh nào ở trên -> Ngắt ngay
        if (content.startsWith('!')) return;

        // 6. Trò chuyện tự động AI/Bot Chat (Dành cho câu không có prefix '!'):
        if (typeof handleChatInteraction === 'function') {
            await handleChatInteraction(message);
        }
    } catch (error) {
        console.error('Lỗi trong xử lý tin nhắn MessageCreate:', error);
    }
});

// --- SỰ KIỆN TƯƠNG TÁC (INTERACTION CREATE) ---
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // 1. Module Booster (Nút bấm tạo Voice, chọn Role màu, quản lý Voice VIP)
        if (typeof handleBoostTicketInteraction === 'function') {
            await handleBoostTicketInteraction(interaction);
        }
        if (interaction.replied || interaction.deferred) return;

        // 2. Module Shop Cửa hàng
        if (shopHandler) {
            const shopFn = shopHandler.handleShopInteraction || shopHandler.handleInteraction;
            if (typeof shopFn === 'function') await shopFn(interaction);
        }
        if (interaction.replied || interaction.deferred) return;

        // 3. Module Relationship (Kết hôn & mối quan hệ)
        if (relationshipHandler && typeof relationshipHandler.handleInteraction === 'function') {
            await relationshipHandler.handleInteraction(interaction);
        }
        if (interaction.replied || interaction.deferred) return;

        // 4. Module Profile Cá Nhân
        if (profileHandler && typeof profileHandler.handleInteraction === 'function') {
            await profileHandler.handleInteraction(interaction);
        }
        if (interaction.replied || interaction.deferred) return;

        // 5. Các Button / SelectMenu / Modal khác
        if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
            if (typeof handleTicketInteraction === 'function') await handleTicketInteraction(interaction);
            if (typeof handleTuTienInteraction === 'function') await handleTuTienInteraction(interaction);
            if (typeof handleVoiceMenuInteraction === 'function') await handleVoiceMenuInteraction(interaction);
            if (typeof handleVoiceModalSubmit === 'function') await handleVoiceModalSubmit(interaction);
            if (typeof handleTarotInteraction === 'function') await handleTarotInteraction(interaction);
            if (typeof handleRuleInteraction === 'function') await handleRuleInteraction(interaction);
            if (typeof handleAutoRoleInteraction === 'function') await handleAutoRoleInteraction(interaction);
            if (typeof handleDeThiInteraction === 'function') await handleDeThiInteraction(interaction);
        }
    } catch (error) {
        console.error('❌ Lỗi xử lý InteractionCreate:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ Có lỗi xảy ra khi xử lý tương tác này!',
                ephemeral: true
            }).catch(() => null);
        }
    }
});

// --- SỰ KIỆN REACTION (AUTOROLE) ---
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
        if (typeof handleAutoRoleReactionAdd === 'function') {
            await handleAutoRoleReactionAdd(reaction, user);
        }
    } catch (error) {
        console.error('Lỗi MessageReactionAdd:', error);
    }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
    try {
        if (typeof handleAutoRoleReactionRemove === 'function') {
            await handleAutoRoleReactionRemove(reaction, user);
        }
    } catch (error) {
        console.error('Lỗi MessageReactionRemove:', error);
    }
});

// --- SỰ KIỆN SERVER BOOST ---
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
        if (typeof handleServerBoost === 'function') {
            await handleServerBoost(oldMember, newMember);
        }
    } catch (error) {
        console.error('Lỗi GuildMemberUpdate (Boost):', error);
    }
});

// --- ĐĂNG NHẬP BOT VÀO DISCORD ---
const token = process.env.DISCORD_TOKEN || process.env.TOKEN;

if (!token) {
    console.error('❌ Không tìm thấy DISCORD_TOKEN hoặc TOKEN trong file .env!');
    process.exit(1);
}

client.login(token.trim()).catch((err) => {
    console.error('❌ Lỗi đăng nhập Bot:', err.message);
});