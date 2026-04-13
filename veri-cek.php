<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$hafta = isset($_GET['hafta']) && (int)$_GET['hafta'] > 0 ? (int)$_GET['hafta'] : 0;
$url   = $hafta > 0
       ? 'http://www.tff.org/default.aspx?pageID=198&hafta=' . $hafta
       : 'http://www.tff.org/default.aspx?pageID=198';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,            $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT,        20);
curl_setopt($ch, CURLOPT_HTTPHEADER,     array('Accept-Language: tr','User-Agent: Mozilla/5.0'));
$html    = curl_exec($ch);
$curlErr = curl_error($ch);
curl_close($ch);

if (!$html) { 
    echo json_encode(array('success'=>false,'message'=>$curlErr)); 
    exit; 
}
$html = iconv('windows-1254', 'UTF-8//IGNORE', $html);

// Aktif hafta
$currentWeek = 0;
preg_match('/haftaNoActive[^>]*>\s*<a[^>]*>(\d+)<\/a>/i', $html, $wm);
if ($wm) $currentWeek = (int)$wm[1];

// Tüm CTL indekslerini bul (ctl01, ctl02, ...)
preg_match_all('/dtlHaftaninMaclari_(ctl\d+)_lblTarih[^>]*>([^<]+)<\/span>/i', $html, $tarihler);

$fixtures = array();
if (isset($tarihler[1]) && count($tarihler[1]) > 0) {
    foreach ($tarihler[1] as $i => $ctl) {
        $pfx  = 'dtlHaftaninMaclari_' . $ctl . '_';
        $date = trim($tarihler[2][$i]);

        // Saat
        preg_match('/' . $pfx . 'lblSaat[^>]*>([^<]+)<\/span>/i', $html, $m);
        $time = trim(isset($m[1]) ? $m[1] : '');

        // Ev sahibi (Label4)
        preg_match('/' . $pfx . 'Label4[^>]*>([^<]+)<\/span>/i', $html, $m);
        $home = cleanName(trim(isset($m[1]) ? $m[1] : ''));

        // Deplasman (Label1)
        preg_match('/' . $pfx . 'Label1[^>]*>([^<]+)<\/span>/i', $html, $m);
        $away = cleanName(trim(isset($m[1]) ? $m[1] : ''));

        // Skor ev (Label5)
        preg_match('/' . $pfx . 'Label5[^>]*>(\d+)<\/span>/i', $html, $m);
        $hg   = isset($m[1]) ? (int)$m[1] : null;

        // Skor dep (Label6)
        preg_match('/' . $pfx . 'Label6[^>]*>(\d+)<\/span>/i', $html, $m);
        $ag   = isset($m[1]) ? (int)$m[1] : null;

        $done = ($hg !== null && $ag !== null);

        $dp = explode('.', $date);
        $iso = count($dp) === 3 ? $dp[2].'-'.$dp[1].'-'.$dp[0] : '';

        $fixtures[] = array(
            'id'         => $i + 1,
            'date'       => $date,
            'isoDate'    => $iso,
            'time'       => $time,
            'homeName'   => $home,
            'awayName'   => $away,
            'homeGoals'  => $hg,
            'awayGoals'  => $ag,
            'isFinished' => $done,
            'isLive'     => false,
            'roundNum'   => $currentWeek,
            'venue'      => ''
        );
    }
}

echo json_encode(array(
    'success'     => true,
    'currentWeek' => $currentWeek,
    'count'       => count($fixtures),
    'data'        => $fixtures
));

function cleanName($n) {
    return trim(str_replace(array(
        ' A.Ş.',' FUTBOL KULÜBÜ','NATURA DÜNYASI ',
        'HESAP.COM ','MISIRLI.COM.TR ','ZECORNER ',
        'CORENDON ','TÜMOSAN ','İKAS '
    ), '', $n));
}
?>
