const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const DEFAULT_GIF = 'https://media.discordapp.net/attachments/1508103127956455536/1528807367821492334/MOO_MOO_1.gif';

// Bộ nhớ lưu tạm dữ liệu profile
const userProfiles = new Map();

function getUserData(userId) {
    if (!userProfiles.has(userId)) {
        userProfiles.set(userId, {
            bio: 'Chưa thiết lập câu giới thiệu.',
            color: '#2B2D31',
            gif: DEFAULT_GIF,
            badge: '👑'
        });
    }
    return userProfiles.get(userId);
}

// 1. Cấu hình danh sách Slash Commands
const commandsData = [
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Xem trang thông tin cá nhân')
        .addUserOption(option => 
            option.setName('user')
                  .setDescription('Thành viên muốn xem profile (để trống nếu xem của bản thân)')
                  .setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('bio')
        .setDescription('Cập nhật tiểu sử cá nhân')
        .addStringOption(option => 
            option.setName('text')
                  .setDescription('Nội dung bio (tối đa 120 ký tự)')
                  .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('setcolor')
        .setDescription('Thay đổi màu viền profile (mã Hex, ví dụ: #ff7b9c)')
        .addStringOption(option => 
            option.setName('hex')
                  .setDescription('Mã màu Hex (Ví dụ: #FF0000)')
                  .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('setbadge')
        .setDescription('Thay đổi huy hiệu profile')
        .addStringOption(option => 
            option.setName('badge')
                  .setDescription('Nhập 1 Emoji hoặc gõ "reset" để đặt lại mặc định')
                  .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('setgif')
        .setDescription('Thay đổi ảnh/GIF hiển thị ở profile')
        .addStringOption(option => 
            option.setName('url')
                  .setDescription('Link ảnh/GIF (Hoặc gõ "reset" để đặt lại mặc định)')
                  .setRequired(true)
        )
].map(cmd => cmd.toJSON());

// 2. Hàm xử lý tương tác Interaction
async function handleProfileInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user, guild, options } = interaction;
    const userId = user.id;

    // --- /profile ---
    if (commandName === 'profile') {
        const targetUser = options.getUser('user') || user;
        const member = guild ? guild.members.cache.get(targetUser.id) : null;
        const profileData = getUserData(targetUser.id);

        const joinedServer = member && member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Chưa rõ';
        const createdAccount = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`;
        const topRole = (member && member.roles && member.roles.highest.name !== '@everyone') ? member.roles.highest : 'Thành viên';

        const validGif = (profileData.gif && typeof profileData.gif === 'string' && profileData.gif.startsWith('http')) ? profileData.gif : DEFAULT_GIF;

        const embed = new EmbedBuilder()
            .setColor(profileData.color || '#2B2D31')
            .setAuthor({ 
                name: `PROFILE • ${targetUser.displayName.toUpperCase()}`, 
                iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
            })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription(
                `### ${profileData.badge || '👑'} ${targetUser.displayName}\n` +
                `> 💬 *"${profileData.bio || 'Chưa thiết lập câu giới thiệu.'}"*\n\n` +
                `👑 **Chức danh:** ${topRole}\n` +
                `🗓️ **Tạo tài khoản:** ${createdAccount}\n` +
                `🏠 **Gia nhập Server:** ${joinedServer}`
            )
            .setImage(validGif)
            .setFooter({ 
                text: `Tự decor bằng: /bio • /setcolor • /setbadge • /setgif`, 
                iconURL: guild ? guild.iconURL({ dynamic: true }) : null 
            })
            .setTimestamp();

        return await interaction.reply({ embeds: [embed] });
    }

    // --- /bio ---
    if (commandName === 'bio') {
        const newBio = options.getString('text') || '';
        if (newBio.length > 120) {
            return await interaction.reply({ content: '⚠️ Bio không vượt quá 120 ký tự.', flags: MessageFlags.Ephemeral });
        }
        const data = getUserData(userId);
        data.bio = newBio;
        userProfiles.set(userId, data);
        return await interaction.reply({ content: '✨ **Đã cập nhật Bio thành công!**', flags: MessageFlags.Ephemeral });
    }

    // --- /setcolor ---
    if (commandName === 'setcolor') {
        const hexColor = options.getString('hex') || '';
        const hexRegex = /^#?([0-9A-F]{6})$/i;
        if (!hexRegex.test(hexColor)) {
            return await interaction.reply({ content: '❌ Mã Hex không hợp lệ! Ví dụ đúng: `#FF007F` hoặc `#00FFFF`', flags: MessageFlags.Ephemeral });
        }
        const formattedColor = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
        const data = getUserData(userId);
        data.color = formattedColor;
        userProfiles.set(userId, data);
        return await interaction.reply({ content: `🎨 **Đã đổi màu profile thành:** \`${formattedColor}\``, flags: MessageFlags.Ephemeral });
    }

    // --- /setbadge ---
    if (commandName === 'setbadge') {
        const badge = options.getString('badge') || '';
        const data = getUserData(userId);
        if (badge.toLowerCase() === 'reset') {
            data.badge = '👑';
            userProfiles.set(userId, data);
            return await interaction.reply({ content: '🔄 **Đã khôi phục huy hiệu mặc định.**', flags: MessageFlags.Ephemeral });
        }
        data.badge = badge;
        userProfiles.set(userId, data);
        return await interaction.reply({ content: `🏅 **Huy hiệu profile đổi thành:** ${badge}`, flags: MessageFlags.Ephemeral });
    }

    // --- /setgif ---
    if (commandName === 'setgif') {
        const url = options.getString('url') || '';
        const data = getUserData(userId);

        if (url.toLowerCase() === 'reset') {
            data.gif = DEFAULT_GIF;
            userProfiles.set(userId, data);
            return await interaction.reply({ content: '🔄 **Đã reset GIF về mặc định.**', flags: MessageFlags.Ephemeral });
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return await interaction.reply({ content: '❌ URL ảnh/GIF không hợp lệ! Vui lòng dán link bắt đầu bằng `http://` hoặc `https://`', flags: MessageFlags.Ephemeral });
        }

        data.gif = url;
        userProfiles.set(userId, data);
        return await interaction.reply({ content: '🖼️ **Đã cập nhật GIF thành công!**', flags: MessageFlags.Ephemeral });
    }
}

module.exports = {
    commandsData,
    handleInteraction: handleProfileInteraction,
    handleProfileInteraction
};