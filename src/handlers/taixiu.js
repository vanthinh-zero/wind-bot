const { 
    EmbedBuilder, 
    AttachmentBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const db = require('../utils/db');
const { hasActiveVip, getPremiumStatus } = require('./premium');
const { getSettings } = require('../utils/config');

let createCanvas;
try {
    createCanvas = require('@napi-rs/canvas').createCanvas;
} catch (e) {
    try {
        createCanvas = require('canvas').createCanvas;
    } catch (err) {
        console.warn('⚠️ Chưa cài thư viện canvas. Vui lòng chạy: npm install @napi-rs/canvas');
    }
}

// Khởi tạo Gemini AI nếu có API Key
let aiClient = null;
try {
    const { GoogleGenAI } = require('@google/genai');
    const apiKey = process.env.GEMINI_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) aiClient = new GoogleGenAI({ apiKey: apiKey });
} catch (e) {
    // Không bắt buộc, có sẵn thuật toán TA Engine fallback
}

// ==========================================
// 1. ENGINE THỊ TRƯỜNG & SÓNG GIÁ SMC REAL-TIME
// ==========================================
const SPREAD_PERCENT = 0.0002;
const DEFAULT_FEE_RATE = 0.0005; // 0.05% cho member thường

const SMC_STRUCTURES = [
    'BOS H4 Bullish 🟢',
    'CHoCH 15m Bearish 🔴',
    'Order Block Mitigated 🛡️',
    'Fair Value Gap (FVG) Filled ⚡',
    'Liquidity Sweep Lows 🏹',
    'Bullish Continuation 📈',
    'Bearish Breakdown 📉',
    'Range Equilibrium (EQ) ⚖️'
];

// Cấu hình các cặp tiền tệ giao dịch
const MARKETS = {
    'BTC/cowcoin': {
        symbol: 'BTC/cowcoin',
        name: 'Bitcoin',
        price: 95420.50,
        high24h: 96800.00,
        low24h: 93900.00,
        change24h: 2.15,
        volatility: 85.0,
        structure: 'BOS H4 Bullish 🟢',
        candleHistory: [],
        currentCandle: { open: 95420.50, high: 95420.50, low: 95420.50, close: 95420.50, volume: 15400, ticks: 0 }
    },
    'ETH/cowcoin': {
        symbol: 'ETH/cowcoin',
        name: 'Ethereum',
        price: 3410.20,
        high24h: 3490.00,
        low24h: 3340.00,
        change24h: 1.45,
        volatility: 4.5,
        structure: 'Fair Value Gap Filled ⚡',
        candleHistory: [],
        currentCandle: { open: 3410.20, high: 3410.20, low: 3410.20, close: 3410.20, volume: 8200, ticks: 0 }
    },
    'SOL/cowcoin': {
        symbol: 'SOL/cowcoin',
        name: 'Solana',
        price: 218.75,
        high24h: 226.50,
        low24h: 209.10,
        change24h: 4.80,
        volatility: 0.85,
        structure: 'Bullish Continuation 📈',
        candleHistory: [],
        currentCandle: { open: 218.75, high: 218.75, low: 218.75, close: 218.75, volume: 12500, ticks: 0 }
    },
    'BNB/cowcoin': {
        symbol: 'BNB/cowcoin',
        name: 'BNB',
        price: 912.40,
        high24h: 935.00,
        low24h: 895.00,
        change24h: 1.25,
        volatility: 1.2,
        structure: 'Order Block Mitigated 🛡️',
        candleHistory: [],
        currentCandle: { open: 912.40, high: 912.40, low: 912.40, close: 912.40, volume: 5400, ticks: 0 }
    }
};

// Khởi tạo 30 nến quá khứ cho từng cặp
for (const [key, m] of Object.entries(MARKETS)) {
    let base = m.price * 0.97;
    for (let i = 0; i < 30; i++) {
        let open = base + (Math.random() - 0.48) * (m.volatility * 2.5);
        let close = open + (Math.random() - 0.47) * (m.volatility * 3.2);
        let high = Math.max(open, close) + Math.random() * (m.volatility * 1.5);
        let low = Math.min(open, close) - Math.random() * (m.volatility * 1.5);
        let volume = Math.floor(Math.random() * 8000) + 1000;
        m.candleHistory.push({ open, high, low, close, volume });
        base = close;
    }
    m.price = parseFloat(base.toFixed(2));
    m.currentCandle = { open: m.price, high: m.price, low: m.price, close: m.price, volume: 2000, ticks: 0 };
}

// In-Memory cache (đồng bộ SQLite database)
const userPositions = new Map(); // userId -> Position
const userSettings = new Map();  // userId -> { leverage, activeSymbol }
const activeDashboards = new Map(); // channelId -> { message, userId, guildId, symbol }

// Load positions từ SQLite khi khởi động
async function initPositionsFromDb() {
    try {
        const savedPositions = await db.db.get('trades.positions');
        if (savedPositions && typeof savedPositions === 'object') {
            for (const [uid, pos] of Object.entries(savedPositions)) {
                if (pos && pos.margin) {
                    userPositions.set(uid, pos);
                }
            }
            console.log(`✅ [Trade Engine] Đã tải ${userPositions.size} vị thế đang mở từ SQLite Database!`);
        }
    } catch (e) {
        console.error('Lỗi khi nạp vị thế từ Database:', e);
    }
}
initPositionsFromDb();

// Lưu vị thế vào database an toàn
async function persistUserPosition(userId, pos) {
    if (pos) {
        userPositions.set(userId, pos);
        await db.db.set(`trades.positions.${userId}`, pos);
    } else {
        userPositions.delete(userId);
        await db.db.delete(`trades.positions.${userId}`);
    }
}

// Cập nhật thống kê trader
async function recordTradeStats(userId, netPnL) {
    try {
        const stats = (await db.db.get(`trades.stats.${userId}`)) || {
            totalTrades: 0, wins: 0, losses: 0, totalPnL: 0, bestTrade: 0
        };
        stats.totalTrades++;
        if (netPnL >= 0) stats.wins++;
        else stats.losses++;
        stats.totalPnL = Math.round((stats.totalPnL || 0) + netPnL);
        if (netPnL > (stats.bestTrade || 0)) stats.bestTrade = netPnL;
        await db.db.set(`trades.stats.${userId}`, stats);
    } catch (e) {
        console.error('Lỗi ghi nhận thống kê trade:', e);
    }
}

function getMarket(symbol = 'BTC/cowcoin') {
    return MARKETS[symbol] || MARKETS['BTC/cowcoin'];
}

function getBidPrice(symbol = 'BTC/cowcoin') {
    const m = getMarket(symbol);
    return parseFloat((m.price * (1 - SPREAD_PERCENT)).toFixed(2));
}

function getAskPrice(symbol = 'BTC/cowcoin') {
    const m = getMarket(symbol);
    return parseFloat((m.price * (1 + SPREAD_PERCENT)).toFixed(2));
}

// ==========================================
// 2. THUẬT TOÁN PHÂN TÍCH KỸ THUẬT THỰC CHIẾN (TA & SMC ENGINE)
// ==========================================
function detectMarketStructure(candles, options = {}) {
    const source = Array.isArray(candles) ? candles.filter(Boolean) : [];
    const n = Math.max(1, Number(options.swingLength) || 2);
    if (source.length < n * 2 + 3) return { trend:'NEUTRAL', trendLabel:'Trung tính ⚖️', event:'NONE', eventLabel:'Chưa đủ dữ liệu', points:[], highs:[], lows:[], support:null, resistance:null, lastBreakPrice:null };
    const highs=[], lows=[];
    for(let i=n;i<source.length-n;i++){ let hi=true,lo=true; for(let j=1;j<=n;j++){ if(source[i].high<source[i-j].high||source[i].high<source[i+j].high)hi=false; if(source[i].low>source[i-j].low||source[i].low>source[i+j].low)lo=false; } if(hi)highs.push({index:i,price:source[i].high}); if(lo)lows.push({index:i,price:source[i].low}); }
    const rh=highs.slice(-4),rl=lows.slice(-4),h2=rh.slice(-2),l2=rl.slice(-2);
    let trend='NEUTRAL'; if(h2.length===2&&l2.length===2){ if(h2[1].price>h2[0].price&&l2[1].price>l2[0].price)trend='BULLISH'; else if(h2[1].price<h2[0].price&&l2[1].price<l2[0].price)trend='BEARISH'; else trend='RANGING'; }
    const close=source.at(-1).close,lastHigh=rh.at(-1),lastLow=rl.at(-1); let event='NONE',breakPrice=null;
    if(lastHigh&&close>lastHigh.price){event=trend==='BEARISH'?'CHOCH_BULLISH':'BOS_BULLISH';breakPrice=lastHigh.price;} else if(lastLow&&close<lastLow.price){event=trend==='BULLISH'?'CHOCH_BEARISH':'BOS_BEARISH';breakPrice=lastLow.price;}
    const points=[]; if(h2.length===2)points.push({type:h2[1].price>h2[0].price?'HH':'LH',...h2[1]}); if(l2.length===2)points.push({type:l2[1].price>l2[0].price?'HL':'LL',...l2[1]});
    const trendLabel={BULLISH:'Tăng 🟢',BEARISH:'Giảm 🔴',RANGING:'Đi ngang 🟡',NEUTRAL:'Trung tính ⚖️'}[trend];
    const eventLabel={BOS_BULLISH:'BOS Bullish 🟢',BOS_BEARISH:'BOS Bearish 🔴',CHOCH_BULLISH:'CHoCH Bullish ⚡',CHOCH_BEARISH:'CHoCH Bearish ⚡',NONE:'Chưa có break cấu trúc'}[event];
    return {trend,trendLabel,event,eventLabel,points:points.sort((a,b)=>a.index-b.index),highs:rh,lows:rl,support:lastLow?.price??null,resistance:lastHigh?.price??null,lastBreakPrice:breakPrice};
}

function getMarketStructure(symbol='BTC/cowcoin'){ const m=getMarket(symbol); return detectMarketStructure([...m.candleHistory,m.currentCandle],{swingLength:2}); }

const marketStructureCommandData = new SlashCommandBuilder().setName('ms').setDescription('Hiển thị Market Structure của thị trường giả lập')
    .addStringOption(o=>o.setName('symbol').setDescription('Cặp giao dịch').addChoices({name:'BTC / cowcoin',value:'BTC/cowcoin'},{name:'ETH / cowcoin',value:'ETH/cowcoin'},{name:'SOL / cowcoin',value:'SOL/cowcoin'},{name:'BNB / cowcoin',value:'BNB/cowcoin'}));

