const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require('discord.js');
const { db } = require('../utils/db');
const { getSettings, envOrSetting } = require('../utils/config');
const { COLORS, author, footer, serverBrand, statField } = require('../utils/embedTheme');

const settings = getSettings();
const BANK_ACCOUNT = envOrSetting('VIP_BANK_ACCOUNT', 'vip.bankAccount', '0866481829');
const BANK_NAME = envOrSetting('VIP_BANK_NAME', 'vip.bankName', 'Ngân hàng');
const ACCOUNT_NAME = envOrSetting('VIP_ACCOUNT_NAME', 'vip.accountName', 'Chưa cấu hình');

const PLANS = settings.vip?.plans || {};
const webhookAttempts = new Map();

const commandData = new SlashCommandBuilder()
    .setName('vip')
    .setDescription('Quản lý gói VIP Wind')
    .setDMPermission(false)
    .addSubcommand(subcommand => subcommand
        .setName('mua')
        .setDescription('Tạo đơn chuyển khoản để mở khóa VIP')
        .addStringOption(option => option
            .setName('loai')
            .setDescription('VIP cá nhân hoặc VIP server')
            .setRequired(true)
            .addChoices(
                { name: 'VIP cá nhân', value: 'user' },
                { name: 'VIP server', value: 'guild' }
            ))
        .addStringOption(option => option
            .setName('goi')
            .setDescription('Thời hạn VIP')
            .setRequired(true)
            .addChoices(
                { name: '3 ngày - 20.000đ', value: '3' },
                { name: '7 ngày - 50.000đ', value: '7' },
                { name: '30 ngày - 200.000đ', value: '30' }
            )))
    .addSubcommand(subcommand => subcommand
        .setName('trangthai')
        .setDescription('Xem trạng thái VIP cá nhân và server'))
    .addSubcommand(subcommand => subcommand
        .setName('dacquyen')
        .setDescription('Xem danh sách đặc quyền Premium'))
    .addSubcommand(subcommand => subcommand
        .setName('duyet')
        .setDescription('Admin xác nhận một giao dịch ngân hàng')
        .addStringOption(option => option
            .setName('ma_don')
            .setDescription('Mã đơn hàng cần xác nhận')
            .setRequired(true)))
    .addSubcommand(subcommand => subcommand
        .setName('huy')
        .setDescription('Admin hủy một đơn hàng đang chờ')
        .addStringOption(option => option
            .setName('ma_don')
            .setDescription('Mã đơn hàng cần hủy')
            .setRequired(true)));

function formatMoney(value) {
    return Number(value).toLocaleString('vi-VN');
}

function formatDate(timestamp) {
    return timestamp ? `<t:${Math.floor(timestamp / 1000)}:F>` : 'Chưa kích hoạt';
}

