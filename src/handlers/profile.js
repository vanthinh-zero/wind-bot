const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Trỏ thẳng ra file profiles.json ở thư mục gốc (wind-bot/profiles.json)
const dbPath = path.join(process.cwd(), 'profiles.json');

// GIF mặc định
const DEFAULT_GIF = 'https://media.discordapp.net/attachments/1528282202222235718/1528878087683706880/MOO_MOO_9.gif?ex=6a608eed&is=6a5f3d6d&hm=1ed4637eb577a1624a0d6d336fa3069836c6a77285de6fc4c6df4d91af18f581&=';

const DEFAULT_PROFILE = {
    title: 'HỒ SƠ THÀNH VIÊN',
    bio: 'Xin chào! Rất vui được làm quen với mọi người.',
    status: 'Đang hoạt động',
    color: '#2B2D31',
    media: DEFAULT_GIF,
    badge: '👑',
    footerText: 'Dùng các lệnh /set... để trang trí hồ sơ'
};

function readDatabase() {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, '{}', 'utf8');
            return {};
        }
        const raw = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (error) {
        console.error('Lỗi đọc profiles.json:', error);
        return {};
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        console.log('💾 [Profiles DB] Đã ghi dữ liệu thành công!');
    } catch (error) {
        console.error('Lỗi ghi vào profiles.json:', error);
    }
}

function getUserProfile(userId) {
    const db = readDatabase();
    if (!db[userId]) {
        db[userId] = { ...DEFAULT_PROFILE };
        writeDatabase(db);
    }
    return { ...DEFAULT_PROFILE, ...db[userId] };
}

function updateUserProfile(userId, key, value) {
    const db = readDatabase();
    if (!db[userId]) {
        db[userId] = { ...DEFAULT_PROFILE };
    }
    db[userId][key] = value;
    writeDatabase(db);
}

