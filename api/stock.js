export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { codes, sectors, po = '1' } = req.query;

  try {
    let url;
    if (codes) {
      const list = decodeURIComponent(codes).split(',').map(c => c.trim());
      const secids = list.map(c => {
        const num = c.replace('sh','').replace('sz','');
        const prefix = c.startsWith('sh') ? '1' : '0';
        return `${prefix}.${num}`;
      }).join('%2C');
      url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f12,f14,f15&secids=${secids}`;
    } else {
      const s = decodeURIComponent(sectors || 'BK0989');
      url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=100&po=${po}&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=b:${s}&fields=f2,f3,f12,f14,f15`;
    }
    const response = await fetch(url, { headers: { Referer: 'https://www.eastmoney.com/' } });
    const data = await response.json();
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
