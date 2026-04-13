/* =============================================
   app_v2.js — Süper Lig 4 Büyükler Özel
   ============================================= */

const BOT_API_URL = 'veri-cek.php';

const TR_DAYS_FULL = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const TR_MONTHS = ['OCA','ŞUB','MAR','NİS','MAY','HAZ','TEM','AĞU','EYL','EKİ','KAS','ARA'];

const TEAM_INFOS = {
  'FENERBAHÇE': { bg: '#002d72', fg: '#ffed00', short: 'FB' },
  'GALATASARAY': { bg: '#a32638', fg: '#fdb912', short: 'GS' },
  'BEŞİKTAŞ': { bg: '#000000', fg: '#ffffff', short: 'BJK' },
  'TRABZONSPOR': { bg: '#800000', fg: '#87CEEB', short: 'TS' }
};

// ─── State ──────────────────────────────────────────────
let weekOffset    = 0;
let baseWeek      = null; 
let pageCache     = {};   

// ─── DOM Refs ────────────────────────────────────────────
const elLoading   = document.getElementById('loading');
const elError     = document.getElementById('error-container');
const elEmpty     = document.getElementById('empty-container');
const elDays      = document.getElementById('days-container');
const elErrMsg    = document.getElementById('error-msg');
const elWeekLabel = document.getElementById('week-label');
const elWeekDates = document.getElementById('week-dates');
const elBtnPrev   = document.getElementById('btn-prev');
const elBtnNext   = document.getElementById('btn-next');

function showState(state) {
  elLoading.style.display = state === 'loading' ? 'flex' : 'none';
  elError.style.display   = state === 'error'   ? 'flex' : 'none';
  elEmpty.style.display   = state === 'empty'   ? 'flex' : 'none';
  elDays.style.display    = state === 'data'    ? 'flex' : 'none';
}

// ─── API Fetch (cache'li) ─────────────────────────────────
async function fetchWeekData(weekNum) {
  if (pageCache[weekNum]) return pageCache[weekNum];
  const url = weekNum > 0 ? `${BOT_API_URL}?hafta=${weekNum}` : BOT_API_URL;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Veri çekilemedi');
  pageCache[weekNum] = data;
  return data;
}

function fmtDate(isoStr) {
  if (!isoStr) return '?';
  const p = isoStr.split('-');
  if (p.length !== 3) return isoStr;
  return `${p[2]} ${TR_MONTHS[parseInt(p[1])-1]}`;
}

function isBig4(name) {
  if (!name) return false;
  const n = name.toUpperCase();
  return n.includes('FENERBAHÇE') || n.includes('GALATASARAY') || 
         n.includes('BEŞİKTAŞ') || n.includes('TRABZONSPOR');
}

// ─── Render ───────────────────────────────────────────────
async function renderWeek() {
  showState('loading');

  try {
    const targetWeek = baseWeek !== null ? (baseWeek + weekOffset) : 0;
    const data = await fetchWeekData(targetWeek);

    if (baseWeek === null) {
      baseWeek = data.currentWeek || 1;
    }

    const currentWeekNum = baseWeek + weekOffset;

    elWeekLabel.textContent = 'MATCHWEEK ' + currentWeekNum;
    elBtnPrev.disabled = currentWeekNum <= 1;
    elBtnNext.disabled = currentWeekNum >= 38;

    let matches = data.data || [];
    
    // Yalnızca 4 büyükleri filtrele
    matches = matches.filter(m => isBig4(m.homeName) || isBig4(m.awayName));

    if (!matches.length) {
      elWeekDates.textContent = '— / — / —';
      showState('empty');
      return;
    }

    let minDate = null, maxDate = null;
    matches.forEach(m => {
      if (m.isoDate) {
        const p = m.isoDate.split('-');
        const dObj = new Date(Date.UTC(+p[0], +p[1]-1, +p[2]));
        m.dateObj = dObj;
        if (!minDate || dObj < minDate) minDate = dObj;
        if (!maxDate || dObj > maxDate) maxDate = dObj;
      }
    });

    if (minDate && maxDate) {
      if (minDate.getTime() === maxDate.getTime()) {
        elWeekDates.textContent = fmtDate(minDate.toISOString().slice(0,10));
      } else {
        elWeekDates.textContent = `${fmtDate(minDate.toISOString().slice(0,10))} · ${fmtDate(maxDate.toISOString().slice(0,10))}`;
      }
    } else {
      elWeekDates.textContent = 'MAÇ TARİHLERİ BELLİ DEĞİL';
    }

    elDays.innerHTML = '';

    // Maçları tarihlerine göre listele (gruplama yok, alt alta)
    matches.sort((a, b) => {
        if (!a.dateObj && !b.dateObj) return 0;
        if (!a.dateObj) return 1;
        if (!b.dateObj) return -1;
        return a.dateObj.getTime() - b.dateObj.getTime();
    });

    const list = document.createElement('div');
    list.className = 'matches-list';
    
    matches.forEach(m => {
        list.appendChild(buildCard(m));
    });
    
    elDays.appendChild(list);

    showState('data');

  } catch (err) {
    console.error(err);
    elErrMsg.textContent = 'Sunucudan veriler alınırken hata oluştu.';
    showState('error');
  }
}

