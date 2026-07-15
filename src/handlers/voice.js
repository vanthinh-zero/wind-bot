const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addVoiceMinutes } = require('./counter.js'); // Import hàm cộng giờ từ counter

const CREATOR_CHANNEL_ID = process.env.VOICE_CREATOR_CHANNEL_ID;

// =========================================================
// ⚡ THIẾT LẬP MAP TOÀN CỤC ĐỂ ĐỒNG BỘ REAL-TIME VỚI VOICEMENU.JS
// =========================================================
if (!global.activeVoiceChannels) {
    global.activeVoiceChannels = new Map();
}
const activeVoiceChannels = global.activeVoiceChannels;
const voiceTimeTrack = new Map(); // Map ngầm theo dõi thời điểm bắt đầu vào voice của từng user

async function handleVoiceStateUpdate(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // =========================================================
    // HỆ THỐNG GHI NHẬN VOICE ACTIVITY CHẠY NGẦM
    // =========================================================
    // 1. Nếu User vừa kết nối vào một phòng Voice bất kỳ (Từ trạng thái không ở trong phòng nào)
    if (!oldState.channelId && newState.channelId) {
        voiceTimeTrack.set(member.id, Date.now());
    }

    // 2. Nếu User đổi từ phòng Voice này sang phòng Voice khác
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const joinTime = voiceTimeTrack.get(member.id);
        if (joinTime) {
            const durationMs = Date.now() - joinTime;
            const minutes = Math.floor(durationMs / 60000); // Quy đổi ra số phút thực tế
            if (minutes > 0) {
                addVoiceMinutes(member.id, member.user.username, minutes);
            }
        }
        // Reset lại mốc thời gian bắt đầu tại phòng mới
        voiceTimeTrack.set(member.id, Date.now());
    }

    // 3. Nếu User ngắt kết nối hoàn toàn khỏi các phòng thoại
    if (oldState.channelId && !newState.channelId) {
        const joinTime = voiceTimeTrack.get(member.id);
        if (joinTime) {
            const durationMs = Date.now() - joinTime;
            const minutes = Math.floor(durationMs / 60000);
            if (minutes > 0) {
                addVoiceMinutes(member.id, member.user.username, minutes);
            }
            voiceTimeTrack.delete(member.id); // Xóa khỏi bộ nhớ theo dõi
        }
    }

    // =========================================================
    // PHẦN 1: TỰ ĐỘNG TẠO PHÒNG & GỬI MENU CONTROL PANEL
    // =========================================================
    if (newState.channelId === CREATOR_CHANNEL_ID) {
        try {
            const guild = newState.guild;
            const parentCategory = newState.channel.parent;
            const botId = guild.members.me.id;

            const newCustomChannel = await guild.channels.create({
                name: `🎙️ Room của ${member.displayName}`,
                type: ChannelType.GuildVoice,
                parent: parentCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                    },
                    {
                        id: member.id,
                        allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers],
                    },
                    {
                        id: botId,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.EmbedLinks,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    }
                ],
            });

            // ⚡ Ghi trực tiếp vào định dạng String để voiceMenu.js check .has() chuẩn 100%
            activeVoiceChannels.set(String(newCustomChannel.id), String(member.id));
            await member.voice.setChannel(newCustomChannel);

            // --- TẠO MENU LINK NÚT BẤM (Đã nâng cấp 2 hàng nút) ---
            const menuEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🔊 VOICEMASTER CONTROL PANEL')
                .setDescription(`Chào mừng <@${member.id}> đến với phòng thoại riêng!\nBạn có thể quản lý phòng của mình bằng các nút bấm dưới đây.`)
                .addFields(
                    { name: '🔒 Khóa / 🔓 Mở', value: 'Quản lý quyền vào phòng', inline: true },
                    { name: '👻 Ẩn / Hiện', value: 'Ẩn phòng khỏi danh sách', inline: true },
                    { name: '📝 Đổi Tên / 👥 Giới Hạn', value: 'Tùy chỉnh thông số phòng', inline: false }
                )
                .setFooter({ text: 'Chỉ chủ phòng mới có thể tương tác!' });

            // Hàng nút 1: Quyền hạn cơ bản
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vm_lock').setLabel('🔒 Khóa').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('vm_unlock').setLabel('🔓 Mở Khóa').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('vm_ghost').setLabel('👻 Ẩn/Hiện').setStyle(ButtonStyle.Secondary)
            );

            // Hàng nút 2: Chỉnh sửa thông số
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vm_rename').setLabel('📝 Đổi Tên Phòng').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('vm_limit').setLabel('👥 Giới Hạn Người').setStyle(ButtonStyle.Primary)
            );

            setTimeout(async () => {
                await newCustomChannel.send({ embeds: [menuEmbed], components: [row1, row2] }).catch(() => {});
            }, 1000);

            return; 
        } catch (error) {
            console.error('❌ Lỗi VoiceMaster khi tạo phòng:', error);
            return;
        }
    }

    // =========================================================
    // PHẦN 2: LOGIC GỬI TIN NHẮN THÔNG BÁO VÀO/RỜI PHÒNG
    // =========================================================
    if (newState.channelId && oldState.channelId !== newState.channelId) {
        const voiceChannel = newState.channel;
        if (voiceChannel && voiceChannel.viewable && newState.channelId !== CREATOR_CHANNEL_ID) {
            const isCreatorJoiningOwnNewRoom = activeVoiceChannels.get(String(voiceChannel.id)) === String(member.id) && !oldState.channelId;
            if (!isCreatorJoiningOwnNewRoom) {
                await voiceChannel.send({ content: `<@${member.id}> vừa tham gia vào channel.` }).catch(() => {});
            }
        }
    } 
    
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const voiceChannel = oldState.channel;
        if (voiceChannel && voiceChannel.viewable && oldState.channelId !== CREATOR_CHANNEL_ID) {
            const channelIdStr = String(voiceChannel.id);
            if (voiceChannel.members.size === 0 && activeVoiceChannels.has(channelIdStr)) {
                try {
                    await voiceChannel.delete();
                    activeVoiceChannels.delete(channelIdStr);
                } catch (error) {
                    if (error.code !== 10003) console.error('❌ Lỗi khi dọn phòng:', error);
                    activeVoiceChannels.delete(channelIdStr);
                }
            } else {
                await voiceChannel.send({ content: `<@${member.id}> vừa rời khỏi channel.` }).catch(() => {});
            }
        }
    }
}

module.exports = {
    handleVoiceStateUpdate,
    activeVoiceChannels
};