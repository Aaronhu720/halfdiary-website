// 查询订单状态（前端轮询用）
const orderStore = global.__orderStore || (global.__orderStore = new Map());

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { orderNo } = req.query;

  if (!orderNo) {
    return res.status(400).json({ error: '缺少 orderNo 参数' });
  }

  const order = orderStore.get(orderNo);

  if (!order) {
    return res.status(200).json({
      orderNo,
      status: 'pending',
    });
  }

  return res.status(200).json({
    orderNo: order.orderNo,
    status: order.status,
    productId: order.productId,
    paidAt: order.paidAt,
  });
};
