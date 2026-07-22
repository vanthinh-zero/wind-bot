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

// 👤 MODULE PROFILE & MỐI QUAN HỆ CỬ CHỈ (Đã tách rời 2 handler)
const profileHandler = require('./src/handlers/profile.js');
const relationshipHandler = require('./src/handlers/relationship.js');

// 🎵 IMPORT MODULE KIỂM TRA BOT NHẠC
const { handleMusicCheckCommand } = require('./src/handlers/musicChecker.js');

// 🚀 HỆ THỐNG BOOSTER
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
const start25hReminder = require('./src/handlers/marketing.js').start25hReminder || require('./src/handlers/marketing.js');
const handlePostToFacebook = require('./src/handlers/marketing.js').handlePostToFacebook;

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
    
    // Đăng ký Slash Commands cho Profile & Relationship trực tiếp theo Server
    try {
        const allSlashCommands = [
            ...(profileHandler.commandsData || []),
            ...(relationshipHandler.commandsData || [])
        ];

        if (allSlashCommands.length > 0) {
            for (const [guildId, guild] of readyClient.guilds.cache) {
                await guild.commands.set(allSlashCommands);
                console.log(`✅ [Slash Commands] Đã đăng ký tức thì cho Server: ${guild.name} (${guildId})`);
            }
        }
    } catch (e) {
        console.error('❌ Lỗi khi đăng ký Slash Commands Profile / Relationship:', e);
    }

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
        
        if (newState.channelId && oldState.channelId !== newState.channelId) {
            const voiceChannel = newState.channel;
            const member = newState.member;
            
            if (voiceChannel.parentId === process.env.BOOSTER_CATEGORY_ID) {
                const roomName = voiceChannel.name.toLowerCase();
                const memberName = member.displayName.toLowerCase();
                const userName = member.user.username.toLowerCase();

                if (roomName.includes(memberName) || roomName.includes(userName)) {
                    
                    const messages = await voiceChannel.messages.fetch({ limit: 20 }).catch(() => null);
                    const hasMenuAlready = messages && messages.some(msg => 
                        msg.author.id === client.user.id && 
                        msg.embeds.length > 0 && 
                        msg.embeds[0].title === '👑 BẢNG ĐIỀU KHIỂN PHÒNG VOICE VIP 👑'
                    );

                    if (!hasMenuAlready) {
                        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

                        const embed = new EmbedBuilder()
                            .setTitle('👑 BẢNG ĐIỀU KHIỂN PHÒNG VOICE VIP 👑')
                            .setDescription(`Chào mừng sếp **${member.displayName}** đã trở lại phòng voice!\nĐây là bộ công cụ tối cao để sếp quản lý phòng **${voiceChannel.name}** của mình.`)
                            .setColor('#FF007F')
                            .addFields(
                                { name: '🔒 Khóa/Mở Phòng', value: 'Ẩn hoặc chặn người lạ vào phòng.', inline: true },
                                { name: '👥 Giới Hạn', value: 'Thay đổi số lượng người tối đa.', inline: true },
                                { name: '🚫 Kích Người', value: 'Trục xuất thành viên không mong muốn.', inline: true }
                            )
                            .setFooter({ text: 'Quản gia Wind - Tự động phục vụ sếp!', iconURL: newState.guild.iconURL() })
                            .setTimestamp();

                        const row1 = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('vm_lock').setLabel('🔒 Khóa Phòng').setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId('vm_unlock').setLabel('🔓 Mở Khóa').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId('vm_limit').setLabel('👥 Đổi Giới Hạn').setStyle(ButtonStyle.Primary)
                        );

                        const row2 = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('vm_kick').setLabel('🚫 Kick Thành Viên').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('vm_rename').setLabel('✏️ Đổi Tên Phòng').setStyle(ButtonStyle.Primary)
                        );

                        await voiceChannel.send({
                            content: `👋 Tự động nhận diện Chủ Phòng ${member}! Bảng điều khiển tối cao đã được kích hoạt.`,
                            embeds: [embed],
                            components: [row1, row2]
                        }).catch(e => console.error("Lỗi tự động spawn menu VIP:", e));
                    }
                }
            }
        }

    } catch (e) { 
        console.error('Lỗi Luồng Voice State Update:', e); 
    }
});

