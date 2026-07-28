const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const VIDEO_REGEX = /(https?:\/\/(?:www\.|vt\.|vm\.|t\.)?(?:tiktok\.com|instagram\.com|instagr\.am|youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|fb\.watch|reddit\.com)\/[^\s]+)/gi;

const PLATFORM_CONFIG = {
    tiktok: { name: 'TikTok', color: '#FF0050', icon: 'https://assets.stickpng.com/images/5ecec78673e2840004f5d87a.png', embedDomain: 'tnktok.com' },
    instagram: { name: 'Instagram', color: '#E1306C', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png', embedDomain: 'ddinstagram.com' },
    youtube: { name: 'YouTube', color: '#FF0000', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/1024px-YouTube_full-color_icon_%282017%29.svg.png', embedDomain: null },
    youtu: { name: 'YouTube', color: '#FF0000', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/1024px-YouTube_full-color_icon_%282017%29.svg.png', embedDomain: null },
    twitter: { name: 'X (Twitter)', color: '#1DA1F2', icon: 'https://abs.twimg.com/favicons/twitter.3.ico', embedDomain: 'fxtwitter.com' },
    x: { name: 'X (Twitter)', color: '#000000', icon: 'https://abs.twimg.com/favicons/twitter.3.ico', embedDomain: 'fixupx.com' },
    facebook: { name: 'Facebook', color: '#1877F2', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.token.png', embedDomain: null },
    reddit: { name: 'Reddit', color: '#FF4500', icon: 'https://www.redditstatic.com/shreddit/assets/favicon/192x192.png', embedDomain: 'rxddit.com' }
};

function detectPlatform(url) {
    const urlLower = url.toLowerCase();
    for (const key of Object.keys(PLATFORM_CONFIG)) {
        if (urlLower.includes(key)) {
            return { key, ...PLATFORM_CONFIG[key] };
        }
    }
    return { name: 'Media Video', color: '#00FF88', icon: null, embedDomain: null };
}

async function handleVideoLink(message) {
    if (message.author.bot) return false;

    const matches = message.content.match(VIDEO_REGEX);
    if (!matches || matches.length === 0) return false;

    const originalUrl = matches[0];
    const platform = detectPlatform(originalUrl);

    try {
        await message.channel.sendTyping();

        // 🎯 Tự động fix URL phát video cho TikTok (tnktok), Insta (ddinstagram), X (fxtwitter)
        let renderUrl = originalUrl;
        if (platform.embedDomain) {
            renderUrl = originalUrl
                .replace('tiktok.com', 'tnktok.com')
                .replace('vt.tiktok.com', 'vt.tnktok.com')
                .replace('instagram.com', 'ddinstagram.com')
                .replace('twitter.com', 'fxtwitter.com')
                .replace('x.com', 'fixupx.com')
                .replace('reddit.com', 'rxddit.com');
        }

        // Tạo Embed Card thông tin chuẩn
        const embed = new EmbedBuilder()
            .setColor(platform.color)
            .setAuthor({
                name: `Hệ Thống Nhận Diện Video (${platform.name})`,
                iconURL: platform.icon || undefined,
                url: originalUrl
            })
            .setTitle(`🎬 Xem Trực Tiếp Video ${platform.name}`)
            .setURL(originalUrl)
            .addFields(
                { name: '📌 Nền Tảng', value: `\`${platform.name}\``, inline: true },
                { name: '👤 Người Chia Sẻ', value: `<@${message.author.id}>`, inline: true },
                { name: '⚡ Trạng Thái', value: '`Đã xử lý`', inline: true }
            )
            .setFooter({ text: 'Multi-Platform Video System • ĐÀN BÒ BIẾT BAY', iconURL: platform.icon || undefined })
            .setTimestamp();

        // Nút bấm tiện ích
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(`Mở trên ${platform.name}`)
                .setStyle(ButtonStyle.Link)
                .setURL(originalUrl),
            new ButtonBuilder()
                .setLabel('Tải Video (Cobalt)')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://cobalt.tools/?url=${encodeURIComponent(originalUrl)}`)
        );

        // Xóa xem trước của tin nhắn gốc
        await message.suppressEmbeds(true).catch(() => null);

        // Gửi ĐÚNG 1 TIN NHẮN (Gồm Link + Embed + Button) để Discord tự hiện Video Player ở bên dưới
        await message.channel.send({
            content: `${renderUrl}`,
            embeds: [embed],
            components: [row]
        });

        return true;
    } catch (error) {
        console.error('❌ [Video Handler Error]:', error);
        return false;
    }
}

module.exports = { handleVideoLink };