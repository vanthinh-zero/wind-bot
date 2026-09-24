const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const { setGuildChannel } = require('../utils/db');
const { COLORS, author, footer, serverBrand } = require('../utils/embedTheme');

const commandData = new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('Thiết kế cấu trúc server theo nhu cầu của bạn')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

const STYLES = {
    cozy: { label: 'Cozy và thân thiện', icon: '🌿', category: 'GÓC NHỎ CỦA WIND', chat: 'phong-tro-chuyen', welcome: 'chao-mung', goodbye: 'tam-biet' },
    gaming: { label: 'Gaming và giải trí', icon: '🎮', category: 'KHU VỰC GAME', chat: 'san-choi', welcome: 'welcome-gaming', goodbye: 'goodbye-gaming' },
    study: { label: 'Học tập và ôn thi', icon: '📚', category: 'GÓC HỌC TẬP', chat: 'phong-hoc-chung', welcome: 'chao-mung', goodbye: 'tam-biet' },
    creator: { label: 'Creator và Content', icon: '🎨', category: 'CREATOR STUDIO', chat: 'phong-y-tuong', welcome: 'don-tiep-khan-gia', goodbye: 'loi-chao-cuoi' },
    anime: { label: 'Anime và fandom', icon: '🌸', category: 'FANDOM LOUNGE', chat: 'phong-fandom', welcome: 'welcome-fandom', goodbye: 'goodbye-fandom' },
    business: { label: 'Cộng đồng chuyên nghiệp', icon: '💼', category: 'WORKSPACE', chat: 'general', welcome: 'announcements', goodbye: 'farewell' },
    music: { label: 'Âm nhạc và chill', icon: '🎧', category: 'CHILL STATION', chat: 'loi-bai-hat', welcome: 'on-air', goodbye: 'off-air' },
    social: { label: 'Giao lưu và kết nối', icon: '🫶', category: 'SOCIAL CLUB', chat: 'ket-noi', welcome: 'hello-room', goodbye: 'see-you-room' }
};

const FEATURES = {
    games: { label: 'Game / Cowcoin', description: 'Tài Xỉu, làm việc, ví tiền', channels: [['KHU VỰC GAME', 'taixiu', 'tai-xiu'], ['KHU VỰC GAME', 'work', 'viec-lam']] },
    pets: { label: 'Pet và thú cưng', description: 'Nuôi, mua, nâng cấp Pet', channels: [['KHU VỰC PET', 'pet', 'nuoi-thu-cung']] },
    study: { label: 'Học tập', description: 'Từ vựng và phòng ôn thi', channels: [['GÓC HỌC TẬP', 'vocabulary', 'tu-vung-moi-ngay'], ['GÓC HỌC TẬP', 'exam', 'phong-on-thi']] },
    ai: { label: 'AI Wind', description: 'Không gian trò chuyện với AI', channels: [['WIND AI', 'ai', 'wind-ai']] },
    voice: { label: 'Voice lounge', description: 'Phòng voice cộng đồng', channels: [['VOICE LOUNGE', 'voice', 'phong-voice'], ['VOICE LOUNGE', 'voiceChill', 'phong-chill']] },
    events: { label: 'Sự kiện và thông báo', description: 'Nơi đăng event, giveaway', channels: [['SỰ KIỆN', 'events', 'su-kien'], ['SỰ KIỆN', 'announcements', 'thong-bao']] },
    support: { label: 'Ticket hỗ trợ', description: 'Kênh hỗ trợ riêng tư', channels: [['HỖ TRỢ', 'ticket', 'ticket-ho-tro'], ['HỖ TRỢ', 'logs', 'nhat-ky-he-thong']] },
    rules: { label: 'Nội quy và hướng dẫn', description: 'Luật server, hướng dẫn thành viên', channels: [['THÔNG TIN', 'rules', 'noi-quy'], ['THÔNG TIN', 'guide', 'huong-dan']] },
    climate: { label: 'Khí hậu cộng đồng', description: 'Nhiệt độ và nhịp sống server', channels: [['WIND COMMUNITY', 'climate', 'khi-hau-cong-dong']] }
};