function createOrderId() {
    return `VIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function getVipKey(type, id) {
    return type === 'guild' ? `vip.guilds.${id}` : `vip.users.${id}`;
}

async function hasActiveVip(userId, guildId) {
    const now = Date.now();
    const userVip = userId ? await db.get(getVipKey('user', userId)) : null;
    const guildVip = guildId ? await db.get(getVipKey('guild', guildId)) : null;
    return Boolean(userVip?.expiresAt > now || guildVip?.expiresAt > now);
}

async function getPremiumStatus(userId, guildId) {
    const now = Date.now();
    const userVip = userId ? await db.get(getVipKey('user', userId)) : null;
    const guildVip = guildId ? await db.get(getVipKey('guild', guildId)) : null;
    const userActive = Boolean(userVip?.expiresAt > now);
    const guildActive = Boolean(guildVip?.expiresAt > now);

    return {
        active: userActive || guildActive,
        userActive,
        guildActive,
        userExpiresAt: userActive ? userVip.expiresAt : null,
        guildExpiresAt: guildActive ? guildVip.expiresAt : null,
        benefits: settings.vip?.benefits || {}
    };
}

function isAdmin(interaction) {
    return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
        || (process.env.ADMIN_ID && interaction.user.id === process.env.ADMIN_ID);
}

function hasValidWebhookSecret(req) {
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
    if (!configuredSecret) return false;

    const authorization = req.get('authorization') || '';
    const apiKey = req.get('x-api-key') || req.get('x-secret-key') || '';
    return authorization === configuredSecret
        || authorization === `Apikey ${configuredSecret}`
        || apiKey === configuredSecret;
}

function normalizePayment(payload) {
    return {
        content: String(payload?.content || payload?.description || payload?.transferContent || '').toUpperCase(),
        amount: Number(payload?.transferAmount ?? payload?.amount ?? 0),
        transactionId: String(payload?.id || payload?.referenceCode || payload?.transactionId || '')
    };
}

async function createVipRole(interaction, type, targetUserId) {
    if (!interaction.guild) return null;

    const targetMember = await interaction.guild.members.fetch(targetUserId);
    const roleName = type === 'guild' ? 'Wind VIP' : `Wind VIP | ${targetMember.user.username}`;
    let role = interaction.guild.roles.cache.find(existing => existing.name === roleName);
    if (!role) {
        role = await interaction.guild.roles.create({
            name: roleName,
            color: 0xD4AF37,
            reason: 'Kích hoạt Wind VIP đã được admin xác nhận'
        });
    }

    if (!targetMember.roles.cache.has(role.id)) await targetMember.roles.add(role);
    return role;
}

async function createVipChannel(interaction, role) {
    if (!interaction.guild || !role) return null;

    const existing = interaction.guild.channels.cache.find(channel =>
        channel.type === ChannelType.GuildText && channel.name === 'wind-vip'
    );
    if (existing) return existing;

    const permissionOverwrites = [
        {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        {
            id: role.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        }
    ];

    return interaction.guild.channels.create({
        name: 'wind-vip',
        type: ChannelType.GuildText,
        parent: envOrSetting('VIP_CATEGORY_ID', 'vip.categoryId') || undefined,
        permissionOverwrites,
        reason: 'Tạo kênh Wind VIP sau khi xác nhận thanh toán'
    });
}

async function handlePremiumInteraction(interaction) {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'vip') return false;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'mua') {
        const type = interaction.options.getString('loai', true);
        const planId = interaction.options.getString('goi', true);
        const plan = PLANS[planId];

        if (type === 'guild' && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Chỉ quản trị viên mới có thể mua VIP cho server.', ephemeral: true });
        }

        const orderId = createOrderId();
        await db.set(`vip.orders.${orderId}`, {
            id: orderId,
            type,
            planId,
            days: plan.days,
            amount: plan.price,
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            status: 'pending',
            createdAt: Date.now()
        });

        const embed = new EmbedBuilder()
            .setColor(COLORS.gold)
            .setAuthor(author('PREMIUM ACCESS', serverBrand(interaction.guild)))
            .setTitle('✦ Kích hoạt Wind Premium')
            .setDescription('Một bước chuyển khoản để mở khóa trải nghiệm nâng cao cho cá nhân hoặc server.')
            .addFields(
                statField('Loại VIP', type === 'guild' ? 'Server' : 'Cá nhân'),
                statField('Thời hạn', plan.label),
                statField('Số tiền', `${formatMoney(plan.price)}đ`),
                { name: 'Ngân hàng', value: BANK_NAME, inline: true },
                { name: 'Số tài khoản', value: BANK_ACCOUNT, inline: true },
                { name: 'Chủ tài khoản', value: ACCOUNT_NAME, inline: true },
                { name: 'Nội dung chuyển khoản', value: `\`\`${orderId}\`\`` }
            )
            .setFooter(footer('Giữ nguyên nội dung chuyển khoản để hệ thống tự động đối soát.'));

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'trangthai' || subcommand === 'dacquyen') {
        const status = await getPremiumStatus(interaction.user.id, interaction.guild.id);

        if (subcommand === 'dacquyen') {
            return interaction.reply({
                content: `👑 **WIND PREMIUM**\n\n` +
                    `🤖 **AI nâng cao:** dùng model **${status.benefits.aiModel}**, phản hồi chuyên sâu hơn.\n` +
                    `🐾 **Pet VIP độc quyền:** nhận Pet đặc biệt cấp **${status.benefits.exclusivePetLevel}** bằng \`!petvip\`.\n` +
                    `🎒 **Kho Pet mở rộng:** tối đa **${status.benefits.petInventoryLimit}** Pet.\n` +
                    `💰 **Thu nhập Pet VIP:** hệ số **x${status.benefits.petIncomeMultiplier}**.\n` +
                    `🍖 **Chăm Pet tốt hơn:** mỗi lần cho ăn được cộng thêm **${status.benefits.petFoodBonus}** thức ăn.\n` +
                    `🎨 **Role Premium riêng:** role màu vàng và quyền truy cập khu vực VIP.\n` +
                    `🏠 **VIP Server:** kênh riêng \`#wind-vip\` cho server.`,
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `👤 VIP cá nhân: **${status.userActive ? `đến ${formatDate(status.userExpiresAt)}` : 'Không hoạt động'}**\n` +
                `🏠 VIP server: **${status.guildActive ? `đến ${formatDate(status.guildExpiresAt)}` : 'Không hoạt động'}**\n\n` +
                `✨ Quyền lợi đang mở:\n` +
                `• AI nâng cao: **${status.benefits.aiModel}**\n` +
                `• Kho Pet tối đa: **${status.benefits.petInventoryLimit}**\n` +
                `• Pet VIP: **Cấp ${status.benefits.exclusivePetLevel}**\n` +
                `• Thu nhập Pet VIP: **x${status.benefits.petIncomeMultiplier}**\n` +
                `• Tặng thêm thức ăn: **+${status.benefits.petFoodBonus}**`,
            ephemeral: true
        });
    }

    if (!isAdmin(interaction)) {
        return interaction.reply({ content: '❌ Bạn cần quyền Administrator để xử lý đơn VIP.', ephemeral: true });
    }

    const orderId = interaction.options.getString('ma_don', true).trim().toUpperCase();
    const order = await db.get(`vip.orders.${orderId}`);
    if (!order) return interaction.reply({ content: '❌ Không tìm thấy mã đơn hàng.', ephemeral: true });
    if (order.status !== 'pending') return interaction.reply({ content: `❌ Đơn này đã ở trạng thái **${order.status}**.`, ephemeral: true });
    if (order.guildId !== interaction.guild.id) {
        return interaction.reply({ content: '❌ Đơn hàng này thuộc một server khác.', ephemeral: true });
    }

    if (subcommand === 'huy') {
        await db.set(`vip.orders.${orderId}.status`, 'cancelled');
        return interaction.reply({ content: `✅ Đã hủy đơn **${orderId}**.`, ephemeral: true });
    }

    const now = Date.now();
    const key = getVipKey(order.type, order.type === 'guild' ? order.guildId : order.userId);
    const current = await db.get(key);
    const startsAt = Math.max(now, current?.expiresAt || 0);
    const expiresAt = startsAt + order.days * 24 * 60 * 60 * 1000;
    await db.set(key, {
        type: order.type,
        ownerId: order.type === 'guild' ? order.guildId : order.userId,
        expiresAt,
        planId: order.planId,
        updatedAt: now,
        lastOrderId: orderId
    });

    let role = null;
    let channel = null;
    try {
        const roleOwnerId = order.type === 'guild' ? interaction.user.id : order.userId;
        role = await createVipRole(interaction, order.type, roleOwnerId);
        if (order.type === 'guild') channel = await createVipChannel(interaction, role);
    } catch (error) {
        console.error('[VIP] Không thể tạo role/kênh:', error);
        if (current) await db.set(key, current);
        else await db.delete(key);
        return interaction.reply({ content: '❌ Đã xác nhận dữ liệu nhưng không thể cấp quyền Discord. Kiểm tra quyền Manage Roles/Manage Channels rồi thử lại.', ephemeral: true });
    }

    await db.set(`vip.orders.${orderId}.status`, 'approved');
    await db.set(`vip.orders.${orderId}.approvedAt`, now);
    await db.set(`vip.orders.${orderId}.approvedBy`, interaction.user.id);

    return interaction.reply({
        content: `✅ Đã kích hoạt VIP **${order.days} ngày** cho ${order.type === 'guild' ? 'server' : `<@${order.userId}>`} đến ${formatDate(expiresAt)}.` +
            `${role ? ` Role: <@&${role.id}>.` : ''}${channel ? ` Kênh: <#${channel.id}>.` : ''}`,
        ephemeral: true
    });
}

