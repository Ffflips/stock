// 模块1：市场环境系统 —— 判断当前是否适合交易
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    // 上证指数 1.000001，深证成指 0.399001
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f12,f14&secids=1.000001,0.399001`;
    const r = await fetch(url, { headers: { Referer: 'https://www.eastmoney.com/' }, signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    const diff = data?.data?.diff || [];
    const sh = diff.find(d => d.f12 === '000001');
    const sz = diff.find(d => d.f12 === '399001');

    if (!sh && !sz) {
      return res.json({ success: false, error: 'no index data' });
    }

    const shPct = sh ? parseFloat(sh.f3) : null;
    const szPct = sz ? parseFloat(sz.f3) : null;
    const validPcts = [shPct, szPct].filter(p => p != null);
    const avgPct = validPcts.reduce((a, b) => a + b, 0) / validPcts.length;

    // 市场环境评分：基于指数涨跌幅换算，60分为中性基准
    // 大涨(>1.5%)接近积极环境上限，大跌(<-1.5%)接近高风险环境下限
    let score = 60 + avgPct * 13;
    score = Math.max(5, Math.min(98, Math.round(score)));

    let label, tier;
    if (score >= 90) { label = '牛市主升环境'; tier = 'excellent'; }
    else if (score >= 80) { label = '积极交易环境'; tier = 'good'; }
    else if (score >= 70) { label = '正常交易环境'; tier = 'normal'; }
    else if (score >= 60) { label = '谨慎交易环境'; tier = 'caution'; }
    else if (score >= 50) { label = '防守环境'; tier = 'defensive'; }
    else if (score >= 40) { label = '高风险环境'; tier = 'risky'; }
    else { label = '禁止重仓环境'; tier = 'danger'; }

    res.json({
      success: true,
      score, label, tier,
      shPct, szPct,
      detail: `上证${shPct!=null?(shPct>=0?'+':'')+shPct.toFixed(2)+'%':'--'} 深证${szPct!=null?(szPct>=0?'+':'')+szPct.toFixed(2)+'%':'--'}`
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