const MOTIFS = [
    { value: 'none', label: 'Không dùng họa tiết', description: 'Tên channel tối giản, sạch sẽ' },
    { value: '୨୧・', label: 'Ribbon mềm mại', description: 'Ví dụ: ୨୧・chao-mung' },
    { value: '✦・', label: 'Ngôi sao thanh lịch', description: 'Ví dụ: ✦・wind-ai' },
    { value: '𓆩♡𓆪・', label: 'Trái tim fantasy', description: 'Ví dụ: 𓆩♡𓆪・ket-noi' },
    { value: '「', label: 'Khung tối giản', description: 'Đóng khung tên channel bằng ngoặc' },
    { value: '⌁・', label: 'Sóng gió Wind', description: 'Ví dụ: ⌁・phong-tro-chuyen' },
    { value: '꒰ა・', label: 'Dreamy pastel', description: 'Ví dụ: ꒰ა・phong-chill' },
    { value: '⋆｡°✩・', label: 'Starlight', description: 'Ví dụ: ⋆｡°✩・thong-bao' },
    { value: '☾・', label: 'Moonlight', description: 'Ví dụ: ☾・phong-dem' },
    { value: '☼・', label: 'Sunshine', description: 'Ví dụ: ☼・san-choi' },
    { value: '❀・', label: 'Flower garden', description: 'Ví dụ: ❀・goc-hoc-tap' },
    { value: '𖥔・', label: 'Botanical', description: 'Ví dụ: 𖥔・phong-tro-chuyen' },
    { value: '⌞・', label: 'Modern corner', description: 'Ví dụ: ⌞・general' },
    { value: '▸・', label: 'Clean arrow', description: 'Ví dụ: ▸・rules' },
    { value: '⟡・', label: 'Crystal', description: 'Ví dụ: ⟡・premium' },
    { value: '♢・', label: 'Diamond', description: 'Ví dụ: ♢・su-kien' },
    { value: '♡・', label: 'Soft heart', description: 'Ví dụ: ♡・ket-noi' },
    { value: '☁・', label: 'Cloudy', description: 'Ví dụ: ☁・phong-chill' },
    { value: '☕・', label: 'Cafe', description: 'Ví dụ: ☕・tam-su' },
    { value: '🎮・', label: 'Gaming', description: 'Ví dụ: 🎮・tai-xiu' },
    { value: '🎧・', label: 'Music', description: 'Ví dụ: 🎧・am-nhac' },
    { value: '📚・', label: 'Study', description: 'Ví dụ: 📚・tu-vung' },
    { value: '🛡️・', label: 'Guardian', description: 'Ví dụ: 🛡️・ticket-ho-tro' },
    { value: '👑・', label: 'Royal premium', description: 'Ví dụ: 👑・wind-vip' }
];

const sessions = new Map();

function isAdmin(interaction) {
    return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

function selectRow(customId, placeholder, options, maxValues = 1) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .setMinValues(1)
            .setMaxValues(maxValues)
            .addOptions(options)
    );
}

function sessionKey(interaction) {
    return `${interaction.guild.id}:${interaction.user.id}`;
}

async function getOrCreateCategory(guild, name) {
    const existing = guild.channels.cache.find(channel => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === name.toLowerCase());
    return existing || guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Wind thiết kế server theo yêu cầu Admin' });
}

async function getOrCreateChannel(guild, name, parent, type = ChannelType.GuildText) {
    const existing = guild.channels.cache.find(channel => channel.type === type && channel.name === name && channel.parentId === parent.id);
    return existing || guild.channels.create({ name, type, parent: parent.id, reason: 'Wind thiết kế server theo yêu cầu Admin' });
}

function buildPlan(styleKey, featureKeys) {
    const style = STYLES[styleKey];
    const categories = new Map();
    const add = (categoryName, key, name, type = ChannelType.GuildText) => {
        if (!categories.has(categoryName)) categories.set(categoryName, []);
        categories.get(categoryName).push({ key, name, type });
    };

    add(style.category, 'chat', style.chat);
    add(style.category, 'welcome', style.welcome);
    add(style.category, 'goodbye', style.goodbye);
    for (const featureKey of featureKeys) {
        const feature = FEATURES[featureKey];
        if (!feature) continue;
        for (const [categoryName, key, name] of feature.channels) add(categoryName, key, name);
    }
    return categories;
}

