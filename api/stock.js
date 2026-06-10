export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { codes, sectors, po = '1' } = req.query;
  
  let fs;
  if(codes) {
    // 按精确代码查询
    const codeList = codes.split(',').map(c => c.trim());
    fs = codeList.join('+b:');
    // 东方财富按代码查询格式
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f12,f14,f15&secids=${codeList.join(',')}`;
    try {
      const response = await fetch(url, { headers: { Referer: 'https://www.eastmoney.com/' } });
      const data = await response.json();
      res.json(data);
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    // 按板块查询
    const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=100&po=${po}&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=b:${sectors}&fields=f2,f3,f12,f14,f15`;
    try {
      const response = await fetch(url, { headers: { Referer: 'https://www.eastmoney.com/' } });
      const data = await response.json();
      res.json(data);
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  }
}
