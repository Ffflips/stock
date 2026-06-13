export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'no query' });

  try {
    // 使用新浪股票搜索接口
    const url = `https://suggest3.sinajs.cn/suggest/type=11,12,13,14,15&key=${encodeURIComponent(q)}&name=suggestdata_${Date.now()}`;
    const r = await fetch(url, {
      headers: { Referer: 'https://finance.sina.com.cn/' },
      signal: AbortSignal.timeout(5000)
    });
    const text = await r.text();

    // 解析格式: var suggestdata_xxx="代码,1,名称,简拼,sh600519,贵州茅台,..."
    const match = text.match(/"([^"]*)"/);
    if (!match || !match[1]) return res.json({ results: [] });

    const items = match[1].split(';').filter(Boolean);
    const results = items.map(item => {
      const parts = item.split(',');
      // parts[3] 通常是 sh600519 或 sz000001 格式
      const code = parts[3] || parts[0];
      const name = parts[4] || parts[2] || '';
      if (!/^(sh|sz)\d{6}$/.test(code)) return null;
      return { code, name };
    }).filter(Boolean).slice(0, 5);

    res.json({ results });
  } catch(e) {
    res.status(500).json({ error: e.message, results: [] });
  }
}
