require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');

const { handleVideoLink } = require('./src/handlers/video.js');

const { handleWindCommand } = require('./src/handlers/wind.js'); 
const { handleAutoMod, handleAdminCommands } = require('./src/handlers/automod.js');
const { handleNoiTuGame } = require('./src/handlers/noitu.js'); 
const { handleTicketInteraction, sendTicketSetup } = require('./src/handlers/ticket.js');
const { sendTuTienMainMenu, handleTuTienInteraction } = require('./src/handlers/tutien.js');
const { handleVoiceStateUpdate } = require('./src/handlers/voice.js');
const { handleVoiceMenuInteraction, handleVoiceModalSubmit } = require('./src/handlers/voiceMenu.js');
const { handleWelcomeMember } = require('./src/handlers/welcome.js');
const { handleGoodbyeMember } = require('./src/handlers/goodbye.js'); // 👈 Bổ sung module Goodbye
const { handleTaiXiuGame } = require('./src/handlers/taixiu.js');
const { handlePetSystem } = require('./src/handlers/pet.js'); 
const { startAutoPoem, handlePoemCommand } = require('./src/handlers/poem.js'); 
const { handleAvatarCheck } = require('./src/handlers/avatar.js'); 
const { handleChuaLanhCommand } = require('./src/handlers/chualanh.js'); 
const { handleLamViecGame } = require('./src/handlers/lamviec.js');
const { handleTarotCommand, handleTarotInteraction } = require('./src/handlers/tarotModule.js');
const { handleRuleCommand, handleRuleInteraction } = require('./src/handlers/rule.js');

const { handleSpamCommand } = require('./src/handlers/spamchat.js');

const { handleBroadcastCommand } = require('./src/handlers/broadcastHandler.js');

const profileHandler = require('./src/handlers/profile.js');
const relationshipHandler = require('./src/handlers/relationship.js');
let shopHandler;
try {
    shopHandler = require('./src/handlers/shop.js');
} catch (e) {
    console.warn('⚠️ Chưa tìm thấy module shop.js hoặc lỗi import, bỏ qua shopHandler.');
}

const { handleMusicCheckCommand } = require('./src/handlers/musicChecker.js');

const { 
    handleServerBoost, 
    handleBoostTicketInteraction, 
    handleMenuVipCommand, 
    handleSpawnVipCommand,
    handleAutoGrantPermission
} = require('./src/handlers/boostHandler.js');

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

const { addMessageCount } = require('./src/handlers/counter.js');
const { handleTopChatImageCommand } = require('./src/handlers/topchatImage.js');

// 🏷️ MODULE AUTOROLE
const { 
    handleAutoRoleCommand, 
    handleAutoRoleInteraction,
    handleAutoRoleReactionAdd, 
    handleAutoRoleReactionRemove 
} = require('./src/handlers/autorole.js');

const { handleChatInteraction, initAutoSpam } = require('./src/handlers/chat.js');

const { handleDeThiCommand, handleDeThiInteraction } = require('./src/handlers/dethi.js');

const { handleAntiSpam, handleFakeRaidCommand } = require('./src/handlers/antiRaid.js');

const start25hReminder = require('./src/handlers/marketing.js')?.start25hReminder || require('./src/handlers/marketing.js');

const vocabularySystem = require('./src/handlers/vocabulary.js');

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


client.on(Events.GuildMemberAdd, async (member) => { 
    try {
        if (typeof handleWelcomeMember === 'function') await handleWelcomeMember(member);
        if (typeof handleAutoGrantPermission === 'function') await handleAutoGrantPermission(member);
    } catch (error) {
        console.error('Lỗi trong sự kiện GuildMemberAdd:', error);
    }
});