async function handleMarketStructureSlash(interaction){
    const symbol=interaction.options.getString('symbol')||'BTC/cowcoin',m=getMarket(symbol),ms=getMarketStructure(symbol);
    const fmt=v=>v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
    const point=p=>{const x=ms.points.find(v=>v.type===p);return x?fmt(x.price):'—';};
    const sequence=ms.points.length?ms.points.map(p=>p.type+' '+fmt(p.price)).join(' → '):'Chưa đủ swing';
    const embed=new EmbedBuilder().setTitle('📐 MARKET STRUCTURE • '+m.symbol).setDescription('Dữ liệu nến của Wind Trading Engine').addFields(
        {name:'Xu hướng',value:ms.trendLabel,inline:true},{name:'Cấu trúc',value:ms.eventLabel,inline:true},
        {name:'HH / HL',value:point('HH')+' / '+point('HL'),inline:true},{name:'LH / LL',value:point('LH')+' / '+point('LL'),inline:true},
        {name:'Support / Resistance',value:fmt(ms.support)+' / '+fmt(ms.resistance),inline:true},{name:'Swing gần nhất',value:sequence.slice(0,1024),inline:false}
    ).setFooter({text:'HH • HL • LH • LL • BOS • CHoCH'});
    return interaction.reply({embeds:[embed]});
}

function calculateRSI(candles, period = 14) {
    if (!candles || candles.length < period + 1) return 50.0;
    let gains = 0, losses = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
    }
    if (losses === 0) return 100.0;
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    return parseFloat((100 - (100 / (1 + rs))).toFixed(1));
}

function detectCandlePattern(c, prev = null) {
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    if (range === 0) return 'Doji ⚖️';

    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;

    // Doji
    if (body / range < 0.1) return 'Doji (Lưỡng lự thị trường) ⚖️';

    // Hammer / Pinbar Bullish (râu dưới dài gấp đôi thân, râu trên rất bé)
    if (lowerWick >= body * 1.8 && upperWick <= body * 0.5) return 'Hammer / Pinbar Bullish (Rút chân tăng) 🔨🟢';

    // Shooting Star / Pinbar Bearish (râu trên dài gấp đôi thân, râu dưới rất bé)
    if (upperWick >= body * 1.8 && lowerWick <= body * 0.5) return 'Shooting Star / Pinbar Bearish (Từ chối giá giảm) 🌠🔴';

    // Engulfing
    if (prev) {
        const prevBody = Math.abs(prev.close - prev.open);
        if (c.close > c.open && prev.close < prev.open && body > prevBody && c.close >= prev.open) {
            return 'Bullish Engulfing (Nhấn chìm tăng trưởng) 🟢🔥';
        }
        if (c.close < c.open && prev.close > prev.open && body > prevBody && c.close <= prev.open) {
            return 'Bearish Engulfing (Nhấn chìm giảm sâu) 🔴❄️';
        }
    }

    return c.close >= c.open ? 'Nến Xanh Tăng (Bullish Candle) 🟢' : 'Nến Đỏ Giảm (Bearish Candle) 🔴';
}

function analyzeMarketTechnical(symbol = 'BTC/cowcoin') {
    const m = getMarket(symbol);
    const allCandles = [...m.candleHistory, m.currentCandle];
    const rsi = calculateRSI(allCandles, 14);

    const len = allCandles.length;
    const ma7 = allCandles.slice(len - 7).reduce((acc, c) => acc + c.close, 0) / 7;
    const ma25 = allCandles.slice(len - 25).reduce((acc, c) => acc + c.close, 0) / 25;

    const lastCandle = allCandles[len - 1];
    const prevCandle = allCandles[len - 2];
    const pattern = detectCandlePattern(lastCandle, prevCandle);

    const prices = allCandles.slice(len - 15).map(c => c.close);
    const supportZone = Math.min(...allCandles.slice(len - 15).map(c => c.low));
    const resistanceZone = Math.max(...allCandles.slice(len - 15).map(c => c.high));

    let maCross = 'Trung tính ⚖️';
    if (ma7 > ma25) maCross = 'Golden Cross (MA7 > MA25) 🟢 Xu hướng Tăng';
    else if (ma7 < ma25) maCross = 'Death Cross (MA7 < MA25) 🔴 Xu hướng Giảm';

    let rsiStatus = 'Trung lập (40 - 60)';
    let signal = 'CHỜ TÍN HIỆU ⚖️';
    let suggestedEntry = m.price;
    let suggestedSL = parseFloat((m.price * 0.985).toFixed(2));
    let suggestedTP = parseFloat((m.price * 1.035).toFixed(2));
    let actionType = 'WAIT';

    if (rsi <= 35 || (pattern.includes('Hammer') || pattern.includes('Bullish Engulfing'))) {
        rsiStatus = `Quá bán Oversold (${rsi}) 🔥 Sắp hồi phục`;
        signal = '🟢 MUA / LONG (Tỉ lệ thắng cao)';
        actionType = 'LONG';
        suggestedEntry = parseFloat((m.price * 0.998).toFixed(2));
        suggestedSL = parseFloat((supportZone * 0.995).toFixed(2));
        suggestedTP = parseFloat((resistanceZone * 1.01).toFixed(2));
    } else if (rsi >= 65 || (pattern.includes('Shooting Star') || pattern.includes('Bearish Engulfing'))) {
        rsiStatus = `Quá mua Overbought (${rsi}) ❄️ Sắp điều chỉnh`;
        signal = '🔴 BÁN / SHORT (Tỉ lệ thắng cao)';
        actionType = 'SHORT';
        suggestedEntry = parseFloat((m.price * 1.002).toFixed(2));
        suggestedSL = parseFloat((resistanceZone * 1.005).toFixed(2));
        suggestedTP = parseFloat((supportZone * 0.99).toFixed(2));
    } else {
        if (ma7 > ma25) {
            signal = '🟢 Ưu tiên LONG theo xu hướng MA7';
            actionType = 'LONG';
            suggestedSL = parseFloat((m.price * 0.99).toFixed(2));
            suggestedTP = parseFloat((m.price * 1.025).toFixed(2));
        } else {
            signal = '🔴 Ưu tiên SHORT theo xu hướng MA25';
            actionType = 'SHORT';
            suggestedSL = parseFloat((m.price * 1.01).toFixed(2));
            suggestedTP = parseFloat((m.price * 0.975).toFixed(2));
        }
    }

    // Tính Risk:Reward ratio
    const risk = Math.abs(suggestedEntry - suggestedSL);
    const reward = Math.abs(suggestedTP - suggestedEntry);
    const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : '2.00';

    return {
        symbol,
        currentPrice: m.price,
        rsi,
        rsiStatus,
        ma7: parseFloat(ma7.toFixed(2)),
        ma25: parseFloat(ma25.toFixed(2)),
        maCross,
        pattern,
        supportZone: parseFloat(supportZone.toFixed(2)),
        resistanceZone: parseFloat(resistanceZone.toFixed(2)),
        structure: m.structure,
        signal,
        actionType,
        suggestedEntry,
        suggestedSL,
        suggestedTP,
        rrRatio
    };
}

// ==========================================
// 3. TÍNH TOÁN FUTURES, R:R & QUYỀN LỢI VIP
// ==========================================
function calculateLiquidationPrice(entryPrice, leverage, type) {
    const maintenanceMarginRatio = 0.9 / leverage;
    return type === 'BUY'
        ? parseFloat((entryPrice * (1 - maintenanceMarginRatio)).toFixed(2))
        : parseFloat((entryPrice * (1 + maintenanceMarginRatio)).toFixed(2));
}

function calculatePnL(pos, currentPrice, isVip = false) {
    const positionSize = pos.margin * pos.leverage;
    let priceDiff = pos.type === 'BUY' ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
    const rawPnL = (priceDiff / pos.entryPrice) * positionSize;
    
    // VIP miễn 100% phí giao dịch, thường chịu 0.05%
    const feeRate = isVip ? 0 : DEFAULT_FEE_RATE;
    const fee = positionSize * feeRate;

    let netPnL = Math.round(rawPnL - fee);

    // VIP nhận thêm +5% bonus khi có lãi
    if (isVip && netPnL > 0) {
        const bonus = Math.round(netPnL * 0.05);
        netPnL += bonus;
    }

    const roePercent = ((netPnL / pos.margin) * 100).toFixed(2);
    return { netPnL, roePercent, fee: Math.round(fee) };
}

function calculateRiskReward(entry, tp, sl) {
    if (!tp || !sl || !entry) return null;
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
}