// ─── Takım Logosu / Renkleri ──────────────────────────────
function getTeamIcon(name) {
    const n = (name || '').toUpperCase();
    let info = { bg: '#2b3040', fg: '#8a94a6', short: n.substring(0, 3) }; // Varsayılan renkler
    
    if (n.includes('FENERBAHÇE')) info = TEAM_INFOS['FENERBAHÇE'];
    else if (n.includes('GALATASARAY')) info = TEAM_INFOS['GALATASARAY'];
    else if (n.includes('BEŞİKTAŞ')) info = TEAM_INFOS['BEŞİKTAŞ'];
    else if (n.includes('TRABZONSPOR')) info = TEAM_INFOS['TRABZONSPOR'];

    return `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${info.bg}" stroke="${info.fg}" stroke-width="2"/>
        <text x="20" y="25" font-size="12" font-weight="bold" font-family="Inter,sans-serif" fill="${info.fg}" text-anchor="middle">${info.short}</text>
      </svg>
    `;
}

// ─── Build Card ───────────────────────────────────────────
function buildCard(m) {
  const homeWin = m.homeGoals !== null && m.awayGoals !== null && m.homeGoals > m.awayGoals;
  const awayWin = m.homeGoals !== null && m.awayGoals !== null && m.awayGoals > m.homeGoals;

  const card = document.createElement('div');
  const statusClass = m.isLive ? 'live' : (m.isFinished ? 'finished' : 'upcoming');
  card.className = `match-card ${statusClass}`;

  let badgeHtml = '';
  if (m.isFinished) badgeHtml = `<span class="card-badge badge-final">FINAL</span>`;
  else              badgeHtml = `<span class="card-badge badge-upcoming">UPCOMING</span>`;

  let centerHtml = '';
  if (m.isFinished) {
    const h = m.homeGoals;
    const a = m.awayGoals;
    centerHtml = `
      <div class="score-board">
        <span class="score-num ${homeWin ? 'higher':''}">${h}</span>
        <span class="score-sep">-</span>
        <span class="score-num ${awayWin ? 'higher':''}">${a}</span>
      </div>`;
  } else {
    centerHtml = `<div class="card-vs">V</div>`;
  }

  const dow = m.dateObj ? m.dateObj.getUTCDay() : null;
  const dayName = dow !== null ? TR_DAYS_FULL[dow].toUpperCase() : 'BİLİNMEYEN GÜN';

  card.innerHTML = `
    <div class="card-top">
      <div class="card-meta">
        <span class="card-time">${m.time || '??:??'}</span>
        ${badgeHtml}
      </div>
      <!-- "beIN SPORTS" yerine GÜN adını yazıyoruz -->
      <span class="card-channel" style="color:#e2f520;">${dayName}</span>
    </div>
    
    <div class="card-match">
      <div class="team-block home">
        <div class="team-badge-custom" style="display:flex; justify-content:center; margin-bottom:8px;">
          ${getTeamIcon(m.homeName)}
        </div>
        <span class="team-name ${homeWin?'winner':''}">${m.homeName||'—'}</span>
      </div>
      
      <div class="card-center">${centerHtml}</div>
      
      <div class="team-block away">
        <div class="team-badge-custom" style="display:flex; justify-content:center; margin-bottom:8px;">
          ${getTeamIcon(m.awayName)}
        </div>
        <span class="team-name ${awayWin?'winner':''}">${m.awayName||'—'}</span>
      </div>
    </div>
    
    <div class="card-bottom">
      <span class="card-round">HAFTA ${m.roundNum||'—'}</span>
      <span class="card-stadium">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        SÜPER LİG
      </span>
    </div>
  `;
  return card;
}

// ─── Events ───────────────────────────────────────────────
elBtnPrev.addEventListener('click', async () => {
  weekOffset--;
  await renderWeek();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

elBtnNext.addEventListener('click', async () => {
  weekOffset++;
  await renderWeek();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('btn-retry').addEventListener('click', () => {
  baseWeek = null;
  weekOffset = 0;
  pageCache = {};
  renderWeek();
});

// Init
renderWeek();