client.on(Events.GuildMemberRemove, async (member) => {
    try {
        if (typeof handleGoodbyeMember === 'function') await handleGoodbyeMember(member);
    } catch (error) {
        console.error('Lỗi trong sự kiện GuildMemberRemove:', error);
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

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    try {
        if (typeof handleVideoLink === 'function') {
            const isVideo = await handleVideoLink(message);
            if (isVideo) return; // Đã xử lý link video xong thì dừng
        }

        if (typeof handleAntiSpam === 'function') {
            const isSpam = await handleAntiSpam(message);
            if (isSpam) return;
        }

        if (typeof handleAutoGrantPermission === 'function') {
            await handleAutoGrantPermission(message);
        }

        if (typeof addMessageCount === 'function') await addMessageCount(message);
        if (typeof handleAutoMod === 'function') await handleAutoMod(message);
        if (typeof handleAdminCommands === 'function') await handleAdminCommands(message);

        if (typeof handleNoiTuGame === 'function') {
            const isNoiTuHandled = await handleNoiTuGame(message);
            if (isNoiTuHandled) return;
        }

        const content = message.content.trim().toLowerCase();


        if (content.startsWith('!say')) {
            if (typeof handleBroadcastCommand === 'function') {
                const handled = await handleBroadcastCommand(message);
                if (handled) return;
            }
        }
        
        if (content.startsWith('!spawntinnhan')) {
            if (typeof handleSpamCommand === 'function') return await handleSpamCommand(message);
        }

        if (content.startsWith('!svip') || content.startsWith('!spawnvip')) {
            if (typeof handleSpawnVipCommand === 'function') return await handleSpawnVipCommand(message);
        }

        if (content.startsWith('!menuvip') || content.startsWith('!vip')) {
            if (typeof handleMenuVipCommand === 'function') return await handleMenuVipCommand(message);
        }

        if (content.startsWith('!wind')) {
            if (typeof handleWindCommand === 'function') return await handleWindCommand(message);
        }

        if (content.startsWith('!taixiu') || content.startsWith('!tx') || content.startsWith('!vi') || content.startsWith('!ccash') || content.startsWith('!money') || content.startsWith('!cash') || content.startsWith('!diemdanh') || content.startsWith('!daily') || content.startsWith('!chuyentien') || content.startsWith('!thuhoi')) {
            if (typeof handleTaiXiuGame === 'function') return await handleTaiXiuGame(message);
        }
        if (content.startsWith('!pet') || content.startsWith('!shop-pet') || content.startsWith('!muapet') || content.startsWith('!choan') || content.startsWith('!nangcap') || content.startsWith('!tromcho') || content.startsWith('!thave') || content.startsWith('!khopet') || content.startsWith('!laypet') || content.startsWith('!lockpet') || content.startsWith('!banpet')) {
            if (typeof handlePetSystem === 'function') return await handlePetSystem(message);
        }

        if (content === '!shop' || content.startsWith('!muanhan') || content === '!khodo' || content === '!inventory') {
            if (shopHandler) {
                const shopFn = shopHandler.handleShopSystem || shopHandler.handleShopCommand;
                if (typeof shopFn === 'function') return await shopFn(message);
            }
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
        
        if (content.startsWith('!work') || content.startsWith('!lamviec') || content.startsWith('!jobs') || content.startsWith('!xinviec') || content.startsWith('!boviec') || content.startsWith('!profile')) {
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

        if (content.startsWith('!tukhoa') || content.startsWith('!chat') || content.startsWith('!mood') || content.startsWith('!trathongtin') || content.startsWith('!thongketag') || content.startsWith('!taocontent')) {
            if (typeof handleChatInteraction === 'function') {
                return await handleChatInteraction(message);
            }
        }

        if (content.startsWith('!')) return;

        if (typeof handleChatInteraction === 'function') {
            await handleChatInteraction(message);
        }
    } catch (error) {
        console.error('Lỗi trong xử lý tin nhắn MessageCreate:', error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isButton() && interaction.customId === 'start_private_autorole') {
            if (typeof handleAutoRoleInteraction === 'function') {
                await handleAutoRoleInteraction(interaction);
                return;
            }
        }

        if (typeof handleBoostTicketInteraction === 'function') {
            await handleBoostTicketInteraction(interaction);
        }
        if (interaction.replied || interaction.deferred) return;

        if (shopHandler) {
            const shopFn = shopHandler.handleShopInteraction || shopHandler.handleInteraction;
            if (typeof shopFn === 'function') await shopFn(interaction);
        }
        if (interaction.replied || interaction.deferred) return;

        if (relationshipHandler) {
            const relFn = relationshipHandler.handleRelationshipInteraction || relationshipHandler.handleInteraction;
            if (typeof relFn === 'function') await relFn(interaction);
        }
        if (interaction.replied || interaction.deferred) return;

        if (profileHandler && typeof profileHandler.handleInteraction === 'function') {
            await profileHandler.handleInteraction(interaction);
        }
        if (interaction.replied || interaction.deferred) return;

        if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
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

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
        if (typeof handleServerBoost === 'function') {
            await handleServerBoost(oldMember, newMember);
        }
    } catch (error) {
        console.error('Lỗi GuildMemberUpdate (Boost):', error);
    }
});

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;

if (!token) {
    console.error('❌ Không tìm thấy DISCORD_TOKEN hoặc TOKEN trong file .env!');
    process.exit(1);
}

client.login(token.trim()).catch((err) => {
    console.error('❌ Lỗi đăng nhập Bot:', err.message);
});