// ==========================================
// 4. VẼ BIỂU ĐỒ NẾN CANVAS CHUẨN TRADINGVIEW / BINANCE
// ==========================================
async function generateCandlestickChart(symbol = 'BTC/cowcoin', userPos = null) {
    if (!createCanvas) return null;

    const m = getMarket(symbol);
    const width = 1200;
    const height = 675;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background Dark Theme chuẩn sàn quốc tế
    ctx.fillStyle = '#12151a';
    ctx.fillRect(0, 0, width, height);

    // Top Header Bar
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, width, 55);

    // Logo & Symbol
    ctx.fillStyle = '#f0b90b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('WIND EXCHANGE', 15, 35);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${m.symbol}`, 200, 35);

    // Giá hiện tại
    const isUp = m.change24h >= 0;
    ctx.fillStyle = isUp ? '#0ecb81' : '#f6465d';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`${m.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 350, 36);

    // Thống kê 24h
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#848e9c';
    ctx.fillText('24h Change', 490, 22);
    ctx.fillStyle = isUp ? '#0ecb81' : '#f6465d';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${isUp ? '+' : ''}${m.change24h}%`, 490, 41);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#848e9c';
    ctx.fillText('24h High', 600, 22);
    ctx.fillStyle = '#eaecef';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${m.high24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 600, 41);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#848e9c';
    ctx.fillText('24h Low', 710, 22);
    ctx.fillStyle = '#eaecef';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${m.low24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 710, 41);

    // Tag SMC Structure
    ctx.fillStyle = '#262930';
    ctx.fillRect(820, 15, 230, 28);
    ctx.fillStyle = '#f0b90b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`SMC: ${m.structure}`, 830, 33);

    // VIP Tag góc phải
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(1070, 15, 115, 28);
    ctx.fillRect(1070, 15, 115, 28);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('👑 VIP TRADER', 1080, 34);

    // Sổ lệnh (Order Book) bên trái
    const obX = 10, obY = 65, obW = 190;
    ctx.fillStyle = '#16191f';
    ctx.fillRect(obX, obY, obW, 595);

    ctx.fillStyle = '#848e9c';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Order Book (Depth)', obX + 10, obY + 22);

    // Asks (Đỏ - Bán)
    for (let i = 0; i < 11; i++) {
        let p = (m.price + (11 - i) * (m.volatility * 0.15)).toFixed(2);
        let amt = (Math.random() * 2 + 0.1).toFixed(3);
        let y = obY + 50 + i * 20;

        ctx.fillStyle = 'rgba(246, 70, 93, 0.18)';
        ctx.fillRect(obX + 5, y - 13, Math.random() * 160 + 20, 16);
        ctx.fillStyle = '#f6465d';
        ctx.font = '11px sans-serif';
        ctx.fillText(p, obX + 10, y);
        ctx.fillStyle = '#eaecef';
        ctx.fillText(amt, obX + 125, y);
    }

    // Giá giữa sổ lệnh
    ctx.fillStyle = isUp ? '#0ecb81' : '#f6465d';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${m.price.toFixed(2)} ${isUp ? '▲' : '▼'}`, obX + 10, obY + 290);

    // Bids (Xanh - Mua)
    for (let i = 0; i < 11; i++) {
        let p = (m.price - (i + 1) * (m.volatility * 0.15)).toFixed(2);
        let amt = (Math.random() * 2 + 0.1).toFixed(3);
        let y = obY + 310 + i * 20;

        ctx.fillStyle = 'rgba(14, 203, 129, 0.18)';
        ctx.fillRect(obX + 5, y - 13, Math.random() * 160 + 20, 16);
        ctx.fillStyle = '#0ecb81';
        ctx.font = '11px sans-serif';
        ctx.fillText(p, obX + 10, y);
        ctx.fillStyle = '#eaecef';
        ctx.fillText(amt, obX + 125, y);
    }

    // Khung biểu đồ trung tâm (Chart Center)
    const chartX = 210, chartY = 65, chartW = 750, chartH = 390;
    const volY = 465, volH = 195;

    ctx.fillStyle = '#14171d';
    ctx.fillRect(chartX, chartY, chartW, chartH + volH + 5);

    // Chỉ báo MA & RSI
    const allCandles = [...m.candleHistory, m.currentCandle];
    const rsiVal = calculateRSI(allCandles, 14);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#f0b90b';
    ctx.fillText(`MA(7): ${(m.price * 0.997).toFixed(2)}`, chartX + 15, chartY + 20);
    ctx.fillStyle = '#b37feb';
    ctx.fillText(`MA(25): ${(m.price * 0.991).toFixed(2)}`, chartX + 120, chartY + 20);
    ctx.fillStyle = rsiVal >= 70 ? '#f6465d' : (rsiVal <= 30 ? '#0ecb81' : '#13c2c2');
    ctx.fillText(`RSI(14): ${rsiVal}`, chartX + 230, chartY + 20);

    const prices = allCandles.flatMap(c => [c.high, c.low]);
    if (userPos && userPos.symbol === m.symbol) {
        prices.push(userPos.entryPrice, userPos.liqPrice);
        if (userPos.tpPrice) prices.push(userPos.tpPrice);
        if (userPos.slPrice) prices.push(userPos.slPrice);
    }

    let maxP = Math.max(...prices) + (m.volatility * 0.5);
    let minP = Math.min(...prices) - (m.volatility * 0.5);
    if (maxP === minP) { maxP += 10; minP -= 10; }

    const candleW = Math.floor((chartW - 70) / allCandles.length);

    // Lưới ngang (Grid lines) & Thang giá
    for (let i = 0; i < 6; i++) {
        let gridY = chartY + 30 + (chartH - 40) * (i / 5);
        let pLabel = (maxP - (maxP - minP) * (i / 5)).toFixed(2);

        ctx.strokeStyle = '#222731';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartX, gridY);
        ctx.lineTo(chartX + chartW - 65, gridY);
        ctx.stroke();

        ctx.fillStyle = '#848e9c';
        ctx.font = '10px sans-serif';
        ctx.fillText(pLabel, chartX + chartW - 60, gridY + 4);
    }

    // Vẽ từng cây nến và Volume
    let ma7Points = [];
    let ma25Points = [];

    allCandles.forEach((c, i) => {
        let x = chartX + 12 + i * candleW;
        let isCandleGreen = c.close >= c.open;
        let color = isCandleGreen ? '#0ecb81' : '#f6465d';

        let openY = chartY + 30 + ((maxP - c.open) / (maxP - minP)) * (chartH - 40);
        let closeY = chartY + 30 + ((maxP - c.close) / (maxP - minP)) * (chartH - 40);
        let highY = chartY + 30 + ((maxP - c.high) / (maxP - minP)) * (chartH - 40);
        let lowY = chartY + 30 + ((maxP - c.low) / (maxP - minP)) * (chartH - 40);

        // Râu nến
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + candleW / 2, highY);
        ctx.lineTo(x + candleW / 2, lowY);
        ctx.stroke();

        // Thân nến
        ctx.fillStyle = color;
        let topY = Math.min(openY, closeY);
        let bodyH = Math.max(Math.abs(closeY - openY), 2.5);
        ctx.fillRect(x + 1, topY, Math.max(candleW - 2, 2), bodyH);

        // Cột Volume
        let volBarH = Math.min(volH - 25, (c.volume / 20000) * (volH - 25));
        ctx.fillStyle = isCandleGreen ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)';
        ctx.fillRect(x + 1, volY + volH - volBarH - 5, Math.max(candleW - 2, 2), volBarH);

        // Điểm MA
        let midPriceY = (openY + closeY) / 2;
        ma7Points.push({ x: x + candleW / 2, y: midPriceY + (Math.sin(i * 0.3) * 6) });
        ma25Points.push({ x: x + candleW / 2, y: midPriceY + 12 + (Math.cos(i * 0.2) * 8) });
    });

    // Vẽ đường MA7 vàng
    ctx.strokeStyle = '#f0b90b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ma7Points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Vẽ đường MA25 tím
    ctx.strokeStyle = '#b37feb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ma25Points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // VẼ CÁC ĐƯỜNG VỊ THẾ NẾU CÓ (Entry, TP, SL, Liq)
    if (userPos && userPos.symbol === m.symbol) {
        const getY = (price) => chartY + 30 + ((maxP - price) / (maxP - minP)) * (chartH - 40);

        // 1. Entry Line
        const entryY = getY(userPos.entryPrice);
        if (entryY >= chartY && entryY <= chartY + chartH) {
            ctx.strokeStyle = '#1890ff';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(chartX, entryY);
            ctx.lineTo(chartX + chartW - 65, entryY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#1890ff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(`ENTRY: ${userPos.entryPrice}`, chartX + 15, entryY - 4);
        }

        // 2. Liquidation Line
        const liqY = getY(userPos.liqPrice);
        if (liqY >= chartY && liqY <= chartY + chartH) {
            ctx.strokeStyle = '#ff4d4f';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(chartX, liqY);
            ctx.lineTo(chartX + chartW - 65, liqY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#ff4d4f';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(`LIQ: ${userPos.liqPrice}`, chartX + 15, liqY - 4);
        }

        // 3. Take Profit Line
        if (userPos.tpPrice) {
            const tpY = getY(userPos.tpPrice);
            if (tpY >= chartY && tpY <= chartY + chartH) {
                ctx.strokeStyle = '#52c41a';
                ctx.setLineDash([3, 3]);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(chartX, tpY);
                ctx.lineTo(chartX + chartW - 65, tpY);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = '#52c41a';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText(`TP: ${userPos.tpPrice}`, chartX + 150, tpY - 4);
            }
        }

        // 4. Stop Loss Line
        if (userPos.slPrice) {
            const slY = getY(userPos.slPrice);
            if (slY >= chartY && slY <= chartY + chartH) {
                ctx.strokeStyle = '#faad14';
                ctx.setLineDash([3, 3]);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(chartX, slY);
                ctx.lineTo(chartX + chartW - 65, slY);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = '#faad14';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText(`SL: ${userPos.slPrice}`, chartX + 150, slY - 4);
            }
        }
    }

    // Market Trades (Lịch sử giao dịch) bên phải
    const rX = 970, rY = 65, rW = 220;
    ctx.fillStyle = '#16191f';
    ctx.fillRect(rX, rY, rW, 595);

    ctx.fillStyle = '#848e9c';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Market Trades (Live)', rX + 10, rY + 22);

    for (let i = 0; i < 23; i++) {
        let y = rY + 48 + i * 23;
        let isBuyTrade = i % 2 === 0;
        let p = (m.price + (Math.random() - 0.49) * (m.volatility * 0.1)).toFixed(2);
        let time = new Date().toTimeString().split(' ')[0];

        ctx.fillStyle = isBuyTrade ? '#0ecb81' : '#f6465d';
        ctx.font = '11px sans-serif';
        ctx.fillText(p, rX + 10, y);
        ctx.fillStyle = '#eaecef';
        ctx.fillText((Math.random() * 0.15 + 0.01).toFixed(3), rX + 85, y);
        ctx.fillStyle = '#848e9c';
        ctx.fillText(time, rX + 150, y);
    }

    return canvas.toBuffer('image/png');
}

// ==========================================
// 5. EMBED & DASHBOARD TRADING GIAO DIỆN CHUYÊN NGHIỆP
// ==========================================
async function buildDashboardPayload(userId = null, guildId = null, selectedSymbol = null) {
    const symbol = selectedSymbol || userSettings.get(userId)?.activeSymbol || 'BTC/cowcoin';
    const m = getMarket(symbol);
    const pos = userId ? userPositions.get(userId) : null;
    const isVip = userId ? await hasActiveVip(userId, guildId) : false;

    const chartBuffer = await generateCandlestickChart(symbol, pos);
    const files = chartBuffer ? [new AttachmentBuilder(chartBuffer, { name: 'wind_futures_chart.png' })] : [];

    const defaultLev = isVip ? 20 : 10;
    const userLev = userId ? (userSettings.get(userId)?.leverage || defaultLev) : defaultLev;
    const maxAllowedLev = isVip ? 125 : 50;

    let positionDetail = '';
    let pnlColor = isVip ? '#ffd700' : '#f0b90b';

    if (pos) {
        const currentPrice = pos.type === 'BUY' ? getBidPrice(pos.symbol) : getAskPrice(pos.symbol);
        const { netPnL, roePercent, fee } = calculatePnL(pos, currentPrice, isVip);
        const pnlSign = netPnL >= 0 ? '+' : '';
        const pnlEmoji = netPnL >= 0 ? '🟢' : '🔴';
        pnlColor = netPnL >= 0 ? '#0ecb81' : '#f6465d';

        const tpText = pos.tpPrice ? `**${pos.tpPrice}**` : '*Chưa đặt*';
        const slText = pos.slPrice ? `**${pos.slPrice}**` : '*Chưa đặt*';
        const rr = calculateRiskReward(pos.entryPrice, pos.tpPrice, pos.slPrice);
        const rrText = rr ? ` | R:R: **1:${rr}**` : '';

        positionDetail = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📊 **VỊ THẾ ĐANG MỞ:** ${pos.type === 'BUY' ? '🟢 **LONG (MUA)**' : '🔴 **SHORT (BÁN)**'} [${pos.symbol}] **x${pos.leverage}** ${isVip ? '👑 *(VIP)*' : ''}\n` +
            `• Ký Quỹ: **${pos.margin.toLocaleString()} cowcoin** | Quy Mô: **${(pos.margin * pos.leverage).toLocaleString()} cowcoin**\n` +
            `• Giá Vào (Entry): **${pos.entryPrice.toLocaleString()}** | Giá Hiện Tại: **${currentPrice.toLocaleString()}**\n` +
            `• PnL Tạm Tính: ${pnlEmoji} **${pnlSign}${netPnL.toLocaleString()} cowcoin (${pnlSign}${roePercent}%)**\n` +
            `• Giá Cháy (Liq): ☠️ **${pos.liqPrice.toLocaleString()}** | Phí Sàn: **${fee === 0 ? '0 cowcoin (Miễn phí VIP 👑)' : `${fee.toLocaleString()} cowcoin`}**\n` +
            `• Chốt Lời (TP): ${tpText} | Cắt Lỗ (SL): ${slText}${rrText}`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`⚡ SÀN GIAO DỊCH PHÁI SINH WIND • ${m.symbol}`)
        .setColor(pnlColor)
        .setDescription(
            `💰 **Giá Khớp:** **${m.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} cowcoin** (${m.change24h >= 0 ? '+' : ''}${m.change24h}%)\n` +
            `📈 **Cấu Trúc Sóng SMC:** \`${m.structure}\`\n` +
            `⚡ **Đòn Bẩy Cài Đặt:** **x${userLev}** *(Tối đa: x${maxAllowedLev}${isVip ? ' - VIP Tối Thượng' : ''})*\n` +
            `👑 **Đặc Quyền VIP:** ${isVip ? '🟢 **Đang Kích Hoạt** (0% Phí, Max x125, Bảo hiểm 10%, +5% Lãi)' : '⚪ **Chưa Kích Hoạt** (Dùng `/vip mua`)'}\n` +
            `🤖 **Trợ Lý A.I:** Gõ \`!ptkt\` hoặc \`!signal\` để được cố vấn chiến lược` +
            positionDetail
        )
        .setFooter({ text: 'Wind Exchange • Dùng !helptrade để xem cẩm nang giao dịch • Bấm nút bên dưới để trade!' })
        .setTimestamp();

    if (files.length > 0) {
        embed.setImage('attachment://wind_futures_chart.png');
    }

    // Row 1: Chọn Cặp Giao Dịch
    const pairSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('trade_select_pair')
            .setPlaceholder(`Chuyển cặp tài sản (Đang xem: ${m.symbol})`)
            .addOptions(
                { label: 'BTC/cowcoin (Bitcoin)', value: 'BTC/cowcoin', description: `Giá: ${MARKETS['BTC/cowcoin'].price.toFixed(2)} | Vua thị trường`, emoji: '🪙' },
                { label: 'ETH/cowcoin (Ethereum)', value: 'ETH/cowcoin', description: `Giá: ${MARKETS['ETH/cowcoin'].price.toFixed(2)} | Smart Contract`, emoji: '🔷' },
                { label: 'SOL/cowcoin (Solana)', value: 'SOL/cowcoin', description: `Giá: ${MARKETS['SOL/cowcoin'].price.toFixed(2)} | Tốc độ cao`, emoji: '🟣' },
                { label: 'BNB/cowcoin (Binance Coin)', value: 'BNB/cowcoin', description: `Giá: ${MARKETS['BNB/cowcoin'].price.toFixed(2)} | Sàn Wind Native`, emoji: '🟡' }
            )
    );

    // Row 2: Nút Giao Dịch Nhanh
    const tradeButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_trade_buy').setLabel('MUA / LONG').setStyle(ButtonStyle.Success).setEmoji('🟢'),
        new ButtonBuilder().setCustomId('btn_trade_sell').setLabel('BÁN / SHORT').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
        new ButtonBuilder().setCustomId('btn_trade_close').setLabel('ĐÓNG VỊ THẾ').setStyle(ButtonStyle.Secondary).setEmoji('🛑'),
        new ButtonBuilder().setCustomId('btn_trade_tpsl').setLabel('CÀI TP / SL').setStyle(ButtonStyle.Secondary).setEmoji('🎯'),
        new ButtonBuilder().setCustomId('btn_trade_ai').setLabel('TRỢ LÝ A.I').setStyle(ButtonStyle.Primary).setEmoji('🤖')
    );

    return { embeds: [embed], files, components: [pairSelect, tradeButtons] };
}

