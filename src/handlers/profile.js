const { EmbedBuilder } = require('discord.js');

const DEFAULT_GIF = 'https://media.discordapp.net/attachments/1508103127956455536/1528807367821492334/MOO_MOO_1.gif?ex=6a5fa450&is=6a5e52d0&hm=87f68fcc57e2bf0b0040d52d32b2343ebb421aa52396719057dad74b1311e8f3&=';

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

async function handleProfileCommand(message) {
    if (message.author.bot || !message.guild) return false;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- 1. LỆNH !bio ---
    if (command === '!bio') {
        const newBio = args.join(' ');
        if (!newBio) return message.reply('❌ Vui lòng nhập nội dung bio!');
        if (newBio.length > 120) return message.reply('⚠️ Bio không vượt quá 120 ký tự.');
        
        const data = getUserData(userId);
        data.bio = newBio;
        userProfiles.set(userId, data);
        return message.reply('✨ **Đã cập nhật Bio thành công!**');
    }

    // --- 2. LỆNH !setcolor ---
    if (command === '!setcolor') {
        const hexColor = args[0];
        const hexRegex = /^#?([0-9A-F]{6})$/i;
        if (!hexColor || !hexRegex.test(hexColor)) {
            return message.reply('❌ Nhập mã Hex! Ví dụ: `!setcolor #ff7b9c`');
        }
        const formattedColor = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
        const data = getUserData(userId);
        data.color = formattedColor;
        userProfiles.set(userId, data);
        return message.reply(`🎨 **Đã đổi màu profile thành:** \`${formattedColor}\``);
    }

    // --- 3. LỆNH !setbadge (HỖ TRỢ CẢ EMOJI CUSTOM / SERVER) ---
    if (command === '!setbadge') {
        const badge = args[0];
        if (!badge) return message.reply('❌ Chọn 1 emoji làm huy hiệu! (Hoặc `!setbadge reset` để về mặc định)');
        
        const data = getUserData(userId);
        if (badge.toLowerCase() === 'reset') {
            data.badge = '👑';
            userProfiles.set(userId, data);
            return message.reply('🔄 **Đã khôi phục huy hiệu mặc định.**');
        }

        data.badge = badge;
        userProfiles.set(userId, data);
        return message.reply(`🏅 **Huy hiệu profile của bạn đổi thành:** ${badge}`);
    }

    // --- 4. LỆNH !setgif ---
    if (command === '!setgif') {
        const url = args[0];
        if (!url) return message.reply('❌ Dán link GIF hoặc gõ `!setgif reset`');
        const data = getUserData(userId);
        if (url.toLowerCase() === 'reset') {
            data.gif = DEFAULT_GIF;
            userProfiles.set(userId, data);
            return message.reply('🔄 **Đã reset GIF về mặc định.**');
        }
        data.gif = url;
        userProfiles.set(userId, data);
        return message.reply('🖼️ **Đã cập nhật GIF thành công!**');
    }

    // --- 5. LỆNH !profile ---
    if (command === '!profile') {
        const target = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(target.id);
        const profileData = getUserData(target.id);

        const joinedServer = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Chưa rõ';
        const createdAccount = `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`;
        const topRole = member && member.roles.highest.name !== '@everyone' ? member.roles.highest : 'Thành viên';

        // EMBED 1 KHỐI DUY NHẤT - HIỂN THỊ EMOJI CHUẨN
        const singleEmbed = new EmbedBuilder()
            .setColor(profileData.color)
            .setAuthor({ 
                name: `PROFILE • ${target.displayName.toUpperCase()}`, 
                iconURL: target.displayAvatarURL({ dynamic: true }) 
            })
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription(
                `### ${profileData.badge} ${target.displayName}\n` +
                `> 💬 *"${profileData.bio}"*\n\n` +
                `👑 **Chức danh:** ${topRole}\n` +
                `🗓️ **Tạo tài khoản:** ${createdAccount}\n` +
                `🏠 **Gia nhập Server:** ${joinedServer}`
            )
            .setImage(profileData.gif)
            .setFooter({ 
                text: `Tự decor bằng: !bio • !setcolor • !setbadge • !setgif`, 
                iconURL: message.guild.iconURL({ dynamic: true }) 
            })
            .setTimestamp();

        await message.channel.send({ 
            embeds: [singleEmbed]
        });

        return true;
    }

    return false;
}

module.exports = { handleProfileCommand };