export default async function handler(req, res) {
  const hafta = parseInt(req.query.hafta) > 0 ? parseInt(req.query.hafta) : 0;
  const url = hafta > 0 
    ? `http://www.tff.org/default.aspx?pageID=198&hafta=${hafta}`
    : `http://www.tff.org/default.aspx?pageID=198`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'tr',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(500).json({ success: false, message: 'URL fetch failed' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder('windows-1254');
    const html = decoder.decode(arrayBuffer);

    let currentWeek = 0;
    const wm = html.match(/haftaNoActive[^>]*>\s*<a[^>]*>(\d+)<\/a>/i);
    if (wm) currentWeek = parseInt(wm[1], 10);

    const fixtures = [];
    
    // PHP equivalents
    const tarihRegex = /dtlHaftaninMaclari_(ctl\d+)_lblTarih[^>]*>([^<]+)<\/span>/ig;
    let match;
    let index = 1;

    while ((match = tarihRegex.exec(html)) !== null) {
      const ctl = match[1];
      const date = match[2].trim();
      const pfx = `dtlHaftaninMaclari_${ctl}_`;

      const timeM = html.match(new RegExp(pfx + 'lblSaat[^>]*>([^<]+)<\\/span>', 'i'));
      const time = timeM ? timeM[1].trim() : '';

      const homeM = html.match(new RegExp(pfx + 'Label4[^>]*>([^<]+)<\\/span>', 'i'));
      const home = cleanName(homeM ? homeM[1].trim() : '');

      const awayM = html.match(new RegExp(pfx + 'Label1[^>]*>([^<]+)<\\/span>', 'i'));
      const away = cleanName(awayM ? awayM[1].trim() : '');

      const hgM = html.match(new RegExp(pfx + 'Label5[^>]*>(\\d+)<\\/span>', 'i'));
      const hg = hgM ? parseInt(hgM[1], 10) : null;

      const agM = html.match(new RegExp(pfx + 'Label6[^>]*>(\\d+)<\\/span>', 'i'));
      const ag = agM ? parseInt(agM[1], 10) : null;

      const done = (hg !== null && ag !== null);

      const dp = date.split('.');
      const iso = dp.length === 3 ? `${dp[2]}-${dp[1]}-${dp[0]}` : '';

      fixtures.push({
        id: index++,
        date: date,
        isoDate: iso,
        time: time,
        homeName: home,
        awayName: away,
        homeGoals: hg,
        awayGoals: ag,
        isFinished: done,
        isLive: false,
        roundNum: currentWeek,
        venue: ''
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    res.status(200).json({
      success: true,
      currentWeek: currentWeek,
      count: fixtures.length,
      data: fixtures
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

function cleanName(n) {
  const removeList = [
    ' A.Ş.', ' FUTBOL KULÜBÜ', 'NATURA DÜNYASI ',
    'HESAP.COM ', 'MISIRLI.COM.TR ', 'ZECORNER ',
    'CORENDON ', 'TÜMOSAN ', 'İKAS '
  ];
  let clean = n.trim();
  for (const rm of removeList) {
    clean = clean.replace(new RegExp(rm, 'gi'), '');
  }
  return clean.trim();
}