// ==========================================
// 6. ENGINE SÓNG GIÁ KẾT HỢP QUY LUẬT KỸ THUẬT (TA-DRIVEN MARKET)
// ==========================================
const tradeInterval = setInterval(async () => {
    // 1. Biến động giá từng cặp có tính xác suất kỹ thuật (RSI & Support/Resistance)
    for (const [key, m] of Object.entries(MARKETS)) {
        const allCandles = [...m.candleHistory, m.currentCandle];
        const rsi = calculateRSI(allCandles, 14);

        // Thiên hướng phục hồi khi RSI quá bán (<30) và điều chỉnh khi RSI quá mua (>70)
        let bias = 0;
        if (rsi <= 30) bias = 0.12; // Áp lực phe mua tăng
        else if (rsi >= 70) bias = -0.12; // Áp lực chốt lời tăng

        const trendFactor = (Math.random() - 0.493) + bias;
        const change = trendFactor * m.volatility;
        m.price = parseFloat(Math.max(1, m.price + change).toFixed(2));
        m.change24h = parseFloat((m.change24h + (change * 0.012)).toFixed(2));

        if (m.price > m.high24h) m.high24h = m.price;
        if (m.price < m.low24h) m.low24h = m.price;

        m.currentCandle.high = Math.max(m.currentCandle.high, m.price);
        m.currentCandle.low = Math.min(m.currentCandle.low, m.price);
        m.currentCandle.close = m.price;
        m.currentCandle.volume += Math.floor(Math.random() * 250);
        m.currentCandle.ticks++;

        // Đổi cấu trúc SMC ngẫu nhiên theo sóng
        if (Math.random() < 0.05) {
            m.structure = SMC_STRUCTURES[Math.floor(Math.random() * SMC_STRUCTURES.length)];
        }

        if (m.currentCandle.ticks >= 3) {
            m.candleHistory.push({ ...m.currentCandle });
            if (m.candleHistory.length > 30) m.candleHistory.shift();
            m.currentCandle = { open: m.price, high: m.price, low: m.price, close: m.price, volume: 500, ticks: 0 };
        }
    }

    // 2. Tự động kiểm tra TP/SL và Thanh lý (Margin Call)
    await processAutomatedPositions();

    // 3. Tự động refresh các dashboard đang hiển thị trong channel
    for (const [channelId, config] of activeDashboards.entries()) {
        try {
            const payload = await buildDashboardPayload(config.userId, config.guildId, config.symbol);
            await config.message.edit(payload);
        } catch (err) {
            activeDashboards.delete(channelId);
        }
    }
}, 10000);
tradeInterval.unref?.();

// Xử lý tự động đóng lệnh khi chạm TP/SL/Cháy
async function processAutomatedPositions() {
    for (const [userId, pos] of userPositions.entries()) {
        const m = getMarket(pos.symbol);
        const isVip = await hasActiveVip(userId, pos.guildId);
        const currentPrice = pos.type === 'BUY' ? getBidPrice(pos.symbol) : getAskPrice(pos.symbol);
        const { netPnL, roePercent } = calculatePnL(pos, currentPrice, isVip);

        // TH1: Cháy lệnh (Liquidation)
        const isLiquidated = (pos.type === 'BUY' && currentPrice <= pos.liqPrice) ||
                             (pos.type === 'SELL' && currentPrice >= pos.liqPrice);

        if (isLiquidated) {
            await persistUserPosition(userId, null);
            await recordTradeStats(userId, -pos.margin);

            // Bảo hiểm VIP hoàn 10% tiền ký quỹ
            let insuranceRefund = 0;
            if (isVip) {
                insuranceRefund = Math.round(pos.margin * 0.10);
                if (insuranceRefund > 0) {
                    await db.addGuildMoney(pos.guildId, userId, insuranceRefund);
                }
            }

            console.log(`☠️ [Liquidation] Vị thế ${pos.type} của ${userId} bị thanh lý tại ${currentPrice}. Bảo hiểm VIP hoàn: ${insuranceRefund}`);
            continue;
        }

        // TH2: Chốt Lời (Take Profit)
        const isTakeProfit = pos.tpPrice && (
            (pos.type === 'BUY' && currentPrice >= pos.tpPrice) ||
            (pos.type === 'SELL' && currentPrice <= pos.tpPrice)
        );

        if (isTakeProfit) {
            await persistUserPosition(userId, null);
            const totalReturn = Math.max(0, pos.margin + netPnL);
            if (totalReturn > 0) await db.addGuildMoney(pos.guildId, userId, totalReturn);
            await recordTradeStats(userId, netPnL);
            console.log(`🎯 [Take Profit] Vị thế ${pos.type} của ${userId} tự động chốt lời tại ${currentPrice}. PnL: +${netPnL}`);
            continue;
        }

        // TH3: Cắt Lỗ (Stop Loss)
        const isStopLoss = pos.slPrice && (
            (pos.type === 'BUY' && currentPrice <= pos.slPrice) ||
            (pos.type === 'SELL' && currentPrice >= pos.slPrice)
        );

        if (isStopLoss) {
            await persistUserPosition(userId, null);
            const totalReturn = Math.max(0, pos.margin + netPnL);
            if (totalReturn > 0) await db.addGuildMoney(pos.guildId, userId, totalReturn);
            await recordTradeStats(userId, netPnL);
            console.log(`🛑 [Stop Loss] Vị thế ${pos.type} của ${userId} tự động cắt lỗ tại ${currentPrice}. PnL: ${netPnL}`);
            continue;
        }
    }
}

