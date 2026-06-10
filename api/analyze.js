export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { stocks, mode } = req.body || {};
  if (!stocks || !stocks.length) return res.status(400).json({ error: 'no stocks' });

  const prompt = `你是"市场周期+波浪结构"分析引擎，不是情绪型分析师。

基于以下股票今日实时数据，对每只股票进行波段生命周期判断：

${stocks.map((s,i) => `${i+1}. ${s.name}(${s.code}) 今日涨跌:${s.pct>0?'+':''}${s.pct.toFixed(2)}% 现价:¥${s.price} 行业:${s.sector}`).join('\n')}

判断规则：
- 涨幅>8%：5浪末端，EXIT，随时可能反转
- 涨幅5-8%：5浪，REDUCE，1-3天内见顶
- 涨幅3-5%：3浪后期，REDUCE，3-5天高风险
- 涨幅1.5-3%：3浪主升，HOLD，3-10天可能高风险
- 涨幅0-1.5%：1浪启动，BUY，仍有空间
- 跌幅0-2%：4浪整理，HOLD，不改主升
- 跌幅2-4%：A浪开始，EXIT，趋势破坏
- 跌幅>4%：C浪主跌，EXIT，立即退出

严格输出JSON数组，字段：name,wave,trend(up/side/down),space(还有/接近结束/已结束),action(BUY/HOLD/REDUCE/EXIT),riskTime,confidence(0-100)
只返回JSON，不要其他任何文字。`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const aiData = await aiRes.json();
    const text = aiData.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('no json');
    const result = JSON.parse(match[0]);
    res.json({ success: true, data: result });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
