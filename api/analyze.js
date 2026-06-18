export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { stocks } = req.body || {};
  if (!stocks || !stocks.length) return res.status(400).json({ error: 'no stocks' });

  const prompt = `你是"主流资金周期决策系统"分析引擎。核心思想：市场交易的本质是资金在"产业周期+龙头生命周期+情绪周期"中的位置，不是K线形态预测。

基于以下股票今日实时数据：

${stocks.map((s,i) => `${i+1}. ${s.name}(${s.code}) 今日涨跌:${s.pct>0?'+':''}${s.pct.toFixed(2)}% 现价:¥${s.price} 行业:${s.sector} 换手率:${s.turnover!=null?s.turnover.toFixed(2)+'%':'数据暂缺'}`).join('\n')}

对每只股票，按以下权重综合判断：

1. 主流赛道评分 sectorScore(0-100)：该股票所属行业是否是当前市场资金主流方向。结合行业景气度、政策导向、近期市场热度综合判断。
2. 龙头强度评分 leaderScore(0-100)：该股票在所属行业中的地位（是否细分龙头、市占率、市场关注度）。
3. 成长空间定性 growthLevel：高成长/中成长/低成长，基于行业空间和公司竞争力的定性判断，并给一句简短理由(growthReason，15字以内)，不输出任何具体价格预测数字。
4. 趋势结构 trend：up(上升)/side(震荡)/down(下跌)，结合今日涨跌幅和该股票所属行业近期趋势判断。
5. 波浪阶段 wave（仅作节奏参考，权重最低）：1浪/2浪/3浪/4浪/5浪/A浪/B浪/C浪，用中文描述如"1浪启动"/"3浪主升"/"5浪末端"/"A浪开始"等。
6. 追高/杀跌风险：当日涨跌幅越大，说明短期情绪可能已被市场资金透支，"追高买入"是真实交易中最常见的亏损原因之一，必须在综合评分中扣减相应分数，涨幅或跌幅越大扣分越多，不能因为"今天涨得多"就给高分。
7. 换手率风险（重要）：换手率反映真实资金参与度。换手率低于1%说明这只股票几乎没人交易，"一潭死水"，哪怕涨了也是极少数人在玩，价格信号不可信，必须大幅扣分；换手率1%-2%偏冷淡，适度扣分；换手率2%-10%属于正常活跃区间；换手率超过10%可能是情绪博弈过热，需结合涨跌幅判断风险。换手率数据暂缺时不做该项调整。
8. 风险周期倒计时 riskTime：用通俗中文自然语言描述风险窗口，如"当前处于安全主升期"/"涨幅已大，3-7天内进入高风险区"/"短期承压，建议观察企稳信号"，不要使用任何英文或专业术语，让普通投资者能看懂。

综合评分 aiScore(0-100)：主流赛道40% + 龙头强度20% + 成长空间20% + 趋势结构20%，再扣减追高/杀跌风险分和换手率风险分。

最终决策 action 完全由综合评分aiScore决定，必须严格使用以下中文之一，不允许使用英文：
- aiScore>=78 → "买入"
- aiScore 62-77 → "持有"
- aiScore 45-61 → "减仓"
- aiScore<45 → "退出"
分数越高越值得现在动手，分数低就应该按兵不动，不要为了凑数勉强给出"买入"。
硬性规则：如果换手率低于1%（一潭死水），无论评分多高，action最多只能是"持有"，绝对不能是"买入"，并在riskTime中提醒换手率过低、资金参与不足。

严格输出JSON数组，每个元素字段：
{"name":"股票名","sectorScore":数字,"leaderScore":数字,"growthLevel":"高成长/中成长/低成长","growthReason":"原因","trend":"up/side/down","wave":"波浪阶段","action":"买入/持有/减仓/退出","riskTime":"风险描述（纯中文）","aiScore":数字}

只返回JSON数组，不要其他任何文字，不要输出任何具体价格预测数字，action字段必须是中文"买入"/"持有"/"减仓"/"退出"四个词之一，绝不能用英文。`;

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