// ==========================================
// 7. TRỢ LÝ A.I PHÂN TÍCH KỸ THUẬT & HƯỚNG DẪN CHIẾN LƯỢC
// ==========================================
async function generateAiTradeAnalysis(symbol = 'BTC/cowcoin', userBalance = 0) {
    const ta = analyzeMarketTechnical(symbol);

    let aiInsight = '';
    if (aiClient) {
        try {
            const prompt = `Bạn là một Cố Vấn & Trợ Lý Giao Dịch Chuyên Nghiệp (AI Trading Coach) của sàn Wind Exchange.
Dưới đây là dữ liệu kỹ thuật thực tế của cặp ${symbol}:
- Giá hiện tại: ${ta.currentPrice} cowcoin
- Chỉ số RSI(14): ${ta.rsi} (${ta.rsiStatus})
- MA7: ${ta.ma7} | MA25: ${ta.ma25} (${ta.maCross})
- Mô hình nến gần nhất: ${ta.pattern}
- Vùng Hỗ Trợ (Support / Demand): ${ta.supportZone}
- Vùng Kháng Cự (Resistance / Supply): ${ta.resistanceZone}
- Cấu trúc SMC: ${ta.structure}
- Tín hiệu kỹ thuật: ${ta.signal}
- Tỉ lệ Risk:Reward gợi ý: 1:${ta.rrRatio}

Hãy đưa ra lời khuyên phân tích kỹ thuật súc tích (3-4 câu), phong cách chuyên nghiệp như một trader thực chiến, giải thích ngắn gọn tại sao nên vào lệnh hoặc chờ đợi, và nhắc nhở kỷ luật quản lý vốn.`;

            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            aiInsight = response.text?.trim() || '';
        } catch (e) {
            // Dùng thuật toán tự động nếu API lỗi
        }
    }

    if (!aiInsight) {
        if (ta.actionType === 'LONG') {
            aiInsight = `Thị trường đang xuất hiện phản ứng giá tại vùng Demand quanh **${ta.supportZone}**. Chỉ số RSI đạt **${ta.rsi}**, cho thấy đà giảm đang suy yếu rõ rệt. Nến xuất hiện dạng **${ta.pattern}** mở ra cơ hội Long ngắn hạn với tỷ lệ R:R thuận lợi **1:${ta.rrRatio}**. Hãy kiên nhẫn đợi nến đóng trên vùng Entry trước khi giải ngân.`;
        } else if (ta.actionType === 'SHORT') {
            aiInsight = `Giá đang tiếp cận vùng Kháng cự Supply quanh **${ta.resistanceZone}**. Chỉ báo RSI ở ngưỡng **${ta.rsi}**, cảnh báo áp lực mua đã cạn kiệt và sắp có nhịp thoái lui. Tín hiệu **${ta.pattern}** ủng hộ phe Gấu. Khuyến nghị canh Short hồi phục với mục tiêu về lại đáy cũ, luôn tuân thủ dừng lỗ bảo vệ vốn.`;
        } else {
            aiInsight = `Thị trường đang dao động trong vùng cân bằng (Equilibrium) giữa **${ta.supportZone}** và **${ta.resistanceZone}**. Các đường trung bình MA đang đi ngang, chưa hình thành xu hướng bứt phá rõ rệt. Khuyến nghị kiên nhẫn đứng ngoài quan sát hoặc chỉ scalping với khối lượng cực nhỏ (2-3% vốn).`;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`🤖 TRỢ LÝ A.I PHÂN TÍCH KỸ THUẬT • ${symbol}`)
        .setColor(ta.actionType === 'LONG' ? '#0ecb81' : (ta.actionType === 'SHORT' ? '#f6465d' : '#faad14'))
        .setDescription(
            `📊 **TỔNG QUAN THỊ TRƯỜNG**\n` +
            `• Giá Khớp Hiện Tại: **${ta.currentPrice.toLocaleString()} cowcoin**\n` +
            `• Xu Hướng SMC: \`${ta.structure}\`\n` +
            `• Chỉ Số RSI(14): **${ta.rsi}** — *${ta.rsiStatus}*\n` +
            `• Tín Hiệu Nến: **${ta.pattern}**\n` +
            `• Tín Hiệu MA: **${ta.maCross}**\n\n` +
            `🎯 **KẾ HOẠCH GIAO DỊCH GỢI Ý (TRADING PLAN)**\n` +
            `• Khuyến Nghị Hành Động: **${ta.signal}**\n` +
            `• Vùng Entry Đẹp: **${ta.suggestedEntry.toLocaleString()} cowcoin**\n` +
            `• Cắt Lỗ (Stop Loss): **${ta.suggestedSL.toLocaleString()} cowcoin** *(Vùng cản an toàn)*\n` +
            `• Chốt Lời (Take Profit): **${ta.suggestedTP.toLocaleString()} cowcoin**\n` +
            `• Tỉ Lệ Risk : Reward (R:R): ⚖️ **1 : ${ta.rrRatio}** *(Chấp nhận rủi ro 1 để đổi lấy ${ta.rrRatio})*\n\n` +
            `💡 **CỐ VẤN TỪ TRỢ LÝ A.I:**\n` +
            `> *${aiInsight}*\n\n` +
            `⚠️ **LƯU Ý:** *Mọi quyết định giao dịch và rủi ro tài chính đều do bạn tự đưa ra và chịu trách nhiệm. A.I chỉ đóng vai trò trợ lý hỗ trợ phân tích dữ liệu kỹ thuật và đưa ra góc nhìn tham khảo.*`
        )
        .setFooter({ text: 'Dùng !long hoặc !short để vào lệnh theo kế hoạch | !helptrade để xem cẩm nang' });

    return embed;
}

// ==========================================
// 8. CẨM NANG HƯỚNG DẪN TRADER: !helptrade
// ==========================================
function getTradeHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('📘 CẨM NANG TOÀN TẬP CHO TRADER • WIND EXCHANGE')
        .setColor('#f0b90b')
        .setDescription(
            `Chào mừng bạn đến với sàn giao dịch phái sinh Wind! Đây là hướng dẫn đầy đủ từ cơ bản đến nâng cao để bạn làm chủ thị trường và kiếm thật nhiều Cowcoin.`
        )
        .addFields(
            {
                name: '⚡ 1. Các Lệnh Giao Dịch Nhanh',
                value: 
                    `• \`!trade [cặp_coin]\` : Mở sàn giao dịch trực quan kèm biểu đồ nến.\n` +
                    `• \`!long <tiền> [đòn_bẩy] [tp] [sl]\` : Mở vị thế **LONG** (Đánh lên).\n` +
                    `• \`!short <tiền> [đòn_bẩy] [tp] [sl]\` : Mở vị thế **SHORT** (Đánh xuống).\n` +
                    `• \`!close\` : Đóng vị thế theo giá thị trường, chốt PnL về ví.\n` +
                    `• \`!pos\` hoặc \`!pnl\` : Xem thẻ vị thế trực quan, ROE% và lãi/lỗ.\n` +
                    `• \`!tp <mức_giá>\` : Đặt hoặc sửa điểm Chốt Lời tự động.\n` +
                    `• \`!sl <mức_giá>\` : Đặt hoặc sửa điểm Cắt Lỗ tự động.\n` +
                    `• \`!lev <1-125>\` : Cài đặt đòn bẩy mặc định.`
            },
            {
                name: '🤖 2. Trợ Lý A.I & Soi Kèo Kỹ Thuật',
                value:
                    `• \`!ptkt [btc/eth/sol/bnb]\` hoặc \`!signal\` : Gọi A.I phân tích chỉ số RSI, sóng SMC, mô hình nến và gợi ý điểm Entry, TP, SL với tỉ lệ R:R tối ưu.\n` +
                    `• *Lưu ý:* Mọi quyết định đều do bạn tự đưa ra, A.I là trợ lý phân tích dữ liệu.`
            },
            {
                name: '📊 3. Kiến Thức Phân Tích Kỹ Thuật (TA)',
                value:
                    `• **Chỉ số RSI**: >70 là Quá Mua (ưu tiên Short), <30 là Quá Bán (ưu tiên Long).\n` +
                    `• **Giao Cắt MA**: MA7 cắt lên MA25 là Golden Cross (Tăng), cắt xuống là Death Cross (Giảm).\n` +
                    `• **Nến Hammer / Pinbar**: Râu dưới dài rút chân $\\rightarrow$ Phe mua áp đảo, tín hiệu đảo chiều tăng giá.\n` +
                    `• **Nến Engulfing**: Nến sau to nuốt trọn nến trước $\\rightarrow$ Động lượng phe đó cực mạnh.`
            },
            {
                name: '🧠 4. Smart Money Concepts (SMC)',
                value:
                    `• **Order Block (OB)**: Vùng chân sóng của dòng tiền lớn, nơi giá thường bật nảy mạnh mẽ.\n` +
                    `• **Liquidity Sweep**: Đâm thủng đỉnh/đáy cũ để quét Stop Loss rồi đảo chiều ngoạn mục.\n` +
                    `• **FVG (Fair Value Gap)**: Vùng trống thanh khoản, giá có xu hướng quay về lấp đầy.`
            },
            {
                name: '🎯 5. Quy Tắc Quản Lý Vốn Sống Còn',
                value:
                    `• **Tỷ lệ Risk:Reward (R:R)**: Luôn cài SL và TP sao cho tiềm năng ăn ít nhất gấp đôi rủi ro mất (R:R $\\ge$ 1:2).\n` +
                    `• **Nguyên tắc 5%**: Chỉ nên bỏ 5-10% tổng Cowcoin trong ví vào 1 lệnh trade để không bao giờ sợ cháy tài khoản.\n` +
                    `• **Không gỡ lệnh fomo**: Sau lệnh thua, hãy bình tĩnh chờ A.I hoặc biểu đồ nến xác nhận tín hiệu mới.`
            },
            {
                name: '👑 6. Đặc Quyền Hội Viên VIP Trader',
                value:
                    `• Miễn 100% phí giao dịch (Zero Fee).\n` +
                    `• Đòn bẩy tối thượng lên tới **x125**.\n` +
                    `• Quỹ bảo hiểm hoàn lại **10% tiền ký quỹ** nếu bị thanh lý.\n` +
                    `• Tặng thêm **+5% thưởng** trên tổng lãi khi chốt lệnh xanh.\n` +
                    `• Gõ \`!trade vip\` hoặc dùng lệnh \`/vip mua\` để mở khóa.`
            }
        )
        .setFooter({ text: 'Wind Trading Academy • Kỷ luật là chìa khóa của lợi nhuận' });
}