// --- SỰ KIỆN NHẬN TIN NHẮN (MESSAGE CREATE) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    addMessageCount(message.author.id, message.author.username);

    try {
        // TỰ ĐỘNG CẤP QUYỀN TRUY CẬP PHÒNG VIP KHI CHỦ PHÒNG TAG NGƯỜI DÙNG
        await handleAutoGrantPermission(message);

        // 🎵 KIỂM TRA LỆNH BOT NHẠC (!music / !musicbot / !music bot)
        if (await handleMusicCheckCommand(message)) return;

        if (await handleRuleCommand(message)) return;

        // 💡 NHẮC BỎ TẬP QUÁN DÙNG LỆNH PREFIX CỦA PROFILE & MỐI QUAN HỆ
        const textCmd = message.content.toLowerCase();
        if (textCmd.startsWith('!profile') || textCmd.startsWith('!bio') || textCmd.startsWith('!setcolor') || textCmd.startsWith('!setbadge') || textCmd.startsWith('!setgif') || textCmd.startsWith('!totinh') || textCmd.startsWith('!kethon')) {
            const replyMsg = await message.reply('✨ **Mẹo:** Hệ thống đã chuyển toàn bộ sang lệnh ẩn Slash `/profile`, `/totinh`, `/kethon`, `/om`, `/hon`... rồi sếp ơi!');
            setTimeout(() => replyMsg.delete().catch(() => {}), 6000);
            return;
        }

        const msgContent = message.content.trim().toLowerCase();

        // XỬ LÝ LỆNH SPAWN TICKET MỚI
        if (msgContent === '!set ticket') {
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('❌ Bạn cần có quyền \`Administrator\` để sử dụng lệnh này.');
            }
            await sendTicketSetup(message.channel);
            await message.delete().catch(() => {});
            return;
        }

        if (msgContent === '!svip') {
            await handleSpawnVipCommand(message);
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

// --- SỰ KIỆN XỬ LÝ TƯƠNG TÁC (SLASH COMMANDS & BUTTONS) ---
client.on('interactionCreate', async (interaction) => {
    // 1. Xử lý Slash Commands & Buttons cho Profile & Relationship
    try {
        if (typeof profileHandler.handleInteraction === 'function') {
            await profileHandler.handleInteraction(interaction);
        }
        if (typeof relationshipHandler.handleInteraction === 'function') {
            await relationshipHandler.handleInteraction(interaction);
        }
    } catch (e) {
        console.error('❌ Lỗi xử lý tương tác Profile / Relationship:', e);
    }

    if (interaction.replied || interaction.deferred) return;

    const customId = interaction.customId || '';

    try {
        if (interaction.isButton() && customId.startsWith('vm_')) {
            await handleVoiceMenuInteraction(interaction);
            return;
        }

        if (interaction.isModalSubmit() && customId.startsWith('vmm_')) {
            await handleVoiceModalSubmit(interaction);
            return;
        }

        const isBoostInteraction = 
            customId === 'boost_ticket_create' || 
            customId === 'boost_voice_modal_trigger' || 
            customId === 'boost_voice_modal_submit' || 
            customId === 'vip_color_suggest_start' || 
            customId === 'vip_color_select_tone' || 
            customId === 'vip_color_select_match' || 
            customId.startsWith('vip_role_modal_submit_') ||
            customId.startsWith('vip_');

        if (isBoostInteraction) {
            await handleBoostTicketInteraction(interaction);
            return; 
        }

        if (customId === 'start_private_autorole') {
            await handleAutoRoleInteraction(interaction);
            return;
        }

        if (customId.startsWith('submit_full_') || customId.startsWith('modal_full_')) {
            await handleDeThiInteraction(interaction);
            return;
        }

        if (interaction.isButton()) {
            if (customId.startsWith('tarot_')) { await handleTarotInteraction(interaction); return; }
            if (customId.startsWith('tt_')) { await handleTuTienInteraction(interaction); return; }
            if (customId.includes('ticket')) { await handleTicketInteraction(interaction); return; }
        }

        await handleRuleInteraction(interaction);

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