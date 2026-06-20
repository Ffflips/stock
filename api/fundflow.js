// 模块2：资金地图系统 —— 真实行业资金流向（非估算/非编造数据）
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    // m:90+t:2 = 东方财富行业板块分类，按f62主力净流入排序
    const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=15&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f62,f184,f3`;
    const r = await fetch(url, { headers: { Referer: 'https://www.eastmoney.com/' }, signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    const diff = data?.data?.diff || [];

    if (!diff.length) {
      return res.json({ success: false, error: 'no fundflow data' });
    }

    const list = diff.map(d => ({
      name: d.f14,
      code: d.f12,
      netInflow: d.f62, // 元
      netInflowYi: (d.f62 / 1e8).toFixed(2), // 亿元
      ratio: d.f184, // 主力净占比%
      pct: d.f3,
    })).filter(d => d.name && d.netInflow != null);

    const sorted = [...list].sort((a, b) => b.netInflow - a.netInflow);
    const inflow = sorted.slice(0, 8);
    const outflow = sorted.slice(-8).reverse();

    res.json({ success: true, inflow, outflow, updateTime: new Date().toLocaleTimeString('zh-CN') });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
