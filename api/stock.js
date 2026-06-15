export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { codes } = req.query;
  if (!codes) return res.status(400).json({ error: 'no codes' });

  const codeList = decodeURIComponent(codes).split(',').map(c => c.trim());

  // 构建东方财富secids格式
  const secids = codeList.map(c => {
    const num = c.replace('sh','').replace('sz','');
    const prefix = c.startsWith('sh') ? '1' : '0';
    return `${prefix}.${num}`;
  }).join('%2C');

  const emUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f12,f14,f15&secids=${secids}`;

  let emData = null;
  try {
    const emRes = await fetch(emUrl, { headers: { Referer: 'https://www.eastmoney.com/' }, signal: AbortSignal.timeout(4000) });
    emData = await emRes.json();
    const diff = emData?.data?.diff || [];
    const valid = diff.filter(d => d.f3 != null && d.f3 > -9999 && d.f2 > 0);
    if (valid.length > 0) {
      return res.json(emData);
    }
  } catch(e) {
    // 东方财富失败，继续走新浪兜底
  }

  try {
    // 东方财富无数据或失败，改用新浪财经
    const sinaSymbols = codeList.join(',');
    const sinaUrl = `https://hq.sinajs.cn/list=${sinaSymbols}`;
    const sinaRes = await fetch(sinaUrl, {
      headers: {
        Referer: 'https://finance.sina.com.cn/',
        'Accept-Encoding': 'gzip'
      },
      signal: AbortSignal.timeout(5000)
    });
    const sinaText = await sinaRes.text();

    // 解析新浪数据格式: var hq_str_sh600000="股票名,今开,昨收,现价,最高,最低,...";
    const parsedDiff = [];
    const lines = sinaText.split('\n');
    lines.forEach(line => {
      const match = line.match(/hq_str_(sh|sz)(\d+)="([^"]+)"/);
      if (!match) return;
      const prefix = match[1];
      const num = match[2];
      const parts = match[3].split(',');
      if (parts.length < 10) return;
      const name = parts[0];
      const yestClose = parseFloat(parts[2]);
      const price = parseFloat(parts[3]);
      if (!price || !yestClose) return;
      const pct = ((price - yestClose) / yestClose * 100);
      parsedDiff.push({
        f12: num,
        f14: name,
        f2: Math.round(price * 100),
        f3: Math.round(pct * 100) / 100,
        f15: Math.round(yestClose * 100),
      });
    });

    // 包装成和东方财富一样的格式
    return res.json({ data: { diff: parsedDiff } });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
