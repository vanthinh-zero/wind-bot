const COLORS = Object.freeze({
    sky: 0x78A9D8,
    mint: 0x7BC9A6,
    sun: 0xF2C879,
    rose: 0xD98282,
    gold: 0xD4AF37,
    night: 0x334155,
    ink: 0x263238,
    champagne: 0xE8C88A,
    plum: 0x5B3A57,
    sapphire: 0x3B82C4,
    emerald: 0x2F9B78,
    ruby: 0xB84A62,
    violet: 0x7561A8,
    pearl: 0xF4F1EA,
    danger: 0xB84A62
});

const BRAND = 'WIND COMMUNITY';

function author(name, iconURL) {
    return iconURL ? { name: `${BRAND}  •  ${name}`, iconURL } : { name: `${BRAND}  •  ${name}` };
}

function footer(text, iconURL) {
    return iconURL ? { text, iconURL } : { text };
}

function progressBar(value, size = 10) {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
    const filled = Math.round((safeValue / 100) * size);
    return `${'▰'.repeat(filled)}${'▱'.repeat(size - filled)}`;
}

function luxuryTitle(icon, title) {
    return `${icon}  ${title}`;
}

function resultFooter(text = 'WIND COMMUNITY • Crafted for your community') {
    return footer(text);
}

function serverBrand(guild) {
    return guild?.iconURL({ dynamic: true, size: 128 }) || undefined;
}

function statField(name, value, inline = true) {
    return { name, value: `**${value}**`, inline };
}

module.exports = { COLORS, BRAND, author, footer, progressBar, luxuryTitle, resultFooter, serverBrand, statField };
