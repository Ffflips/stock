export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { stocks, mode, marketEnv } = req.body || {};
  if (!stocks || !stocks.length) return res.status(400).json({ error: 'no stocks' });

  const isWatch = mode === 'watch';
  const envContext = marketEnv
    ? `当前市场环境：${marketEnv.label}（评分${marketEnv.score}/100，${marketEnv.detail||''}）。市场环境评分越低，整体应越保守，即使个股信号好也要打折扣；评分低于50时几乎不应给出"买入"。`
    : '市场环境数据暂缺，按中性环境处理。';

  const prompt = isWatch
  ? `你是"机会生命周期交易操作系统（OLTS V3）"的持仓健康度分析引擎（模块9+10）。

${envContext}

以下是用户当前持仓股票的今日实时数据：

${stocks.map((s,i) => `${i+1}. ${s.name}(${s.code}) 今日涨跌:${s.pct>0?'+':''}${s.pct.toFixed(2)}% 现价:¥${s.price} 行业:${s.sector} 换手率:${s.turnover!=null?s.turnover.toFixed(2)+'%':'暂缺'}`).join('\n')}

对每只持仓股票，输出持仓健康度评分（Position Health Score，0-100）：

评分维度：
- 今日涨跌表现（上涨加分，下跌扣分）
- 换手率（低于1%扣分，2-10%正常，过高博弈扣分）
- 趋势状态（上升加分，震荡中性，下跌扣分）
- 市场环境（环境差时整体下修健康度）

操作对应规则（统一三态，不含"观察"）：
- 80以上：持有（强势/继续持有）
- 60-79：持有（但需注意观察）
- 50-59：减仓
- 50以下：退出

风险窗口：
- 90以上："当前处于安全持有期"
- 70-89："预计可持有 1-3个交易日"
- 60-69："预计 6-12小时需要决策"
- 50-59："预计 2-6小时高风险"
- 50以下："当前进入退出区"

硬性规则：换手率低于1%时健康度必须显著扣分（流动性枯竭风险）。

输出JSON数组（只返回JSON，不要其他文字）：
[{"name":"股票名","healthScore":数字,"action":"持有/减仓/退出","riskWindow":"风险窗口描述","momentumLabel":"动能增强/动能稳定/动能衰减"}]`

  : `你是"机会生命周期交易操作系统（OLTS V3）"的机会评分引擎（模块6）。

系统核心原则：
- 宁可空仓等待，也不做低质量交易
- 目标：风险最小 + 确定性最高 + 收益空间最大
- 优先寻找"正在形成"的机会（萌芽期/启动期），而非已经暴涨的票
- 区分"主线"（持续获资金关注+产业逻辑支撑）和"热点"（短期炒作）

${envContext}

以下是待分析股票的今日实时数据：

${stocks.map((s,i) => `${i+1}. ${s.name}(${s.code}) 今日涨跌:${s.pct>0?'+':''}${s.pct.toFixed(2)}% 现价:¥${s.price} 行业:${s.sector} 换手率:${s.turnover!=null?s.turnover.toFixed(2)+'%':'暂缺'}`).join('\n')}

对每只股票，综合以下维度输出机会评分（Opportunity Score，0-100分）：

1. 主线强度 sectorScore(0-100)：行业是否是当前市场资金主流方向，是"主线"还是仅"热点"
2. 龙头地位 leaderScore(0-100)：是否行业核心标的
3. 未来价值/成长空间 growthLevel：高成长/中成长/低成长，附理由growthReason（15字以内）
4. 资金活跃度（换手率）：<1%→严重扣分(一潭死水)，1-2%→扣分，2-10%→正常，>10%→博弈过热
5. 追高风险：涨跌幅越大说明情绪越透支，必须扣分，涨幅>9%几乎不能给出买入
6. 生命周期阶段 stage：萌芽期/启动期/主升期/疯狂期/衰退期/死亡期（系统重点关注萌芽期和启动期的机会）
7. 风险窗口 riskTime：通俗中文，不要英文，不要预测具体价格

评级标准（必须严格执行）：
- 90-100 → grade="S级机会"
- 80-89 → grade="A级机会"
- 70-79 → grade="B级机会"
- 60-69 → grade="观察"
- 60以下 → grade="忽略"

最终决策 action（未持仓股票只有两态：买入/观察，不允许"持有"或"忽略"作为action）：
- aiScore>=80 且处于萌芽期/启动期/主升期 → "买入"
- 其余情况 → "观察"
硬性规则：换手率<1%或市场环境评分<50时，action最多为"观察"，不能是"买入"。

主线判断 mainlineLevel（S/A/B/hotspot/none）：sectorScore>=85 → S；>=80 → A；>=70 → B；高分但缺乏持续性证据 → hotspot；其余 → none。

输出JSON数组（只返回JSON，不要其他文字，action必须是中文）：
[{"name":"股票名","sectorScore":数字,"leaderScore":数字,"growthLevel":"高成长/中成长/低成长","growthReason":"原因","trend":"up/side/down","wave":"萌芽期/启动期/主升期/疯狂期/衰退期/死亡期","action":"买入/观察","riskTime":"风险描述","aiScore":数字,"grade":"评级","gradeColor":"grade-s/grade-a/grade-b/grade-c/grade-ignore","mainlineLevel":"S/A/B/hotspot/none","mainlineLabel":"S级主线/A级主线/B级主线/短期热点/非主线"}]`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
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
