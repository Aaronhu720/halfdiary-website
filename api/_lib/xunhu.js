const crypto = require('crypto');

const XUNHU_CONFIG = {
  wechat: {
    appid: process.env.XUNHU_WECHAT_APPID || '',
    appsecret: process.env.XUNHU_WECHAT_APPSECRET || '',
    gateway: 'https://api.xunhupay.com/payment/do.html',
  },
  alipay: {
    appid: process.env.XUNHU_ALIPAY_APPID || '',
    appsecret: process.env.XUNHU_ALIPAY_APPSECRET || '',
    gateway: 'https://api.xunhupay.com/payment/do.html',
  },
};

const PRODUCTS = {
  halfdiary_monthly:  { price: 19.9,  name: 'Half日记 月度会员' },
  halfdiary_yearly:   { price: 199,   name: 'Half日记 年度会员' },
  halfdiary_sms:      { price: 2.9,   name: 'Half日记 延迟短信' },
  halfdiary_tarot:    { price: 9.9,   name: 'Half日记 塔罗占卜' },
  halfdiary_nametest: { price: 9.9,   name: 'Half日记 姓名测试' },
};

function generateSign(params, appsecret) {
  const keys = Object.keys(params).filter(k => k !== 'hash' && params[k] !== '').sort();
  const str = keys.map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('md5').update(str + appsecret).digest('hex');
}

function verifySign(params, appsecret) {
  const receivedHash = params.hash;
  if (!receivedHash) return false;
  const computed = generateSign(params, appsecret);
  return computed === receivedHash;
}

function generateOrderNo() {
  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HD${ts}${rand}`;
}

module.exports = { XUNHU_CONFIG, PRODUCTS, generateSign, verifySign, generateOrderNo };