// ==========================================
// 9. XỬ LÝ LỆNH BÀN PHÍM CHÍNH
// ==========================================
async function handleTaiXiuGame(message) {
    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();
    const userId = message.author.id;
    const guildId = message.guild.id;
    const channelId = message.channel.id;
    const isVip = await hasActiveVip(userId, guildId);

    // 0. LỆNH CẨM NANG HƯỚNG DẪN: !helptrade, !kienthuc
    if (['!helptrade', '!kienthuc'].includes(command)) {
        return message.reply({ embeds: [getTradeHelpEmbed()] });
    }

    // 0.1. LỆNH TRỢ LÝ A.I PHÂN TÍCH KỸ THUẬT: !ptkt, !signal, !soikeo
    if (['!ptkt', '!signal', '!soikeo'].includes(command)) {
        let symbol = userSettings.get(userId)?.activeSymbol || 'BTC/cowcoin';
        if (args[1]) {
            const symInput = args[1].toUpperCase();
            if (symInput.includes('ETH')) symbol = 'ETH/cowcoin';
            else if (symInput.includes('SOL')) symbol = 'SOL/cowcoin';
            else if (symInput.includes('BNB')) symbol = 'BNB/cowcoin';
            else if (symInput.includes('BTC')) symbol = 'BTC/cowcoin';
        }

        const waitMsg = await message.reply(`🤖 Trợ lý A.I đang quét dữ liệu nến, cấu trúc SMC và chỉ báo kỹ thuật của **${symbol}**...`);
        const userBal = await db.getGuildMoney(guildId, userId);
        const analysisEmbed = await generateAiTradeAnalysis(symbol, userBal);
        await waitMsg.delete().catch(() => null);

        return message.reply({ embeds: [analysisEmbed] });
    }

    // 1. LỆNH MỞ SÀN GIAO DỊCH: !trade, !wms, !chart
    if (['!trade', '!wms', '!chart', '!taixiu', '!tx'].includes(command)) {
        let requestedSymbol = 'BTC/cowcoin';
        if (args[1]) {
            const symInput = args[1].toUpperCase();
            if (symInput.includes('ETH')) requestedSymbol = 'ETH/cowcoin';
            else if (symInput.includes('SOL')) requestedSymbol = 'SOL/cowcoin';
            else if (symInput.includes('BNB')) requestedSymbol = 'BNB/cowcoin';
            else if (symInput.includes('BTC')) requestedSymbol = 'BTC/cowcoin';
        }

        if (args[1] && args[1].toLowerCase() === 'vip') {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('👑 ĐẶC QUYỀN VIP TRADER • WIND EXCHANGE')
                        .setColor('#ffd700')
                        .setDescription(
                            `✨ **Trạng thái của bạn:** ${isVip ? '🟢 **ĐÃ MỞ KHÓA VIP**' : '🔴 **CHƯA MỞ KHÓA** (Dùng `/vip mua`)'}\n\n` +
                            `🔥 **Các Đặc Quyền Vượt Trội:**\n` +
                            `• ⚡ **Đòn Bẩy Tối Thượng:** Mở rộng từ x50 lên tới **x125**!\n` +
                            `• 💸 **Zero Trading Fee:** Miễn **100%** phí giao dịch (Người thường 0.05%).\n` +
                            `• 🛡️ **Quỹ Bảo Hiểm Cháy Lệnh:** Tự động hoàn lại **10% tiền ký quỹ** nếu không may bị thanh lý.\n` +
                            `• 💰 **Thưởng Lợi Nhuận:** Tặng thêm **+5% PnL** khi chốt lời thành công.\n` +
                            `• 👑 **Danh Hiệu Hoàng Gia:** Huy hiệu VIP Trader rực rỡ, giao diện viền vàng Gold vương giả.`
                        )
                ]
            });
        }

        const userConf = userSettings.get(userId) || {};
        userConf.activeSymbol = requestedSymbol;
        userSettings.set(userId, userConf);

        const loadingMsg = await message.reply('🔄 Đang kết nối mạng lưới Wind Exchange...');
        const payload = await buildDashboardPayload(userId, guildId, requestedSymbol);
        
        const dashboardMsg = await message.channel.send(payload);
        await loadingMsg.delete().catch(() => null);

        activeDashboards.set(channelId, { message: dashboardMsg, userId, guildId, symbol: requestedSymbol });
        return;
    }

    // 2. LỆNH MỞ VỊ THẾ NHANH: !buy, !long, !sell, !short
    if (['!buy', '!long', '!sell', '!short'].includes(command)) {
        const isBuy = ['!buy', '!long'].includes(command);
        const margin = parseInt(args[1]);
        if (isNaN(margin) || margin <= 0) {
            return message.reply(`❌ Cú pháp sai! Vui lòng nhập: \`${command} <số_cowcoin> [đòn_bẩy] [tp] [sl]\`\nVí dụ: \`${command} 5000 20\``);
        }

        const userMoney = await db.getGuildMoney(guildId, userId);
        if (userMoney < margin) {
            return message.reply(`❌ Số dư Cowcoin không đủ! Bạn hiện có: **${userMoney.toLocaleString()} cowcoin**.`);
        }

        if (userPositions.has(userId)) {
            return message.reply('⚠️ Bạn đang có vị thế mở! Vui lòng dùng lệnh `!close` hoặc bấm nút **ĐÓNG VỊ THẾ** trước.');
        }

        const maxLev = isVip ? 125 : 50;
        let lev = parseInt(args[2]) || userSettings.get(userId)?.leverage || (isVip ? 20 : 10);
        if (isNaN(lev) || lev < 1 || lev > maxLev) {
            return message.reply(`❌ Đòn bẩy không hợp lệ! Giới hạn từ **1x** đến **${maxLev}x**${!isVip ? ' (VIP mở x125)' : ''}.`);
        }

        const symbol = userSettings.get(userId)?.activeSymbol || 'BTC/cowcoin';
        const entryPrice = isBuy ? getAskPrice(symbol) : getBidPrice(symbol);
        const type = isBuy ? 'BUY' : 'SELL';
        const liqPrice = calculateLiquidationPrice(entryPrice, lev, type);

        const tpPrice = args[3] && !isNaN(parseFloat(args[3])) ? parseFloat(args[3]) : null;
        const slPrice = args[4] && !isNaN(parseFloat(args[4])) ? parseFloat(args[4]) : null;

        // Tính tỷ lệ R:R nếu có đặt TP và SL
        const rr = calculateRiskReward(entryPrice, tpPrice, slPrice);

        // Cảnh báo quản lý vốn nếu margin chiếm > 30% tài khoản
        let riskWarning = '';
        if (margin > userMoney * 0.3) {
            riskWarning = `\n⚠️ *Cảnh báo rủi ro: Ký quỹ chiếm >30% ví! Khuyến nghị tuân thủ quy tắc 5-10% vốn/lệnh.*`;
        }

        await db.addGuildMoney(guildId, userId, -margin);

        const pos = {
            guildId,
            symbol,
            type,
            margin,
            leverage: lev,
            entryPrice,
            liqPrice,
            tpPrice,
            slPrice,
            openedAt: Date.now(),
            isVip
        };

        await persistUserPosition(userId, pos);

        const embed = new EmbedBuilder()
            .setTitle(`✅ MỞ VỊ THẾ THÀNH CÔNG • ${type === 'BUY' ? '🟢 LONG' : '🔴 SHORT'}`)
            .setColor(type === 'BUY' ? '#0ecb81' : '#f6465d')
            .addFields(
                { name: 'Cặp Coin', value: `**${symbol}**`, inline: true },
                { name: 'Đòn Bẩy', value: `**x${lev}** ${isVip ? '👑' : ''}`, inline: true },
                { name: 'Ký Quỹ', value: `**${margin.toLocaleString()} cowcoin**`, inline: true },
                { name: 'Giá Khớp (Entry)', value: `**${entryPrice.toLocaleString()} cowcoin**`, inline: true },
                { name: 'Giá Cháy (Liq)', value: `☠️ **${liqPrice.toLocaleString()} cowcoin**`, inline: true },
                { name: 'Quy Mô Vị Thế', value: `**${(margin * lev).toLocaleString()} cowcoin**`, inline: true },
                { name: 'Chốt Lời (TP)', value: tpPrice ? `**${tpPrice.toLocaleString()}**` : '*Chưa đặt*', inline: true },
                { name: 'Cắt Lỗ (SL)', value: slPrice ? `**${slPrice.toLocaleString()}**` : '*Chưa đặt*', inline: true },
                { name: 'Tỉ Lệ Risk:Reward', value: rr ? `⚖️ **1 : ${rr}**` : '*Cần cả TP & SL*', inline: true }
            )
            .setDescription(`Vị thế của bạn đã được khớp vào sàn.${riskWarning}`)
            .setFooter({ text: 'Dùng !close để đóng lệnh | !pos để xem vị thế | !ptkt để xem cố vấn A.I' });

        return message.reply({ embeds: [embed] });
    }

    // 3. LỆNH ĐÓNG VỊ THẾ: !close
    if (command === '!close') {
        if (!userPositions.has(userId)) {
            return message.reply('❌ Bạn hiện không có vị thế nào đang mở!');
        }

        const pos = userPositions.get(userId);
        const currentPrice = pos.type === 'BUY' ? getBidPrice(pos.symbol) : getAskPrice(pos.symbol);
        const { netPnL, roePercent, fee } = calculatePnL(pos, currentPrice, isVip);

        await persistUserPosition(userId, null);
        const totalReturn = Math.max(0, pos.margin + netPnL);
        if (totalReturn > 0) await db.addGuildMoney(guildId, userId, totalReturn);
        await recordTradeStats(userId, netPnL);

        const isWin = netPnL >= 0;
        const embed = new EmbedBuilder()
            .setTitle(isWin ? '🎉 CHỐT LỜI THÀNH CÔNG (PROFIT)' : '🛑 CẮT LỖ VỊ THẾ (LOSS)')
            .setColor(isWin ? (isVip ? '#ffd700' : '#0ecb81') : '#f6465d')
            .setDescription(`Vị thế **${pos.type === 'BUY' ? 'LONG' : 'SHORT'} [${pos.symbol}] x${pos.leverage}** đã được đóng ở giá thị trường.`)
            .addFields(
                { name: 'Giá Vào (Entry)', value: `**${pos.entryPrice.toLocaleString()}**`, inline: true },
                { name: 'Giá Đóng (Exit)', value: `**${currentPrice.toLocaleString()}**`, inline: true },
                { name: 'Lợi Nhuận (PnL)', value: `**${isWin ? '+' : ''}${netPnL.toLocaleString()} cowcoin (${isWin ? '+' : ''}${roePercent}%)**`, inline: true },
                { name: 'Phí Giao Dịch', value: fee === 0 ? '👑 Miễn phí VIP' : `**${fee.toLocaleString()} cowcoin**`, inline: true },
                { name: 'Nhận Về Ví', value: `💰 **${totalReturn.toLocaleString()} cowcoin**`, inline: true }
            )
            .setFooter({ text: isVip ? '👑 VIP Trader: Được miễn phí giao dịch & tặng 5% bonus lãi!' : 'Dùng /vip mua để mở khóa miễn phí giao dịch & bonus lãi!' });

        return message.reply({ embeds: [embed] });
    }

    // 4. LỆNH XEM CHI TIẾT VỊ THẾ: !pos, !position, !pnl
    if (['!pos', '!position', '!pnl'].includes(command)) {
        if (!userPositions.has(userId)) {
            return message.reply('💡 Bạn hiện không có vị thế mở nào. Dùng `!trade` hoặc `!buy` / `!sell` để bắt đầu.');
        }

        const pos = userPositions.get(userId);
        const currentPrice = pos.type === 'BUY' ? getBidPrice(pos.symbol) : getAskPrice(pos.symbol);
        const { netPnL, roePercent } = calculatePnL(pos, currentPrice, isVip);
        const isWin = netPnL >= 0;
        const rr = calculateRiskReward(pos.entryPrice, pos.tpPrice, pos.slPrice);

        const embed = new EmbedBuilder()
            .setTitle(`📊 THẺ VỊ THẾ • ${pos.type === 'BUY' ? '🟢 LONG' : '🔴 SHORT'} [${pos.symbol}]`)
            .setColor(isWin ? '#0ecb81' : '#f6465d')
            .addFields(
                { name: 'Đòn Bẩy', value: `**x${pos.leverage}**`, inline: true },
                { name: 'Ký Quỹ (Margin)', value: `**${pos.margin.toLocaleString()} cowcoin**`, inline: true },
                { name: 'Quy Mô (Size)', value: `**${(pos.margin * pos.leverage).toLocaleString()} cowcoin**`, inline: true },
                { name: 'Entry Price', value: `**${pos.entryPrice.toLocaleString()}**`, inline: true },
                { name: 'Mark Price', value: `**${currentPrice.toLocaleString()}**`, inline: true },
                { name: 'Giá Thanh Lý', value: `☠️ **${pos.liqPrice.toLocaleString()}**`, inline: true },
                { name: 'PnL Tạm Tính', value: `**${isWin ? '+' : ''}${netPnL.toLocaleString()} cowcoin**`, inline: true },
                { name: 'Tỷ Suất (ROE)', value: `**${isWin ? '+' : ''}${roePercent}%**`, inline: true },
                { name: 'Tỉ Lệ R:R', value: rr ? `⚖️ **1 : ${rr}**` : '*Chưa đủ TP & SL*', inline: true },
                { name: 'Chốt Lời (TP)', value: pos.tpPrice ? `**${pos.tpPrice}**` : '*Chưa đặt*', inline: true },
                { name: 'Cắt Lỗ (SL)', value: pos.slPrice ? `**${pos.slPrice}**` : '*Chưa đặt*', inline: true }
            )
            .setFooter({ text: 'Dùng !close để chốt lệnh ngay | !tp <giá> | !sl <giá>' });

        return message.reply({ embeds: [embed] });
    }

    // 5. LỆNH CÀI TP (TAKE PROFIT) & SL (STOP LOSS)
    if (command === '!tp') {
        if (!userPositions.has(userId)) return message.reply('❌ Bạn chưa có vị thế mở nào!');
        const targetPrice = parseFloat(args[1]);
        if (isNaN(targetPrice) || targetPrice <= 0) return message.reply('❌ Cú pháp: `!tp <mức_giá_chốt_lời>`');

        const pos = userPositions.get(userId);
        pos.tpPrice = targetPrice;
        await persistUserPosition(userId, pos);

        const rr = calculateRiskReward(pos.entryPrice, pos.tpPrice, pos.slPrice);
        const rrInfo = rr ? `\n⚖️ Tỉ lệ Risk:Reward hiện tại: **1 : ${rr}**` : '';
        return message.reply(`🎯 Đã đặt Chốt Lời (TP) cho vị thế **${pos.symbol}** tại mức giá: **${targetPrice.toLocaleString()} cowcoin**!${rrInfo}`);
    }

    if (command === '!sl') {
        if (!userPositions.has(userId)) return message.reply('❌ Bạn chưa có vị thế mở nào!');
        const targetPrice = parseFloat(args[1]);
        if (isNaN(targetPrice) || targetPrice <= 0) return message.reply('❌ Cú pháp: `!sl <mức_giá_cắt_lỗ>`');

        const pos = userPositions.get(userId);
        pos.slPrice = targetPrice;
        await persistUserPosition(userId, pos);

        const rr = calculateRiskReward(pos.entryPrice, pos.tpPrice, pos.slPrice);
        const rrInfo = rr ? `\n⚖️ Tỉ lệ Risk:Reward hiện tại: **1 : ${rr}**` : '';
        return message.reply(`🛑 Đã đặt Cắt Lỗ (SL) cho vị thế **${pos.symbol}** tại mức giá: **${targetPrice.toLocaleString()} cowcoin**!${rrInfo}`);
    }

    // 6. LỆNH CÀI ĐẶT ĐÒN BẨY: !lev, !leverage
    if (['!lev', '!leverage'].includes(command)) {
        const maxLev = isVip ? 125 : 50;
        const lev = parseInt(args[1]);
        if (isNaN(lev) || lev < 1 || lev > maxLev) {
            return message.reply(`❌ Đòn bẩy phải từ **1x** đến **${maxLev}x**${!isVip ? ' (VIP mở x125)' : ''}!`);
        }
        const conf = userSettings.get(userId) || {};
        conf.leverage = lev;
        userSettings.set(userId, conf);
        return message.reply(`⚡ Đã cài đặt đòn bẩy mặc định thành **x${lev}**.`);
    }

    // 7. LỆNH XEM VÍ & TỔNG TÀI SẢN (NET WORTH): !vi, !money, !cash, !ccash
    if (['!vi', '!money', '!cash', '!ccash'].includes(command)) {
        const availableBalance = await db.getGuildMoney(guildId, userId);
        const pos = userPositions.get(userId);
        let marginLocked = 0;
        let unrealizedPnL = 0;

        if (pos) {
            marginLocked = pos.margin;
            const currentPrice = pos.type === 'BUY' ? getBidPrice(pos.symbol) : getAskPrice(pos.symbol);
            const { netPnL } = calculatePnL(pos, currentPrice, isVip);
            unrealizedPnL = netPnL;
        }

        const netWorth = availableBalance + marginLocked + unrealizedPnL;

        const embed = new EmbedBuilder()
            .setTitle(`💼 TỔNG TÀI SẢN COWCOIN • ${message.author.username}`)
            .setColor(isVip ? '#ffd700' : '#f0b90b')
            .addFields(
                { name: '💵 Số Dư Khả Dụng', value: `**${availableBalance.toLocaleString()} cowcoin**`, inline: true },
                { name: '🔒 Đang Ký Quỹ Trade', value: `**${marginLocked.toLocaleString()} cowcoin**`, inline: true },
                { name: '📈 Lợi Nhuận Tạm Tính', value: `**${unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toLocaleString()} cowcoin**`, inline: true },
                { name: '💎 Giá Trị Tài Sản Ròng', value: `**${netWorth.toLocaleString()} cowcoin**`, inline: false }
            )
            .setFooter({ text: isVip ? '👑 VIP Member • Khám phá sàn trade bằng !trade' : 'Tham gia mua sắm bằng /shop hoặc trade phái sinh bằng !trade' });

        return message.reply({ embeds: [embed] });
    }

    // 8. ĐIỂM DANH HÀNG NGÀY: !diemdanh, !daily
    if (['!diemdanh', '!daily'].includes(command)) {
        const bonus = isVip ? 10000 : 5000;
        await db.addGuildMoney(guildId, userId, bonus);
        return message.reply(`🎁 Bạn đã nhận **+${bonus.toLocaleString()} cowcoin** trợ cấp vốn giao dịch hàng ngày!${isVip ? ' (x2 Thưởng VIP 👑)' : ''}`);
    }

    // 9. LỊCH SỬ GIAO DỊCH: !history
    if (command === '!history') {
        const stats = (await db.db.get(`trades.stats.${userId}`)) || { totalTrades: 0, wins: 0, losses: 0, totalPnL: 0, bestTrade: 0 };
        const winRate = stats.totalTrades > 0 ? ((stats.wins / stats.totalTrades) * 100).toFixed(1) : '0.0';

        const embed = new EmbedBuilder()
            .setTitle(`📜 THỐNG KÊ GIAO DỊCH • ${message.author.username}`)
            .setColor(stats.totalPnL >= 0 ? '#0ecb81' : '#f6465d')
            .addFields(
                { name: 'Tổng Lệnh Khớp', value: `**${stats.totalTrades}**`, inline: true },
                { name: 'Tỷ Lệ Thắng (Win Rate)', value: `**${winRate}%** (${stats.wins}W / ${stats.losses}L)`, inline: true },
                { name: 'Kỷ Lục Lời 1 Lệnh', value: `**+${stats.bestTrade.toLocaleString()} cowcoin**`, inline: true },
                { name: 'Tổng Lợi Nhuận Ròng (Total PnL)', value: `**${stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString()} cowcoin**`, inline: false }
            );

        return message.reply({ embeds: [embed] });
    }
}

