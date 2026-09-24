const test = require('node:test');
const assert = require('node:assert/strict');

const settings = require('../src/config/settings.json');
const premium = require('../src/handlers/premium');
const climate = require('../src/handlers/climate');
const database = require('../src/utils/db');

test('VIP plans keep the configured prices', () => {
    assert.equal(settings.vip.plans['3'].price, 20000);
    assert.equal(settings.vip.plans['7'].price, 50000);
    assert.equal(settings.vip.plans['30'].price, 200000);
    assert.equal(settings.vip.bankAccount, '0866481829');
});

test('Premium benefits and central theme are configured', () => {
    assert.equal(settings.vip.benefits.aiModel, 'gemini-3.1-pro-preview');
    assert.equal(settings.vip.benefits.petInventoryLimit, 12);
    assert.equal(settings.vip.benefits.petIncomeMultiplier, 2);
    assert.equal(settings.vip.benefits.exclusivePetLevel, 5);
});

test('Premium and climate slash commands are valid', () => {
    assert.equal(premium.commandData.toJSON().name, 'vip');
    assert.equal(climate.commandData.toJSON().name, 'khihau');
    assert.equal(typeof premium.hasActiveVip, 'function');
    assert.equal(typeof premium.getPremiumStatus, 'function');
    assert.equal(typeof premium.isVipExpired, 'function');
});

test('VIP expiry boundaries are deterministic', () => {
    const now = 100000;
    assert.equal(premium.isVipExpired({ expiresAt: now - 1 }, now), true);
    assert.equal(premium.isVipExpired({ expiresAt: now }, now), true);
    assert.equal(premium.isVipExpired({ expiresAt: now + 1 }, now), false);
    assert.equal(premium.isVipExpired({}, now), false);
});

test('SePay payload normalization keeps transaction identity and amount', () => {
    const payment = premium.normalizePayment({
        id: 987654,
        transferAmount: '50000',
        content: ' thanh toan VIP-ABC123 '
    });

    assert.equal(payment.transactionId, '987654');
    assert.equal(payment.amount, 50000);
    assert.equal(payment.content, ' THANH TOAN VIP-ABC123 ');
});

test('Guild-scoped economy API is available', () => {
    assert.equal(typeof database.getGuildEconomy, 'function');
    assert.equal(typeof database.getGuildMoney, 'function');
    assert.equal(typeof database.addGuildMoney, 'function');
    assert.equal(typeof database.updateGuildEconomy, 'function');
});