const commandsData = [
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Xem trang hồ sơ cá nhân')
        .addUserOption(option => 
            option.setName('user')
                  .setDescription('Chọn người muốn xem (để trống để xem bản thân)')
                  .setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('bio')
        .setDescription('Cập nhật câu giới thiệu cá nhân')
        .addStringOption(option => 
            option.setName('text')
                  .setDescription('Nội dung giới thiệu ngắn (tối đa 120 ký tự)')
                  .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Cập nhật dòng trạng thái')
        .addStringOption(option => 
            option.setName('text')
                  .setDescription('Ví dụ: Đang học bài, Đang tryhard...')
                  .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('settitle')
        .setDescription('Cập nhật tiêu đề góc trên cùng')
        .addStringOption(option => 
            option.setName('text')
                  .setDescription('Ví dụ: THÔNG TIN CÁ NHÂN, HỒ SƠ PRO... (Gõ "reset" để đặt lại)')
                  .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('setmedia')
        .setDescription('🎬 Cài link GIF hoặc Ảnh hiển thị bên dưới')
        .addStringOption(option => 
            option.setName('url')
                  .setDescription('Dán link GIF / Ảnh (Gõ "reset" để đặt lại)')
                  .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('setcolor')
        .setDescription('Thay đổi màu viền Profile (Mã Hex)')
        .addStringOption(option => 
            option.setName('hex')
                  .setDescription('Ví dụ: #FF69B4, #4A90E2, #2B2D31 (Gõ "reset" để đặt lại)')
                  .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('setbadge')
        .setDescription('Thay đổi biểu tượng huy hiệu cá nhân')
        .addStringOption(option => 
            option.setName('badge')
                  .setDescription('Nhập Emoji tùy chọn (Gõ "reset" để đặt lại)')
                  .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('setfooter')
        .setDescription('Thay đổi dòng ghi chú chân trang')
        .addStringOption(option => 
            option.setName('text')
                  .setDescription('Gõ chữ tùy chọn (Gõ "reset" để đặt lại)')
                  .setRequired(true)
        )
].map(cmd => cmd.toJSON());

async function handleProfileInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user, guild, options } = interaction;
    const userId = user.id;

    if (commandName === 'profile') {
        const targetUser = options.getUser('user') || user;
        const member = guild ? guild.members.cache.get(targetUser.id) : null;
        const profileData = getUserProfile(targetUser.id);

        const joinedTimestamp = member && member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
        const createdTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
        
        const joinedServer = joinedTimestamp ? `<t:${joinedTimestamp}:R>` : 'Chưa rõ';
        const createdAccount = `<t:${createdTimestamp}:R>`;

        const topRole = (member && member.roles && member.roles.highest.name !== '@everyone') 
            ? `${member.roles.highest}` 
            : 'Thành viên';

        const mediaUrl = profileData.media || DEFAULT_GIF;
        const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 512 });

        const embed = new EmbedBuilder()
            .setColor(profileData.color || '#2B2D31')
            .setAuthor({ 
                name: (profileData.title || 'HỒ SƠ THÀNH VIÊN').toUpperCase(), 
                iconURL: guild ? guild.iconURL({ dynamic: true }) : avatarUrl
            })
            .setThumbnail(avatarUrl)
            .setDescription(
                `### ${profileData.badge || '👑'} **${targetUser.displayName}**\n` +
                `> *"${profileData.bio || 'Chưa có lời giới thiệu.'}"*\n\n` +
                `────୨ৎ────────୨ৎ────────୨ৎ────────୨ৎ────`
            )
            .addFields(
                { name: '📌 Trạng thái', value: profileData.status || 'Đang hoạt động', inline: false },
                { name: '🏷️ Vai trò chính', value: topRole, inline: false },
                { name: '🗓️ Ngày tạo tài khoản', value: createdAccount, inline: true },
                { name: '🏠 Tham gia Server', value: joinedServer, inline: true }
            )
            .setImage(mediaUrl)
            .setFooter({ 
                text: profileData.footerText || 'Dùng các lệnh /set... để trang trí hồ sơ', 
                iconURL: avatarUrl
            })
            .setTimestamp();

        return await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'bio') {
        const newBio = options.getString('text') || '';
        if (newBio.length > 120) {
            return await interaction.reply({ content: '⚠️ Câu giới thiệu cần ngắn hơn 120 ký tự.', flags: MessageFlags.Ephemeral });
        }
        updateUserProfile(userId, 'bio', newBio);
        return await interaction.reply({ content: '✅ **Đã cập nhật câu giới thiệu thành công!**', flags: MessageFlags.Ephemeral });
    }

    if (commandName === 'status') {
        const newStatus = options.getString('text') || '';
        updateUserProfile(userId, 'status', newStatus);
        return await interaction.reply({ content: '✅ **Đã cập nhật trạng thái thành công!**', flags: MessageFlags.Ephemeral });
    }

    if (commandName === 'settitle') {
        const text = options.getString('text') || '';
        if (text.toLowerCase() === 'reset') {
            updateUserProfile(userId, 'title', DEFAULT_PROFILE.title);
            return await interaction.reply({ content: '🔄 **Đã đặt lại tiêu đề mặc định.**', flags: MessageFlags.Ephemeral });
        }
        updateUserProfile(userId, 'title', text);
        return await interaction.reply({ content: `✨ **Tiêu đề đã đổi thành:** \`${text}\``, flags: MessageFlags.Ephemeral });
    }

    if (commandName === 'setfooter') {
        const text = options.getString('text') || '';
        if (text.toLowerCase() === 'reset') {
            updateUserProfile(userId, 'footerText', DEFAULT_PROFILE.footerText);
            return await interaction.reply({ content: '🔄 **Đã đặt lại dòng dưới cùng mặc định.**', flags: MessageFlags.Ephemeral });
        }
        updateUserProfile(userId, 'footerText', text);
        return await interaction.reply({ content: `✨ **Dòng chữ dưới cùng đã đổi thành:** \`${text}\``, flags: MessageFlags.Ephemeral });
    }

    if (commandName === 'setcolor') {
        const hexInput = options.getString('hex') || '';
        if (hexInput.toLowerCase() === 'reset') {
            updateUserProfile(userId, 'color', DEFAULT_PROFILE.color);
            return await interaction.reply({ content: '🔄 **Đã đặt lại màu viền mặc định.**', flags: MessageFlags.Ephemeral });
        }
        const hexRegex = /^#?([0-9A-F]{6})$/i;
        if (!hexRegex.test(hexInput)) {
            return await interaction.reply({ content: '❌ Mã màu không đúng. Ví dụ: `#FF69B4`, `#4A90E2`, `#2B2D31`', flags: MessageFlags.Ephemeral });
        }
        const formattedColor = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
        updateUserProfile(userId, 'color', formattedColor);
        return await interaction.reply({ content: `🎨 **Đã đổi màu viền thành:** \`${formattedColor}\``, flags: MessageFlags.Ephemeral });
    }

    if (commandName === 'setbadge') {
        const badge = options.getString('badge') || '';
        if (badge.toLowerCase() === 'reset') {
            updateUserProfile(userId, 'badge', DEFAULT_PROFILE.badge);
            return await interaction.reply({ content: '🔄 **Đã đặt lại huy hiệu mặc định.**', flags: MessageFlags.Ephemeral });
        }
        updateUserProfile(userId, 'badge', badge);
        return await interaction.reply({ content: `🏅 **Huy hiệu đổi thành:** ${badge}`, flags: MessageFlags.Ephemeral });
    }

    if (commandName === 'setmedia') {
        const url = options.getString('url') || '';
        if (url.toLowerCase() === 'reset') {
            updateUserProfile(userId, 'media', DEFAULT_PROFILE.media);
            return await interaction.reply({ content: '🔄 **Đã khôi phục ảnh/GIF mặc định.**', flags: MessageFlags.Ephemeral });
        }
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return await interaction.reply({ content: '❌ Liên kết không hợp lệ.', flags: MessageFlags.Ephemeral });
        }
        updateUserProfile(userId, 'media', url);
        return await interaction.reply({ content: '🖼️ **Đã cập nhật ảnh/GIF cá nhân thành công!**', flags: MessageFlags.Ephemeral });
    }
}

module.exports = {
    commandsData,
    handleInteraction: handleProfileInteraction,
    handleProfileInteraction
};