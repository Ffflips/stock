export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { stocks } = req.body || {};
  if (!stocks || !stocks.length) return res.status(400).json({ error: 'no stocks' });

  const prompt = `你是"主流资金周期决策系统"分析引擎。核心思想：市场交易的本质是资金在"产业周期+龙头生命周期+情绪周期"中的位置，不是K线形态预测。

基于以下股票今日实时数据：

${stocks.map((s,i) => `${i+1}. ${s.name}(${s.code}) 今日涨跌:${s.pct>0?'+':''}${s.pct.toFixed(2)}% 现价:¥${s.price} 行业:${s.sector}`).join('\n')}

对每只股票，按以下权重综合判断：

1. 主流赛道评分 sector_score(0-100)：该股票所属行业是否是当前市场资金主流方向。结合行业景气度、政策导向、近期市场热度综合判断。
2. 龙头强度评分 leader_score(0-100)：该股票在所属行业中的地位（是否细分龙头、市占率、市场关注度）。
3. 成长空间定性 growth_level：高成长/中成长/低成长，基于行业空间和公司竞争力的定性判断，并给一句简短理由(growth_reason，15字以内)，不输出任何具体价格预测数字。
4. 趋势结构 trend_status：上升趋势/震荡趋势/下跌趋势，结合今日涨跌幅和该股票所属行业近期趋势判断。
5. 波浪阶段 wave（仅作节奏参考，权重最低）：1浪/2浪/3浪/4浪/5浪/A浪/B浪/C浪。
6. 风险周期倒计时 riskTime：用自然语言描述风险窗口，如"当前处于安全主升期"/"3-7天进入高风险区"/"10-20天调整概率上升"/"已进入风险区，建议立即关注"。

最终决策 action(BUY/HOLD/REDUCE/EXIT)，优先级：主流赛道 > 龙头强度 > 成长空间 > 趋势结构 > 波浪结构（波浪权重最低，不可作为主要依据）。

综合AI评分 aiScore(0-100)：综合以上五个维度的加权得分(主流赛道40% + 龙头强度20% + 成长空间20% + 趋势结构10% + 波浪10%)。

严格输出JSON数组，每个元素字段：
{"name":"股票名","sectorScore":数字,"leaderScore":数字,"growthLevel":"高成长/中成长/低成长","growthReason":"原因","trend":"up/side/down","wave":"波浪阶段","action":"BUY/HOLD/REDUCE/EXIT","riskTime":"风险描述","aiScore":数字}

只返回JSON数组，不要其他任何文字，不要输出任何具体价格预测数字。`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
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
