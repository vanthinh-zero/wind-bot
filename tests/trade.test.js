const test = require('node:test');
const assert = require('node:assert/strict');

const { 
    calculatePnL, 
    calculateLiquidationPrice, 
    calculateRSI, 
    detectCandlePattern, 
    detectMarketStructure, 
    analyzeMarketTechnical, 
    calculateRiskReward, 
    getTradeHelpEmbed, 
    MARKETS 
} = require('../src/handlers/taixiu');
const db = require('../src/utils/db');

test('Trading pairs are properly initialized', () => {
    assert.ok(MARKETS['BTC/cowcoin']);
    assert.ok(MARKETS['ETH/cowcoin']);
    assert.ok(MARKETS['SOL/cowcoin']);
    assert.ok(MARKETS['BNB/cowcoin']);
    assert.equal(typeof MARKETS['BTC/cowcoin'].price, 'number');
    assert.ok(MARKETS['BTC/cowcoin'].price > 0);
});

test('Liquidation price calculates correctly for Long and Short', () => {
    const entryPrice = 100000;
    const leverage = 10;
    
    // For Long: maintenance margin ratio = 0.9 / 10 = 0.09. Liq price = 100000 * (1 - 0.09) = 91000
    const longLiq = calculateLiquidationPrice(entryPrice, leverage, 'BUY');
    assert.equal(longLiq, 91000);

    // For Short: Liq price = 100000 * (1 + 0.09) = 109000
    const shortLiq = calculateLiquidationPrice(entryPrice, leverage, 'SELL');
    assert.equal(shortLiq, 109000);
});

test('PnL calculation applies regular fees for non-VIP', () => {
    const pos = {
        type: 'BUY',
        margin: 1000,
        leverage: 10,
        entryPrice: 100
    };
    const currentPrice = 110;
    const { netPnL, fee } = calculatePnL(pos, currentPrice, false);
    assert.equal(fee, 5);
    assert.equal(netPnL, 995);
});

test('PnL calculation gives 0% fee and +5% profit bonus for VIP', () => {
    const pos = {
        type: 'BUY',
        margin: 1000,
        leverage: 10,
        entryPrice: 100
    };
    const currentPrice = 110;
    const { netPnL, fee } = calculatePnL(pos, currentPrice, true);
    assert.equal(fee, 0);
    assert.equal(netPnL, 1050);
});

test('Risk:Reward ratio calculates correctly', () => {
    // Entry: 100, TP: 130 (+30), SL: 90 (-10) -> R:R = 30 / 10 = 3.00
    const rr = calculateRiskReward(100, 130, 90);
    assert.equal(rr, '3.00');

    // Entry: 100, TP: 110 (+10), SL: 95 (-5) -> R:R = 10 / 5 = 2.00
    const rr2 = calculateRiskReward(100, 110, 95);
    assert.equal(rr2, '2.00');

    // Missing TP or SL returns null
    assert.equal(calculateRiskReward(100, null, 90), null);
});

test('RSI calculation returns valid bounded values (0 to 100)', () => {
    const testCandles = [];
    for (let i = 0; i < 20; i++) {
        testCandles.push({ close: 100 + i * 2 }); // Steady rise
    }
    const rsi = calculateRSI(testCandles, 14);
    assert.ok(rsi >= 0 && rsi <= 100);
    assert.ok(rsi > 70); // Strong uptrend should result in overbought (>70)
});

test('Candle pattern detection identifies pinbars and engulfing', () => {
    // Hammer / Pinbar Bullish: small body at top, long lower wick
    const hammer = { open: 100, close: 102, high: 103, low: 90 };
    const pattern = detectCandlePattern(hammer);
    assert.ok(pattern.includes('Hammer') || pattern.includes('Pinbar'));

    // Bullish Engulfing
    const prevRed = { open: 100, close: 95, high: 101, low: 94 };
    const currentGreen = { open: 94, close: 105, high: 106, low: 93 };
    const engulfing = detectCandlePattern(currentGreen, prevRed);
    assert.ok(engulfing.includes('Bullish Engulfing'));
});

test('Market Structure confirms swings without using the newest candle as a pivot', () => {
    const candles = [
        { high: 10, low: 8, close: 9 },
        { high: 12, low: 9, close: 11 },
        { high: 15, low: 10, close: 14 },
        { high: 13, low: 9, close: 10 },
        { high: 14, low: 10, close: 13 },
        { high: 16, low: 11, close: 15 },
        { high: 15, low: 10, close: 14 },
        { high: 17, low: 12, close: 16 },
        { high: 18, low: 13, close: 17 }
    ];

    const ms = detectMarketStructure(candles, { swingLength: 1 });

    assert.ok(['BULLISH', 'RANGING', 'NEUTRAL'].includes(ms.trend));
    assert.ok(ms.points.every(point => point.index < candles.length - 1));
    assert.ok(['NONE', 'BOS_BULLISH', 'BOS_BEARISH', 'CHOCH_BULLISH', 'CHOCH_BEARISH'].includes(ms.event));
    assert.equal(typeof ms.explanation, 'string');
});

test('Market Structure detects bullish BOS only after a confirmed close above a swing high', () => {
    const candles = [
        { high: 10, low: 8, close: 9 },
        { high: 12, low: 9, close: 11 },
        { high: 11, low: 9, close: 10 },
        { high: 13, low: 10, close: 12 },
        { high: 12, low: 9, close: 10 },
        { high: 14, low: 10, close: 13 },
        { high: 16, low: 12, close: 15 }
    ];

    const ms = detectMarketStructure(candles, { swingLength: 1 });
    assert.equal(ms.event, 'BOS_BULLISH');
    assert.equal(ms.lastBreakPrice, 14);
});

test('Technical Analysis Engine outputs full trading plan', () => {
    const ta = analyzeMarketTechnical('BTC/cowcoin');
    assert.ok(ta.symbol);
    assert.equal(typeof ta.rsi, 'number');
    assert.ok(ta.signal);
    assert.ok(ta.suggestedEntry > 0);
    assert.ok(ta.suggestedSL > 0);
    assert.ok(ta.suggestedTP > 0);
    assert.ok(ta.rrRatio);
});

test('Help Trade embed is structured and informative', () => {
    const embed = getTradeHelpEmbed();
    assert.ok(embed.data.title.includes('CẨM NANG TOÀN TẬP CHO TRADER'));
    assert.ok(embed.data.fields.length >= 5);
});

test('Two-way sync between getGuildMoney and getUserMoney in SQLite database', async () => {
    const testUser = 'user_test_sync_' + Date.now();
    const testGuild = 'guild_test_sync_' + Date.now();

    await db.addGuildMoney(testGuild, testUser, 50000);
    const guildBal = await db.getGuildMoney(testGuild, testUser);
    const userBal = await db.getUserMoney(testUser);

    assert.equal(guildBal, 50000);
    assert.equal(userBal, 50000);

    await db.addGuildMoney(testGuild, testUser, -20000);
    const updatedGuildBal = await db.getGuildMoney(testGuild, testUser);
    const updatedUserBal = await db.getUserMoney(testUser);

    assert.equal(updatedGuildBal, 30000);
    assert.equal(updatedUserBal, 30000);
});