async function handleServerSetup(interaction) {
    try {
        console.log(`[Setup] Nhận interaction: ${interaction.type} ${interaction.customId || interaction.commandName || 'unknown'}`);

    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-server') {
        if (!interaction.guild || !isAdmin(interaction)) return interaction.reply({ content: '❌ Chỉ Administrator mới có thể thiết kế server.', flags: MessageFlags.Ephemeral });
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.sky)
                .setAuthor(author('SERVER DESIGNER', serverBrand(interaction.guild)))
                .setTitle('✦ Thiết kế không gian của bạn')
                .setDescription('Wind sẽ hỏi bạn vài điều ngắn gọn, sau đó tự dựng cấu trúc phù hợp.\n\n**01 / 03  •  Chọn linh hồn của server**\n\nPhong cách này sẽ định hình category chính và cách đặt tên channel.')
                .setThumbnail(serverBrand(interaction.guild))
                .setFooter(footer('Bước 1 • Phong cách cộng đồng'))],
            components: [selectRow('wind_setup_style', 'Server của bạn mang phong cách nào?', Object.entries(STYLES).map(([value, item]) => ({ label: item.label, value, emoji: item.icon })))],
            flags: MessageFlags.Ephemeral
        });
    }

    if (!interaction.isStringSelectMenu() || !['wind_setup_style', 'wind_setup_features', 'wind_setup_motif'].includes(interaction.customId)) return false;
    if (!interaction.guild || !isAdmin(interaction)) return interaction.reply({ content: '❌ Chỉ Administrator mới có thể dùng wizard này.', flags: MessageFlags.Ephemeral });

    const key = sessionKey(interaction);
    if (interaction.customId === 'wind_setup_style') {
        sessions.set(key, { style: interaction.values[0] });
        return interaction.update({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.sun)
                .setAuthor(author('SERVER DESIGNER', serverBrand(interaction.guild)))
                .setTitle('✦ Chọn trải nghiệm cốt lõi')
                .setDescription('**02 / 03  •  Chọn những điều server thực sự cần**\n\nBạn có thể chọn nhiều mục. Wind chỉ tạo những khu vực bạn chọn.')
                .setFooter(footer('Bước 2 • Tính năng cộng đồng'))],
            components: [selectRow('wind_setup_features', 'Chọn tính năng muốn bật...', Object.entries(FEATURES).map(([value, item]) => ({ label: item.label, value, description: item.description })), 9)]
        });
    }

    if (interaction.customId === 'wind_setup_features') {
        const session = sessions.get(key);
        if (!session) return interaction.update({ content: '⌛ Phiên thiết kế đã hết hạn. Gõ lại `/setup-server`.', embeds: [], components: [] });
        session.features = interaction.values;
        sessions.set(key, session);
        return interaction.update({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.rose)
                .setAuthor(author('SERVER DESIGNER', serverBrand(interaction.guild)))
                .setTitle('✦ Chọn dấu ấn riêng')
                .setDescription('**03 / 03  •  Chọn họa tiết cho channel**\n\nHọa tiết sẽ được đặt trước tên để cấu trúc vẫn dễ đọc và có cá tính riêng.')
                .setFooter(footer('Bước 3 • Chữ ký thị giác'))],
            components: [selectRow('wind_setup_motif', 'Chọn họa tiết cho tên channel...', MOTIFS)]
        });
    }

    const session = sessions.get(key);
    if (!session) return interaction.update({ content: '⌛ Phiên thiết kế đã hết hạn. Gõ lại `/setup-server`.', embeds: [], components: [] });
    sessions.delete(key);
    await interaction.deferUpdate();
    const plan = buildPlan(session.style, session.features || []);
    const motif = interaction.values[0] === 'none' ? '' : interaction.values[0];
    const created = [];

    try {
        for (const [categoryName, channels] of plan) {
            const category = await getOrCreateCategory(interaction.guild, categoryName);
            for (const channelConfig of channels) {
                const decoratedName = motif === '「'
                    ? `「${channelConfig.name}」`
                    : motif ? `${motif}${channelConfig.name}` : channelConfig.name;
                const channel = await getOrCreateChannel(interaction.guild, decoratedName, category, channelConfig.type);
                if (channelConfig.type === ChannelType.GuildText) await setGuildChannel(interaction.guild.id, channelConfig.key, channel.id);
                created.push(`<#${channel.id}>`);
            }
        }
        const style = STYLES[session.style];
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.mint)
                .setAuthor(author('DESIGN COMPLETE', serverBrand(interaction.guild)))
                .setTitle('✦ Không gian đã sẵn sàng')
                .setDescription(`${style.icon} Phong cách: **${style.label}**\n\nWind đã dựng **${created.length} khu vực** theo lựa chọn của bạn.`)
                .addFields({ name: 'Cấu trúc đã tạo', value: created.join(' • ').slice(0, 1024) })
                .setThumbnail(serverBrand(interaction.guild))
                .setFooter(footer('Chạy lại /setup-server bất cứ lúc nào để bổ sung tính năng.'))],
            components: []
        });
    } catch (error) {
        console.error('[Setup] Không thể dựng cấu trúc server:', error);
        return interaction.editReply({ content: '❌ Wind chưa thể hoàn tất thiết kế. Kiểm tra quyền Manage Channels của bot.', embeds: [], components: [] });
    }
    } catch (error) {
        console.error('[Setup] Lỗi xử lý interaction:', error);
        const payload = { content: `❌ Setup server gặp lỗi: \`${error.message || 'Unknown error'}\``, embeds: [], components: [] };
        if (interaction.deferred || interaction.replied) return interaction.editReply(payload).catch(() => null);
        return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => null);
    }
}

module.exports = { commandData, handleServerSetup };