async function approveOrder(orderId, client) {
    const order = await db.get(`vip.orders.${orderId}`);
    if (!order || order.status !== 'pending') return { ok: false, reason: 'not_pending' };

    const guild = await client.guilds.fetch(order.guildId).catch(() => null);
    if (!guild) return { ok: false, reason: 'guild_unavailable' };

    const now = Date.now();
    const key = getVipKey(order.type, order.type === 'guild' ? order.guildId : order.userId);
    const current = await db.get(key);
    const startsAt = Math.max(now, current?.expiresAt || 0);
    const expiresAt = startsAt + order.days * 24 * 60 * 60 * 1000;

    try {
        const targetUserId = order.type === 'guild' ? order.userId : order.userId;
        const member = await guild.members.fetch(targetUserId);
        const roleName = order.type === 'guild' ? 'Wind VIP' : `Wind VIP | ${member.user.username}`;
        let role = guild.roles.cache.find(existing => existing.name === roleName);
        if (!role) role = await guild.roles.create({ name: roleName, colors: { primary: 0xD4AF37 }, reason: 'SePay tự động kích hoạt Wind VIP' });
        if (!member.roles.cache.has(role.id)) await member.roles.add(role);

        let channel = null;
        if (order.type === 'guild') {
            channel = guild.channels.cache.find(item => item.type === ChannelType.GuildText && item.name === 'wind-vip');
            if (!channel) {
                channel = await guild.channels.create({
                    name: 'wind-vip',
                    type: ChannelType.GuildText,
                    parent: envOrSetting('VIP_CATEGORY_ID', 'vip.categoryId') || undefined,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                    ],
                    reason: 'SePay tự động tạo kênh Wind VIP'
                });
            }
        }

        await db.set(key, { type: order.type, ownerId: order.type === 'guild' ? order.guildId : order.userId, expiresAt, planId: order.planId, updatedAt: now, lastOrderId: orderId });
        await db.set(`vip.orders.${orderId}.status`, 'approved');
        await db.set(`vip.orders.${orderId}.approvedAt`, now);
        await db.set(`vip.orders.${orderId}.approvedBy`, 'sepay-webhook');

        await member.send(`✅ Giao dịch Wind VIP **${orderId}** đã được xác nhận tự động. VIP có hiệu lực đến <t:${Math.floor(expiresAt / 1000)}:F>.`).catch(() => {});
        return { ok: true, expiresAt, channelId: channel?.id || null };
    } catch (error) {
        console.error('[VIP] SePay không thể cấp quyền Discord:', error);
        if (current) await db.set(key, current);
        else await db.delete(key);
        return { ok: false, reason: 'discord_error' };
    }
}

