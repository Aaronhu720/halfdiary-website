const { XUNHU_CONFIG, verifySign } = require('./_lib/xunhu');

// 简易内存订单存储（生产环境应换为数据库）
// 全局变量在 Vercel Serverless 中不可靠，用 KV 或数据库替代
// 这里先用简单方案，后续可接入 Vercel KV / Upstash Redis
const orderStore = global.__orderStore || (global.__orderStore = new Map());

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // 虎皮椒回调参数可能在 body 或 query 中
    const params = req.method === 'POST' ? req.body : req.query;

    const {
      trade_order_id,  // 我方订单号
      transaction_id,  // 虎皮椒交易号
      open_order_id,   // 支付平台交易号
      order_title,
      status,          // OD (已支付)
      total_fee,
      attach,
      hash,
    } = params;

    if (!trade_order_id || !hash) {
      return res.status(400).send('fail');
    }

    // 根据 attach 中的信息判断使用哪个渠道的密钥验签
    let appsecret = '';
    let attachData = {};
    try {
      attachData = JSON.parse(attach || '{}');
    } catch {}

    // 尝试两个渠道的密钥验签
    const wechatValid = XUNHU_CONFIG.wechat.appsecret && verifySign(params, XUNHU_CONFIG.wechat.appsecret);
    const alipayValid = XUNHU_CONFIG.alipay.appsecret && verifySign(params, XUNHU_CONFIG.alipay.appsecret);

    if (!wechatValid && !alipayValid) {
      console.error('[callback] 签名验证失败:', trade_order_id);
      return res.status(400).send('fail');
    }

    if (status === 'OD') {
      // 支付成功，记录订单
      orderStore.set(trade_order_id, {
        orderNo: trade_order_id,
        transactionId: transaction_id,
        openOrderId: open_order_id,
        productId: attachData.productId || '',
        userId: attachData.userId || '',
        totalFee: total_fee,
        status: 'paid',
        paidAt: new Date().toISOString(),
      });

      console.log('[callback] 支付成功:', trade_order_id, total_fee, attachData.productId);
    }

    // 虎皮椒要求返回 "success" 表示已收到
    return res.status(200).send('success');

  } catch (err) {
    console.error('[callback] Error:', err);
    return res.status(500).send('fail');
  }
};
