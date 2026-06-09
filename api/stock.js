export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sectors = 'BK0989+b:BK0732+b:BK0714+b:BK1043', po = '1' } = req.query;
  const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=100&po=${po}&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=b:${sectors}&fields=f2,f3,f12,f14`;
  const response = await fetch(url, { headers: { Referer: 'https://www.eastmoney.com/' } });
  const data = await response.json();
  res.json(data);
}