async function expireVipEntries(client) {
    const now = Date.now();
    const [usersData, guildsData] = await Promise.all([
        db.get('vip.users'),
        db.get('vip.guilds')
    ]);
    const users = usersData && typeof usersData === 'object' ? usersData : {};
    const guilds = guildsData && typeof guildsData === 'object' ? guildsData : {};

    for (const [userId, vip] of Object.entries(users)) {
        if (!isVipExpired(vip, now) || vip.status === 'expired') continue;
        await db.set(`vip.users.${userId}.status`, 'expired');
        for (const guild of client.guilds.cache.values()) {
            const member = await guild.members.fetch(userId).catch(() => null);
            const role = member?.roles.cache.find(item => item.name === `Wind VIP | ${member.user.username}`);
            if (role) await member.roles.remove(role).catch(() => {});
        }
    }

    for (const [guildId, vip] of Object.entries(guilds)) {
        if (!isVipExpired(vip, now) || vip.status === 'expired') continue;
        await db.set(`vip.guilds.${guildId}.status`, 'expired');
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) continue;
        const role = guild.roles.cache.find(item => item.name === 'Wind VIP');
        if (role) await role.delete('Wind VIP hết hạn').catch(() => {});
        const channel = guild.channels.cache.find(item => item.type === ChannelType.GuildText && item.name === 'wind-vip');
        if (channel) await channel.delete('Kênh Wind VIP hết hạn').catch(() => {});
    }
}

function isVipExpired(vip, now = Date.now()) {
    return Boolean(vip?.expiresAt && vip.expiresAt <= now);
}

function startPremiumExpiryWatcher(client) {
    const interval = setInterval(() => {
        expireVipEntries(client).catch(error => console.error('[VIP] Lỗi thu hồi VIP hết hạn:', error));
    }, 5 * 60 * 1000);
    interval.unref?.();
    expireVipEntries(client).catch(error => console.error('[VIP] Lỗi kiểm tra VIP lúc khởi động:', error));
    return interval;
}

async function handleSepayWebhook(req, res, client) {
    if (!hasValidWebhookSecret(req)) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const sourceKey = req.ip || 'unknown';
    const now = Date.now();
    const recentAttempts = webhookAttempts.get(sourceKey) || [];
    const activeAttempts = recentAttempts.filter(timestamp => now - timestamp < 60 * 1000);
    if (activeAttempts.length >= 60) {
        webhookAttempts.set(sourceKey, activeAttempts);
        return res.status(429).json({ success: false, message: 'Too many requests' });
    }
    activeAttempts.push(now);
    webhookAttempts.set(sourceKey, activeAttempts);

    const payment = normalizePayment(req.body);
    if (!payment.content || !payment.transactionId || !Number.isFinite(payment.amount) || payment.amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment payload' });
    }

    const processedTransaction = await db.get(`vip.transactions.${payment.transactionId}`);
    if (processedTransaction) {
        return res.status(200).json({ success: true, matched: false, duplicate: true });
    }

    const orders = (await db.get('vip.orders')) || {};
    const order = Object.values(orders).find(item =>
        item?.status === 'pending' && payment.content.includes(String(item.id).toUpperCase()) && payment.amount === Number(item.amount)
    );
    if (!order) return res.status(200).json({ success: true, matched: false });

    const result = await approveOrder(order.id, client);
    if (result.ok) {
        await db.set(`vip.transactions.${payment.transactionId}`, {
            orderId: order.id,
            amount: payment.amount,
            processedAt: now
        });
    }
    return res.status(result.ok ? 200 : 409).json({ success: result.ok, orderId: order.id, reason: result.reason || null });
}

module.exports = { commandData, handlePremiumInteraction, hasActiveVip, getPremiumStatus, handleSepayWebhook, startPremiumExpiryWatcher, normalizePayment, isVipExpired };