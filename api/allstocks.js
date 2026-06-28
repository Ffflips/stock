// 全市场扫描：不限行业，直接拉取全A股涨跌幅排行
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { mode = 'up', page = 1 } = req.query;
  const po = mode === 'up' ? 1 : 0; // 1=降序(涨幅榜) 0=升序(跌幅榜)

  try {
    // fs 覆盖：沪A + 深A + 创业板 + 科创板
    const fs = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048';
    const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=${page}&pz=50&po=${po}&np=1&fltt=2&invt=2&fid=f3&fs=${fs}&fields=f2,f3,f8,f12,f14,f15,f100`;
    const r = await fetch(url, {
      headers: { Referer: 'https://www.eastmoney.com/' },
      signal: AbortSignal.timeout(5000)
    });
    const data = await r.json();
    const diff = data?.data?.diff || [];

    // 过滤无效数据（停牌/退市/无价格）
    const valid = diff.filter(d =>
      d.f3 != null && d.f3 > -999 && d.f2 > 0 &&
      d.f14 && !d.f14.includes('退') && !d.f14.includes('ST')
    );

    const stocks = valid.map(d => ({
      code: d.f12,
      name: d.f14,
      price: d.f2,
      pct: d.f3,
      yest: d.f15 > 0 ? d.f15 : null,
      turnover: d.f8 != null ? d.f8 : null,
      sector: d.f100 || '未分类', // f100 = 所属行业
    }));

    res.json({ success: true, stocks, total: data?.data?.total || 0 });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