// ==========================================
// 10. XỬ LÝ TƯƠNG TÁC NÚT BẤM, MODAL & MENU CHỌN
// ==========================================
async function handleTradeButtons(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id || 'global';
    const isVip = await hasActiveVip(userId, guildId);

    // Xử lý chọn cặp tiền từ StringSelectMenu
    if (interaction.isStringSelectMenu() && interaction.customId === 'trade_select_pair') {
        const selectedSym = interaction.values[0];
        const userConf = userSettings.get(userId) || {};
        userConf.activeSymbol = selectedSym;
        userSettings.set(userId, userConf);

        const payload = await buildDashboardPayload(userId, guildId, selectedSym);
        return await interaction.update(payload);
    }

    // Xử lý nút bấm Buttons
    if (interaction.isButton()) {
        const symbol = userSettings.get(userId)?.activeSymbol || 'BTC/cowcoin';

        // Nút Trợ Lý A.I
        if (interaction.customId === 'btn_trade_ai') {
            await interaction.deferReply({ ephemeral: true });
            const userBal = await db.getGuildMoney(guildId, userId);
            const aiEmbed = await generateAiTradeAnalysis(symbol, userBal);
            return await interaction.editReply({ embeds: [aiEmbed] });
        }

        // Nút MUA / LONG hoặc BÁN / SHORT
        if (interaction.customId === 'btn_trade_buy' || interaction.customId === 'btn_trade_sell') {
            const isBuy = interaction.customId === 'btn_trade_buy';
            
            const modal = new ModalBuilder()
                .setCustomId(isBuy ? 'modal_trade_buy' : 'modal_trade_sell')
                .setTitle(isBuy ? `🟢 MỞ VỊ THẾ LONG (${symbol})` : `🔴 MỞ VỊ THẾ SHORT (${symbol})`);

            const marginInput = new TextInputBuilder()
                .setCustomId('trade_input_margin')
                .setLabel('Nhập số tiền ký quỹ (cowcoin):')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: 5000')
                .setRequired(true);

            const levInput = new TextInputBuilder()
                .setCustomId('trade_input_lev')
                .setLabel(`Đòn bẩy (1 đến ${isVip ? '125x VIP' : '50x'}):`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`Mặc định: ${userSettings.get(userId)?.leverage || (isVip ? 20 : 10)}`)
                .setRequired(false);

            const tpInput = new TextInputBuilder()
                .setCustomId('trade_input_tp')
                .setLabel('Chốt lời TP (Tùy chọn):')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Mức giá chốt lời tự động')
                .setRequired(false);

            const slInput = new TextInputBuilder()
                .setCustomId('trade_input_sl')
                .setLabel('Cắt lỗ SL (Tùy chọn):')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Mức giá cắt lỗ tự động')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(marginInput),
                new ActionRowBuilder().addComponents(levInput),
                new ActionRowBuilder().addComponents(tpInput),
                new ActionRowBuilder().addComponents(slInput)
            );

            return await interaction.showModal(modal);
        }

        // Nút Cài đặt Đòn bẩy
        if (interaction.customId === 'btn_trade_lev') {
            const maxLev = isVip ? 125 : 50;
            const modal = new ModalBuilder()
                .setCustomId('modal_trade_lev')
                .setTitle('⚡ ĐIỀU CHỈNH ĐÒN BẨY TRADING');

            const levInput = new TextInputBuilder()
                .setCustomId('trade_input_leverage_value')
                .setLabel(`Nhập đòn bẩy (1 đến ${maxLev}):`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`Hiện tại: x${userSettings.get(userId)?.leverage || 10}`)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(levInput));
            return await interaction.showModal(modal);
        }

        // Nút Cài đặt TP / SL
        if (interaction.customId === 'btn_trade_tpsl') {
            if (!userPositions.has(userId)) {
                return interaction.reply({ content: '❌ Bạn chưa có vị thế mở nào để cài đặt TP/SL!', ephemeral: true });
            }

            const pos = userPositions.get(userId);
            const modal = new ModalBuilder()
                .setCustomId('modal_trade_tpsl')
                .setTitle(`🎯 THIẾT LẬP TP/SL • ${pos.symbol}`);

            const tpInput = new TextInputBuilder()
                .setCustomId('trade_input_set_tp')
                .setLabel('Mức giá Chốt Lời (Take Profit):')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(pos.tpPrice ? `${pos.tpPrice}` : 'Nhập mức giá TP')
                .setRequired(false);

            const slInput = new TextInputBuilder()
                .setCustomId('trade_input_set_sl')
                .setLabel('Mức giá Cắt Lỗ (Stop Loss):')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(pos.slPrice ? `${pos.slPrice}` : 'Nhập mức giá SL')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(tpInput),
                new ActionRowBuilder().addComponents(slInput)
            );

            return await interaction.showModal(modal);
        }

        // Nút Đóng Lệnh
        if (interaction.customId === 'btn_trade_close') {
            if (!userPositions.has(userId)) {
                return interaction.reply({ content: '❌ Bạn chưa có vị thế nào đang mở!', ephemeral: true });
            }

            const pos = userPositions.get(userId);
            const currentPrice = pos.type === 'BUY' ? getBidPrice(pos.symbol) : getAskPrice(pos.symbol);
            const { netPnL, roePercent, fee } = calculatePnL(pos, currentPrice, isVip);

            await persistUserPosition(userId, null);
            const totalReturn = Math.max(0, pos.margin + netPnL);
            if (totalReturn > 0) await db.addGuildMoney(guildId, userId, totalReturn);
            await recordTradeStats(userId, netPnL);

            const isWin = netPnL >= 0;
            return interaction.reply({ 
                content: `🛑 **ĐÃ ĐÓNG VỊ THẾ THÀNH CÔNG (${pos.type === 'BUY' ? 'LONG' : 'SHORT'} [${pos.symbol}])**\n` +
                         `• Giá khớp: **${currentPrice.toLocaleString()} cowcoin**\n` +
                         `• Lời/Lỗ (PnL): **${isWin ? '+' : ''}${netPnL.toLocaleString()} cowcoin (${isWin ? '+' : ''}${roePercent}%)**\n` +
                         `• Phí sàn: **${fee === 0 ? '0 cowcoin (Miễn phí VIP 👑)' : `${fee.toLocaleString()} cowcoin`}**\n` +
                         `• Hoàn về ví: 💰 **${totalReturn.toLocaleString()} cowcoin**`, 
                ephemeral: true 
            });
        }
    }

    // Xử lý gửi Form Modal Submits
    if (interaction.isModalSubmit()) {
        // Modal Đòn Bẩy
        if (interaction.customId === 'modal_trade_lev') {
            const maxLev = isVip ? 125 : 50;
            const levVal = parseInt(interaction.fields.getTextInputValue('trade_input_leverage_value'));
            if (isNaN(levVal) || levVal < 1 || levVal > maxLev) {
                return interaction.reply({ content: `❌ Đòn bẩy phải từ **1x** đến **${maxLev}x**${!isVip ? ' (VIP mở x125)' : ''}!`, ephemeral: true });
            }

            const conf = userSettings.get(userId) || {};
            conf.leverage = levVal;
            userSettings.set(userId, conf);

            return interaction.reply({ content: `⚡ Đã cập nhật đòn bẩy mặc định thành **x${levVal}**!`, ephemeral: true });
        }

        // Modal Cài TP/SL
        if (interaction.customId === 'modal_trade_tpsl') {
            if (!userPositions.has(userId)) {
                return interaction.reply({ content: '❌ Bạn chưa có vị thế mở nào!', ephemeral: true });
            }
            const pos = userPositions.get(userId);
            const tpRaw = interaction.fields.getTextInputValue('trade_input_set_tp')?.trim();
            const slRaw = interaction.fields.getTextInputValue('trade_input_set_sl')?.trim();

            if (tpRaw && !isNaN(parseFloat(tpRaw))) pos.tpPrice = parseFloat(tpRaw);
            if (slRaw && !isNaN(parseFloat(slRaw))) pos.slPrice = parseFloat(slRaw);

            await persistUserPosition(userId, pos);
            const rr = calculateRiskReward(pos.entryPrice, pos.tpPrice, pos.slPrice);
            const rrInfo = rr ? `\n• Tỉ lệ Risk:Reward (R:R): ⚖️ **1 : ${rr}**` : '';

            return interaction.reply({
                content: `🎯 **Đã cập nhật mục tiêu cho [${pos.symbol}]:**\n• Chốt lời (TP): **${pos.tpPrice ? pos.tpPrice.toLocaleString() : 'Chưa đặt'}**\n• Cắt lỗ (SL): **${pos.slPrice ? pos.slPrice.toLocaleString() : 'Chưa đặt'}**${rrInfo}`,
                ephemeral: true
            });
        }

        // Modal Đặt Lệnh Mua / Bán
        if (interaction.customId === 'modal_trade_buy' || interaction.customId === 'modal_trade_sell') {
            const margin = parseInt(interaction.fields.getTextInputValue('trade_input_margin'));
            if (isNaN(margin) || margin <= 0) {
                return interaction.reply({ content: '❌ Số tiền ký quỹ không hợp lệ!', ephemeral: true });
            }

            const userMoney = await db.getGuildMoney(guildId, userId);
            if (userMoney < margin) {
                return interaction.reply({ content: `❌ Số dư không đủ! Bạn chỉ có **${userMoney.toLocaleString()} cowcoin**`, ephemeral: true });
            }

            if (userPositions.has(userId)) {
                return interaction.reply({ content: '⚠️ Bạn đang có vị thế mở! Vui lòng bấm **ĐÓNG VỊ THẾ** trước.', ephemeral: true });
            }

            const isBuy = interaction.customId === 'modal_trade_buy';
            const maxLev = isVip ? 125 : 50;
            const levRaw = interaction.fields.getTextInputValue('trade_input_lev')?.trim();
            let lev = levRaw && !isNaN(parseInt(levRaw)) ? parseInt(levRaw) : (userSettings.get(userId)?.leverage || (isVip ? 20 : 10));
            if (lev < 1 || lev > maxLev) lev = isVip ? 20 : 10;

            const tpRaw = interaction.fields.getTextInputValue('trade_input_tp')?.trim();
            const slRaw = interaction.fields.getTextInputValue('trade_input_sl')?.trim();
            const tpPrice = tpRaw && !isNaN(parseFloat(tpRaw)) ? parseFloat(tpRaw) : null;
            const slPrice = slRaw && !isNaN(parseFloat(slRaw)) ? parseFloat(slRaw) : null;

            const symbol = userSettings.get(userId)?.activeSymbol || 'BTC/cowcoin';
            const entryPrice = isBuy ? getAskPrice(symbol) : getBidPrice(symbol);
            const type = isBuy ? 'BUY' : 'SELL';
            const liqPrice = calculateLiquidationPrice(entryPrice, lev, type);
            const rr = calculateRiskReward(entryPrice, tpPrice, slPrice);

            await db.addGuildMoney(guildId, userId, -margin);

            const pos = {
                guildId,
                symbol,
                type,
                margin,
                leverage: lev,
                entryPrice,
                liqPrice,
                tpPrice,
                slPrice,
                openedAt: Date.now(),
                isVip
            };

            await persistUserPosition(userId, pos);

            const rrText = rr ? `\n• Tỉ lệ R:R: ⚖️ **1 : ${rr}**` : '';
            return interaction.reply({ 
                content: `✅ Mở thành công vị thế **${type === 'BUY' ? 'LONG 🟢' : 'SHORT 🔴'} [${symbol}] x${lev}** ${isVip ? '👑' : ''}\n` +
                         `• Giá vào (Entry): **${entryPrice.toLocaleString()} cowcoin**\n` +
                         `• Tiền ký quỹ: **${margin.toLocaleString()} cowcoin** (Quy mô: **${(margin * lev).toLocaleString()}**)\n` +
                         `• Giá cháy (Liq): ☠️ **${liqPrice.toLocaleString()} cowcoin**\n` +
                         `• Chốt lời (TP): **${tpPrice ? tpPrice.toLocaleString() : 'Chưa đặt'}** | Cắt lỗ (SL): **${slPrice ? slPrice.toLocaleString() : 'Chưa đặt'}**${rrText}`, 
                ephemeral: true 
            });
        }
    }
}

module.exports = { 
    handleTaiXiuGame, 
    handleTradeButtons, 
    calculatePnL, 
    calculateLiquidationPrice,
    calculateRSI,
    detectCandlePattern,
    analyzeMarketTechnical,
    calculateRiskReward,
    getTradeHelpEmbed,
    detectMarketStructure,
    getMarketStructure,
    marketStructureCommandData,
    handleMarketStructureSlash,
    MARKETS
};