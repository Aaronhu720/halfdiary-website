const https = require('https');
const http = require('http');
const { URL } = require('url');
const { XUNHU_CONFIG, PRODUCTS, generateSign, generateOrderNo } = require('./_lib/xunhu');

function postForm(gatewayUrl, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const parsed = new URL(gatewayUrl);
    const mod = parsed.protocol === 'https:' ? https : http;

    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON: ' + data)); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持POST请求' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { productId, channel, userId } = req.body;

    if (!productId || !channel) {
      return res.status(400).json({ error: '缺少参数: productId, channel' });
    }

    if (!['wechat', 'alipay'].includes(channel)) {
      return res.status(400).json({ error: 'channel 必须为 wechat 或 alipay' });
    }

    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(400).json({ error: '无效的商品ID' });
    }

    const config = XUNHU_CONFIG[channel];
    if (!config.appid || !config.appsecret) {
      return res.status(500).json({ error: '支付渠道未配置' });
    }

    const orderNo = generateOrderNo();
    const callbackUrl = `${process.env.SERVER_URL || 'https://your-server.vercel.app'}/api/payment-callback`;
    const returnUrl = `${process.env.APP_URL || 'https://myhalf.ai'}/payment-result?order=${orderNo}`;

    const params = {
      version: '1.1',
      appid: config.appid,
      trade_order_id: orderNo,
      total_fee: product.price.toFixed(2),
      title: product.name,
      time: Math.floor(Date.now() / 1000).toString(),
      notify_url: callbackUrl,
      return_url: returnUrl,
      nonce_str: Math.random().toString(36).slice(2, 14),
      type: channel === 'wechat' ? 'WAP' : 'WAP',
      wap_url: process.env.APP_URL || 'https://myhalf.ai',
      wap_name: 'Half日记',
    };

    if (userId) {
      params.attach = JSON.stringify({ userId, productId });
    } else {
      params.attach = JSON.stringify({ productId });
    }

    params.hash = generateSign(params, config.appsecret);

    const result = await postForm(config.gateway, params);

    if (result.errcode !== 0 && result.errmsg) {
      return res.status(400).json({
        error: result.errmsg || '创建订单失败',
        detail: result,
      });
    }

    return res.status(200).json({
      success: true,
      orderNo,
      qrUrl: result.url_qrcode || result.url,
      payUrl: result.url,
      channel,
      productId,
      price: product.price,
      productName: product.name,
    });

  } catch (err) {
    console.error('[create-order] Error:', err);
    return res.status(500).json({ error: '服务器错误: ' + err.message });
  }
};
