/* ==========================================================
   ZYROX STORE — Main Application
   DEV ARJUN RAJPUT 👑
   Fast ⚡ Secure 🛡️ Smart 🤖 Premium
   ========================================================== */

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const LS = {
  get: (k,d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k,v) => localStorage.setItem(k, JSON.stringify(v))
};

/* ---------- SPLASH ---------- */
(function splash(){
  const bar = $('#splashBar');
  let p = 0;
  const interval = setInterval(() => {
    p += Math.random()*18 + 7;
    if (p >= 100) { p = 100; clearInterval(interval); setTimeout(showApp, 280); }
    if(bar) bar.style.width = p+'%';
  }, 160);

  // particles
  const pc = $('#splashParticles');
  if (pc) {
    for (let i = 0; i < 28; i++) {
      const d = document.createElement('div');
      d.className = 'particle';
      d.style.left = Math.random()*100+'%';
      d.style.animationDuration = (Math.random()*4+3)+'s';
      d.style.animationDelay = (Math.random()*3)+'s';
      d.style.width = d.style.height = (Math.random()*3+2)+'px';
      pc.appendChild(d);
    }
  }
})();

function showApp(){
  $('#splash').style.transition = 'opacity .5s, transform .5s';
  $('#splash').style.opacity = '0';
  $('#splash').style.transform = 'scale(1.05)';
  setTimeout(() => {
    $('#splash').classList.add('hidden');
    $('#app').classList.remove('hidden');
    init();
  }, 500);
}

/* ---------- GLOBALS ---------- */
let APPS = null;
let CURRENT_PAGE = 'home';
let SEARCH_FILTERS = { category:'all', sort:'downloads' };
let DOWNLOADS = LS.get('zx_dls',[]);
let LIBRARY = LS.get('zx_lib',{ favorites:[], installed:[], history:[] });
let USER = LS.get('zx_user',{ name:'User', joined:'2026-09-04', theme:'dark', lang:'en', notifs:true });

/* ---------- INIT ---------- */
async function init(){
  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  // Load apps data
  try {
    const res = await fetch('data/apps.json');
    APPS = await res.json();
  } catch(e){
    console.error('Failed to load apps', e);
    APPS = { featured:[], trending:[], editors_choice:[], new_releases:[], hidden_gems:[], popular_games:[], popular_tools:[], ai_apps:[], categories:[] };
  }

  // Build home
  renderPage('home');

  // Nav
  $$('.nav-item').forEach(b => b.addEventListener('click', () => {
    $$('.nav-item').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderPage(b.dataset.page);
  }));

  // Search
  let sTimer;
  $('#searchInput').addEventListener('input', e => {
    clearTimeout(sTimer);
    sTimer = setTimeout(() => {
      if (e.target.value.trim()) renderSearch(e.target.value.trim());
      else if (CURRENT_PAGE !== 'home') renderPage('home');
    }, 250);
  });
  $('#searchInput').addEventListener('focus', () => {
    if ($('#searchInput').value.trim()) renderSearch($('#searchInput').value.trim());
  });

  // AI
  $('#aiBtn').addEventListener('click', openAI);
  $('#aiClose').addEventListener('click', closeAI);
  $('#aiSend').addEventListener('click', sendAIMessage);
  $('#aiInput').addEventListener('keydown', e => { if(e.key==='Enter') sendAIMessage(); });
  $$('.sugg-chip').forEach(c => c.addEventListener('click', () => {
    $('#aiInput').value = c.textContent;
    sendAIMessage();
  }));

  // Notifications
  $('#notifBtn').addEventListener('click', () => toast('🔔 You have 3 new notifications'));
  $('#profileBtn').addEventListener('click', () => {
    $$('.nav-item').forEach(x => x.classList.remove('active'));
    $$('.nav-item[data-page="profile"]')[0].classList.add('active');
    renderPage('profile');
  });

  // Sheet backdrop
  $('#sheetBackdrop').addEventListener('click', closeSheet);
}

/* ---------- ALL APPS FLAT ---------- */
function allApps(){
  const seen = new Set();
  const list = [];
  const push = (a, from) => {
    if (!a || seen.has(a.id)) return;
    seen.add(a.id);
    a._from = from;
    list.push(a);
  };
  (APPS.featured||[]).forEach(a => push(a,'Featured'));
  (APPS.trending||[]).forEach(a => push(a,'Trending'));
  (APPS.editors_choice||[]).forEach(a => push(a,"Editor's Choice"));
  (APPS.new_releases||[]).forEach(a => push(a,'New'));
  (APPS.hidden_gems||[]).forEach(a => push(a,'Gems'));
  (APPS.popular_games||[]).forEach(a => push(a,'Games'));
  (APPS.popular_tools||[]).forEach(a => push(a,'Tools'));
  (APPS.ai_apps||[]).forEach(a => push(a,'AI'));
  return list;
}
function getApp(id){ return allApps().find(a => a.id === id); }

/* ---------- PAGE ROUTER ---------- */
function renderPage(page){
  CURRENT_PAGE = page;
  const m = $('#main');
  switch(page){
    case 'home': m.innerHTML = pageHome(); bindHome(); break;
    case 'explore': m.innerHTML = pageExplore(); bindExplore(); break;
    case 'downloads': m.innerHTML = pageDownloads(); bindDownloads(); break;
    case 'library': m.innerHTML = pageLibrary(); bindLibrary(); break;
    case 'profile': m.innerHTML = pageProfile(); bindProfile(); break;
    case 'gems': m.innerHTML = pageGems(); break;
    case 'leaderboard': m.innerHTML = pageLeaderboard(); break;
    case 'developer': m.innerHTML = pageDeveloper(); break;
    case 'security': m.innerHTML = pageSecurity(); break;
    case 'compare': m.innerHTML = pageCompare(); break;
    case 'updates': m.innerHTML = pageUpdates(); bindUpdates(); break;
    default: m.innerHTML = pageHome();
  }
  m.scrollTop = 0;
}

/* ---------- HELPERS ---------- */
const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5-Math.round(r));
const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'K' : n;
function iconImg(a, size){
  return `<img src="${a.icon}" alt="${a.name}" class="${size?'icon':'icon vrf'}" ${a.verified?'style="box-shadow:0 4px 20px rgba(0,0,0,.5),0 0 0 2px rgba(0,229,255,.4)"':''}>`;
}
function appCard(a){
  return `<div class="app-card" data-id="${a.id}" onclick="openApp('${a.id}')">
    <img src="${a.icon}" alt="${a.name}" class="icon ${a.verified?'vrf':''}">
    <div class="name">${a.name}</div>
    <div class="meta">${a.size}</div>
    <div class="rating">${stars(a.rating)} ${a.rating}</div>
  </div>`;
}
function featuredCard(a){
  const banner = a.banner_gradient || 'linear-gradient(135deg,#00e5ff,#ff00d4)';
  return `<div class="featured-card" data-id="${a.id}" onclick="openApp('${a.id}')">
    <div class="banner" style="background:${banner}">
      <span class="tag">${a.featured_tag||'Featured'}</span>
    </div>
    <div class="body">
      <img src="${a.icon}" alt="${a.name}" class="icon">
      <div class="info">
        <div class="name">${a.name}</div>
        <div class="dev">${a.verified?'<span class="vrf-badge">✓ Verified</span>':''} ${a.developer}</div>
        <div class="stats">
          <span>⭐ ${a.rating}</span>
          <span>⬇ ${fmt(a.downloads||0)}</span>
          <span>📦 ${a.size}</span>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- HOME ---------- */
function pageHome(){
  const total = allApps().length;
  const totalDl = allApps().reduce((s,a)=>s+(a.downloads||0),0);
  const featured = (APPS.featured||[]).slice(0,3).map(featuredCard).join('');
  const trending = (APPS.trending||[]).slice(0,8).map(appCard).join('');
  const editors = (APPS.editors_choice||[]).slice(0,6).map(appCard).join('');
  const newR = (APPS.new_releases||[]).slice(0,6).map(appCard).join('');
  const gems = (APPS.hidden_gems||[]).slice(0,6).map(appCard).join('');
  const games = (APPS.popular_games||[]).slice(0,8).map(appCard).join('');
  const tools = (APPS.popular_tools||[]).slice(0,6).map(appCard).join('');
  const ai = (APPS.ai_apps||[]).slice(0,6).map(appCard).join('');
  const cats = (APPS.categories||[]).slice(0,8).map(c =>
    `<div class="cat-item" onclick="filterCat('${c.id}')"><div class="cat-emoji">${c.emoji}</div><div class="cat-label">${c.name}</div></div>`
  ).join('');

  return `
  <div class="page">
    <div class="hero">
      <span class="hero-badge">👑 ZYROX STORE</span>
      <h2>Discover Premium<br>Apps & Games</h2>
      <p>Secure, verified APK downloads curated for speed & quality. No trackers, no bullshit.</p>
      <div class="hero-stats">
        <div class="hero-stat"><div class="num">${total}+</div><div class="lbl">Apps</div></div>
        <div class="hero-stat"><div class="num">${fmt(totalDl)}</div><div class="lbl">Downloads</div></div>
        <div class="hero-stat"><div class="num">100%</div><div class="lbl">Verified</div></div>
        <div class="hero-stat"><div class="num">🛡️</div><div class="lbl">Secured</div></div>
      </div>
    </div>

    <div class="quick-tabs">
      <button class="q-tab active" onclick="quickTab(this,'all')">All</button>
      <button class="q-tab" onclick="quickTab(this,'games')">🎮 Games</button>
      <button class="q-tab" onclick="quickTab(this,'ai')">🤖 AI</button>
      <button class="q-tab" onclick="quickTab(this,'tools')">🛠️ Tools</button>
      <button class="q-tab" onclick="quickTab(this,'security')">🛡️ Security</button>
      <button class="q-tab" onclick="renderNavPage('gems')">💎 Hidden Gems</button>
      <button class="q-tab" onclick="renderNavPage('leaderboard')">🏆 Leaderboard</button>
    </div>

    <div class="sec-head"><div class="sec-title"><span class="emoji">🔥</span> Featured</div><button class="sec-action" onclick="renderNavPage('explore')">See all →</button></div>
    <div class="h-scroll">${featured}</div>

    <div class="sec-head"><div class="sec-title"><span class="emoji">📂</span> Browse Categories</div></div>
    <div class="cat-grid">${cats}</div>

    <div class="sec-head"><div class="sec-title"><span class="emoji">📈</span> Trending Now</div><button class="sec-action" onclick="renderNavPage('leaderboard')">Leaderboard →</button></div>
    <div class="h-scroll" data-qt="trending">${trending}</div>

    <div class="sec-head"><div class="sec-title"><span class="emoji">⭐</span> Editor's Choice</div></div>
    <div class="h-scroll" data-qt="editors">${editors}</div>

    <div class="sec-head"><div class="sec-title"><span class="emoji">🤖</span> AI Apps</div></div>
    <div class="h-scroll" data-qt="ai">${ai}</div>

    <div class="sec-head"><div class="sec-title"><span class="emoji">🆕</span> New Releases</div></div>
    <div class="h-scroll" data-qt="new">${newR}</div>

    <div class="sec-head"><div class="sec-title"><span class="emoji">💎</span> Hidden Gems</div><button class="sec-action" onclick="renderNavPage('gems')">See all →</button></div>
    <div class="h-scroll" data-qt="gems">${gems}</div>

    <div class="sec-head"><div class="sec-title"><span class="emoji">🎮</span> Popular Games</div></div>
    <div class="h-scroll" data-qt="games">${games}</div>

    <div class="sec-head"><div class="sec-title"><span class="emoji">🛠️</span> Popular Tools</div></div>
    <div class="h-scroll" data-qt="tools">${tools}</div>

    <div class="dev-credit"><span class="crown">👑</span> MADE BY DEV ARJUN RAJPUT</div>
  </div>`;
}

function bindHome(){
  // Quick tabs filter horizontal scrolls
}
function quickTab(btn, cat){
  $$('.q-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $$('.h-scroll').forEach(row => {
    const key = row.dataset.qt;
    if (!key || cat === 'all') { row.style.display = 'flex'; return; }
    const items = allApps().filter(a => (a._from||'').toLowerCase().includes(cat) || a.category === cat);
    if (items.length === 0) { row.style.display = 'none'; return; }
    row.innerHTML = items.slice(0,10).map(appCard).join('');
    row.style.display = 'flex';
  });
}
function filterCat(catId){
  renderNavPage('explore');
  setTimeout(() => {
    $$('.chip').forEach(c => c.classList.remove('active'));
    const chip = document.querySelector(`.chip[data-cat="${catId}"]`);
    if (chip) chip.classList.add('active');
    filterByCat(catId);
  },50);
}

/* ---------- EXPLORE ---------- */
function pageExplore(){
  const cats = (APPS.categories||[]).map(c =>
    `<button class="chip ${c.id==='all'?'active':''}" data-cat="${c.id}" onclick="filterByCat('${c.id}')">${c.emoji} ${c.name}</button>`
  ).join('');
  const sortChips = [
    {id:'downloads',l:'⬇ Most Downloaded'},{id:'rating',l:'⭐ Highest Rated'},
    {id:'updated',l:'🕐 Recently Updated'},{id:'new',l:'🆕 Newest'}
  ].map(s => `<button class="chip ${SEARCH_FILTERS.sort===s.id?'active':''}" onclick="sortBy('${s.id}')">${s.l}</button>`).join('');
  return `
  <div class="page">
    <div class="sec-head"><div class="sec-title"><span class="emoji">🔍</span> Explore</div></div>
    <div class="filter-chips">
      <button class="chip active" data-cat="all" onclick="filterByCat('all')">✨ All</button>
      ${cats}
    </div>
    <div class="filter-chips" style="margin-top:4px">${sortChips}</div>
    <div id="exploreList" style="padding:12px 20px"></div>
  </div>`;
}
function bindExplore(){
  filterByCat('all');
}
function filterByCat(cat){
  SEARCH_FILTERS.category = cat;
  $$('.chip[data-cat]').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
  renderExploreList();
}
function sortBy(s){
  SEARCH_FILTERS.sort = s;
  $$('.chip').forEach(c => {
    // highlight sort chips
  });
  renderExploreList();
}
function renderExploreList(){
  const el = $('#exploreList'); if (!el) return;
  let apps = allApps();
  if (SEARCH_FILTERS.category !== 'all') apps = apps.filter(a => a.category === SEARCH_FILTERS.category);
  switch(SEARCH_FILTERS.sort){
    case 'rating': apps.sort((a,b)=>(b.rating||0)-(a.rating||0)); break;
    case 'new': apps.sort((a,b)=>(b.id> a.id?1:-1)); break;
    case 'updated': apps.sort((a,b)=>((b.updated||'')>(a.updated||'')?1:-1)); break;
    default: apps.sort((a,b)=>(b.downloads||0)-(a.downloads||0));
  }
  if (!apps.length) { el.innerHTML = `<div class="empty-state"><div class="emoji">🔍</div><h3>No apps found</h3><p>Try a different category</p></div>`; return; }
  el.innerHTML = apps.map(a => `
    <div class="list-row" onclick="openApp('${a.id}')">
      <img src="${a.icon}" class="icon">
      <div class="info">
        <div class="name">${a.name} ${a.verified?'<span class="vrf-badge">✓</span>':''}</div>
        <div class="dev">${a.developer} · ${a.size}</div>
        <div class="sub">⭐ ${a.rating} · ⬇ ${fmt(a.downloads||0)}</div>
      </div>
      <button class="install-btn" onclick="event.stopPropagation();installApp('${a.id}')">GET</button>
    </div>`).join('');
}

/* ---------- SEARCH ---------- */
function renderSearch(q){
  CURRENT_PAGE = 'search';
  const m = $('#main');
  const ql = q.toLowerCase();
  let results = allApps().filter(a =>
    a.name.toLowerCase().includes(ql) ||
    (a.developer||'').toLowerCase().includes(ql) ||
    (a.category||'').toLowerCase().includes(ql) ||
    (a.tags||[]).some(t => t.toLowerCase().includes(ql)) ||
    (a.description||'').toLowerCase().includes(ql)
  );

  // Smart AI tags
  const tagMap = {
    'offline':['offline'], 'game':['games'], 'photo':['photo','camera'], 'editor':['photo','tools'],
    'study':['education','productivity'], 'launcher':['personalization','tools'],
    'ai':['ai'], 'music':['music'], 'small':[], 'mb':[]
  };

  m.innerHTML = `
  <div class="page">
    <div class="sec-head"><div class="sec-title"><span class="emoji">🔍</span> Results for "${q}"</div><div style="font-size:13px;color:var(--text-dim)">${results.length} apps</div></div>
    <div class="search-results" id="srList">
      ${results.length ? results.map(a => `
        <div class="list-row" onclick="openApp('${a.id}')">
          <img src="${a.icon}" class="icon">
          <div class="info">
            <div class="name">${a.name} ${a.verified?'<span class="vrf-badge">✓</span>':''}</div>
            <div class="dev">${a.developer} · ${a.category}</div>
            <div class="sub">⭐ ${a.rating} · 📦 ${a.size} · ⬇ ${fmt(a.downloads||0)}</div>
          </div>
          <button class="install-btn" onclick="event.stopPropagation();installApp('${a.id}')">GET</button>
        </div>`).join('') :
      `<div class="empty-state"><div class="emoji">🤖</div><h3>Ask ZYROX AI</h3><p>Can't find what you want? Try the AI assistant for smart recommendations.</p><button class="install-btn" style="margin-top:16px" onclick="openAI()">Ask AI 🤖</button></div>`}
    </div>
  </div>`;
  m.scrollTop = 0;
}

/* ---------- DOWNLOADS ---------- */
function pageDownloads(){
  const active = DOWNLOADS.filter(d => d.status === 'downloading' || d.status === 'paused');
  const history = DOWNLOADS.filter(d => d.status === 'completed' || d.status === 'failed');

  return `
  <div class="page">
    <div class="sec-head"><div class="sec-title"><span class="emoji">⬇️</span> Download Manager</div></div>
    ${active.length ? `<div style="padding:0 20px">${active.map(dlRow).join('')}</div>` :
      `<div class="empty-state"><div class="emoji">📥</div><h3>No active downloads</h3><p>Your downloads will appear here</p></div>`}
    ${history.length ? `<div class="sec-head"><div class="sec-title"><span class="emoji">📋</span> History</div></div><div>${history.map(dlRow).join('')}</div>`:''}
  </div>`;
}
function dlRow(d){
  const a = getApp(d.appId); if (!a) return '';
  const statusText = {
    downloading: `${d.speed||'1.2 MB/s'} · ${Math.floor(d.progress||0)}%`,
    paused:'Paused', completed:'Installed', failed:'Failed'
  }[d.status]||'Queued';
  const bar = d.status==='downloading' ? `<div class="dl-progress"><div class="fill" style="width:${d.progress||0}%"></div></div>` : '';
  const btn = d.status==='downloading'
    ? `<button class="install-btn open" onclick="pauseDl('${d.id}')">⏸</button>`
    : d.status==='paused' ? `<button class="install-btn" onclick="resumeDl('${d.id}')">▶</button>`
    : d.status==='failed' ? `<button class="install-btn" onclick="installApp('${a.id}')">↻</button>`
    : `<button class="install-btn open">✓</button>`;
  return `<div class="list-row">
    <img src="${a.icon}" class="icon">
    <div class="info">
      <div class="name">${a.name}</div>
      <div class="dev">${statusText}</div>
      ${bar}
    </div>
    ${btn}
  </div>`;
}
function bindDownloads(){}
function pauseDl(id){ const d = DOWNLOADS.find(x=>x.id===id); if(d){d.status='paused';LS.set('zx_dls',DOWNLOADS);renderPage('downloads');} }
function resumeDl(id){ simulateDownload(id); }
function simulateDownload(appId, existingId){
  const id = existingId || 'dl_'+Date.now();
  let dl = existingId ? DOWNLOADS.find(x=>x.id===id) : { id, appId, status:'downloading', progress:0, speed:'0 KB/s', startedAt:Date.now() };
  if (!existingId) DOWNLOADS.unshift(dl);
  dl.status = 'downloading';
  LS.set('zx_dls',DOWNLOADS);
  renderPage('downloads');
  const iv = setInterval(() => {
    dl.progress = (dl.progress||0) + Math.random()*7+3;
    dl.speed = (Math.random()*4+1).toFixed(1)+' MB/s';
    if (dl.progress >= 100) {
      dl.progress = 100; dl.status = 'completed';
      clearInterval(iv);
      LIBRARY.installed = LIBRARY.installed || [];
      if (!LIBRARY.installed.includes(appId)) LIBRARY.installed.push(appId);
      LIBRARY.history = LIBRARY.history || [];
      if (!LIBRARY.history.includes(appId)) LIBRARY.history.unshift(appId);
      LS.set('zx_lib', LIBRARY);
      toast('✅ Download complete');
    }
    LS.set('zx_dls', DOWNLOADS);
    if (CURRENT_PAGE === 'downloads') renderPage('downloads');
  }, 400);
}

/* ---------- LIBRARY ---------- */
function pageLibrary(){
  const favs = LIBRARY.favorites.map(getApp).filter(Boolean);
  const inst = LIBRARY.installed.map(getApp).filter(Boolean);
  const hist = LIBRARY.history.map(getApp).filter(Boolean);
  return `
  <div class="page">
    <div class="sec-head"><div class="sec-title"><span class="emoji">❤️</span> My Library</div></div>

    <div class="quick-tabs">
      <button class="q-tab active" onclick="libTab(this,'favs')">Favorites (${favs.length})</button>
      <button class="q-tab" onclick="libTab(this,'installed')">Installed (${inst.length})</button>
      <button class="q-tab" onclick="libTab(this,'history')">History (${hist.length})</button>
      <button class="q-tab" onclick="renderNavPage('updates')">🔄 Updates</button>
    </div>

    <div id="libList" style="padding-top:8px">
      ${favs.length ? favs.map(libRow).join('') :
        `<div class="empty-state"><div class="emoji">💔</div><h3>No favorites yet</h3><p>Tap the ♡ on any app to save it here</p></div>`}
    </div>
  </div>`;
}
function libRow(a){
  const installed = LIBRARY.installed.includes(a.id);
  return `<div class="list-row" onclick="openApp('${a.id}')">
    <img src="${a.icon}" class="icon">
    <div class="info">
      <div class="name">${a.name} ${a.verified?'<span class="vrf-badge">✓</span>':''}</div>
      <div class="dev">${a.developer} · ${a.size}</div>
      <div class="sub">⭐ ${a.rating} · ⬇ ${fmt(a.downloads||0)}</div>
    </div>
    <button class="install-btn ${installed?'open':''}" onclick="event.stopPropagation();${installed?`toast('Already installed')`:`installApp('${a.id}')`}">${installed?'OPEN':'GET'}</button>
  </div>`;
}
function libTab(btn, tab){
  $$('.q-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const list = tab==='favs' ? LIBRARY.favorites : tab==='installed' ? LIBRARY.installed : LIBRARY.history;
  const apps = list.map(getApp).filter(Boolean);
  const el = $('#libList');
  el.innerHTML = apps.length ? apps.map(libRow).join('') : `<div class="empty-state"><div class="emoji">📭</div><h3>Nothing here yet</h3></div>`;
}
function bindLibrary(){}

/* ---------- UPDATES ---------- */
function pageUpdates(){
  // Simulate updates available for installed apps
  const available = LIBRARY.installed.map(id => {
    const a = getApp(id);
    if (!a) return null;
    return { ...a, newVersion: (a.version||'1.0')+'.1', updateSize: a.size, changelog:'Bug fixes, performance improvements, and new features.' };
  }).filter(Boolean);
  return `
  <div class="page">
    <div class="sec-head">
      <div class="sec-title"><span class="emoji">🔄</span> ZYROX Update Center</div>
      <button class="install-btn" onclick="toast('Updating all…')">UPDATE ALL</button>
    </div>
    <div style="padding:0 20px 12px;font-size:13px;color:var(--text-dim)">${available.length} update${available.length!==1?'s':''} available</div>
    ${available.length ? available.map(a => `
      <div class="list-row" onclick="openApp('${a.id}')">
        <img src="${a.icon}" class="icon">
        <div class="info">
          <div class="name">${a.name} ${a.verified?'<span class="vrf-badge">✓</span>':''}</div>
          <div class="dev">v${a.version} → v${a.newVersion} · ${a.updateSize}</div>
          <div class="sub">${a.changelog}</div>
        </div>
        <button class="install-btn" onclick="event.stopPropagation();toast('Updating ${a.name}…');simulateDownload('${a.id}')">UPDATE</button>
      </div>`).join('') :
      `<div class="empty-state"><div class="emoji">✅</div><h3>All apps up to date</h3><p>You have the latest versions of all installed apps.</p></div>`}
  </div>`;
}
function bindUpdates(){}

/* ---------- PROFILE ---------- */
function pageProfile(){
  const favCount = LIBRARY.favorites.length;
  const instCount = LIBRARY.installed.length;
  const dlCount = DOWNLOADS.filter(d=>d.status==='completed').length;
  return `
  <div class="page">
    <div class="profile-hero">
      <img src="assets/dev-avatar.png">
      <h3>${USER.name}</h3>
      <p>ZYROX Store member since ${USER.joined}</p>
      <div class="profile-stats">
        <div class="hero-stat"><div class="num">${instCount}</div><div class="lbl">Installed</div></div>
        <div class="hero-stat"><div class="num">${favCount}</div><div class="lbl">Favorites</div></div>
        <div class="hero-stat"><div class="num">${dlCount}</div><div class="lbl">Downloads</div></div>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-item" onclick="renderNavPage('developer')">
        <div class="setting-icon" style="background:rgba(139,92,246,.2)">👨‍💻</div>
        <div class="setting-txt"><div class="t">Developer Dashboard</div><div class="d">Upload & manage your apps</div></div>
        <span class="setting-val">→</span>
      </div>
      <div class="setting-item" onclick="renderNavPage('security')">
        <div class="setting-icon" style="background:rgba(0,229,255,.2)">🛡️</div>
        <div class="setting-txt"><div class="t">Security Center</div><div class="d">Verify APK signatures & hashes</div></div>
        <span class="setting-val">→</span>
      </div>
      <div class="setting-item" onclick="renderNavPage('compare')">
        <div class="setting-icon" style="background:rgba(255,0,212,.2)">⚔️</div>
        <div class="setting-txt"><div class="t">App Comparison</div><div class="d">Compare up to 3 apps side-by-side</div></div>
        <span class="setting-val">→</span>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-item">
        <div class="setting-icon" style="background:rgba(34,224,106,.2)">🌑</div>
        <div class="setting-txt"><div class="t">Theme</div><div class="d">AMOLED Dark</div></div>
        <span class="setting-val">Dark</span>
      </div>
      <div class="setting-item">
        <div class="setting-icon" style="background:rgba(255,215,0,.2)">🌐</div>
        <div class="setting-txt"><div class="t">Language</div><div class="d">App display language</div></div>
        <span class="setting-val">English</span>
      </div>
      <div class="setting-item">
        <div class="setting-icon" style="background:rgba(255,59,107,.2)">🔔</div>
        <div class="setting-txt"><div class="t">Notifications</div><div class="d">Updates, downloads, announcements</div></div>
        <span class="setting-val">${USER.notifs?'On':'Off'}</span>
      </div>
      <div class="setting-item">
        <div class="setting-icon" style="background:rgba(139,92,246,.2)">📶</div>
        <div class="setting-txt"><div class="t">Download on mobile data</div><div class="d">Allow downloads without Wi-Fi</div></div>
        <span class="setting-val">On</span>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-item" onclick="toast('Privacy policy opens in browser')">
        <div class="setting-icon" style="background:rgba(255,255,255,.08)">🔒</div>
        <div class="setting-txt"><div class="t">Privacy</div></div>
        <span class="setting-val">→</span>
      </div>
      <div class="setting-item" onclick="toast('ZYROX Store v1.0.0 by DEV ARJUN RAJPUT')">
        <div class="setting-icon" style="background:rgba(255,255,255,.08)">ℹ️</div>
        <div class="setting-txt"><div class="t">About ZYROX</div><div class="d">Version 1.0.0</div></div>
        <span class="setting-val">→</span>
      </div>
    </div>

    <div class="dev-credit"><span class="crown">👑</span><br>ZYROX STORE<br><span style="color:var(--magenta)">DEV ARJUN RAJPUT</span><br><span style="font-size:9px;opacity:.6;letter-spacing:1px">FAST ⚡ SECURE 🛡️ SMART 🤖 PREMIUM</span></div>
  </div>`;
}
function bindProfile(){}

/* ---------- HIDDEN GEMS ---------- */
function pageGems(){
  const gems = APPS.hidden_gems||[];
  return `
  <div class="page">
    <div class="sec-head"><div class="sec-title"><span class="emoji">💎</span> ZYROX Hidden Gems</div></div>
    <div style="padding:0 20px 16px;font-size:13px;color:var(--text-dim);line-height:1.5">Lesser-known apps with exceptional quality, strong ratings, and genuine user love.</div>
    ${gems.map((a,i) => `
      <div class="list-row" onclick="openApp('${a.id}')">
        <div class="rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':'norm'}">${i+1}</div>
        <img src="${a.icon}" class="icon">
        <div class="info">
          <div class="name">${a.name}</div>
          <div class="dev">${a.developer} · ${a.size}</div>
          <div class="sub">⭐ ${a.rating} · ${a.description||''}</div>
        </div>
        <button class="install-btn" onclick="event.stopPropagation();installApp('${a.id}')">GET</button>
      </div>`).join('')}
  </div>`;
}

/* ---------- LEADERBOARD ---------- */
function pageLeaderboard(){
  const top = [...allApps()].sort((a,b)=>(b.downloads||0)-(a.downloads||0)).slice(0,15);
  const topRated = [...allApps()].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,10);
  return `
  <div class="page">
    <div class="sec-head"><div class="sec-title"><span class="emoji">🏆</span> Leaderboard</div></div>
    <div class="quick-tabs">
      <button class="q-tab active" onclick="lbTab(this,'dl')">⬇ Most Downloaded</button>
      <button class="q-tab" onclick="lbTab(this,'rt')">⭐ Top Rated</button>
      <button class="q-tab" onclick="lbTab(this,'new')">🆕 Fastest Growing</button>
    </div>
    <div id="lbList">${top.map((a,i) => lbRow(a,i,'downloads')).join('')}</div>
  </div>`;
}
function lbRow(a,i,type){
  const val = type==='rating' ? `${a.rating} ★` : fmt(a.downloads||0);
  return `<div class="rank-item" onclick="openApp('${a.id}')">
    <div class="rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':'norm'}">${i+1}</div>
    <img src="${a.icon}" class="icon">
    <div class="info">
      <div class="name">${a.name} ${a.verified?'<span class="vrf-badge">✓</span>':''}</div>
      <div class="stat">${a.developer} · ${a.category}</div>
    </div>
    <div class="val">${val}</div>
  </div>`;
}
function lbTab(btn, type){
  $$('.q-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  let list;
  if (type==='rt') list = [...allApps()].sort((a,b)=>(b.rating||0)-(a.rating||0));
  else if (type==='new') list = [...APPS.new_releases||[], ...allApps()].filter((a,i,arr)=>arr.findIndex(x=>x.id===a.id)===i);
  else list = [...allApps()].sort((a,b)=>(b.downloads||0)-(a.downloads||0));
  $('#lbList').innerHTML = list.slice(0,15).map((a,i) => lbRow(a,i,type==='rt'?'rating':'downloads')).join('');
}

/* ---------- SECURITY CENTER ---------- */
function pageSecurity(){
  return `
  <div class="page">
    <div class="hero" style="background:linear-gradient(135deg,rgba(34,224,106,.15),rgba(0,229,255,.15))">
      <span class="hero-badge" style="background:rgba(34,224,106,.2);border-color:rgba(34,224,106,.3);color:#22e06a">🛡️ SECURITY CENTER</span>
      <h2>Verified & Safe</h2>
      <p>Every APK on ZYROX Store undergoes signature verification and hash checking. Your security is our priority.</p>
    </div>
    <div class="sec-head"><div class="sec-title"><span class="emoji">✅</span> Security Status</div></div>
    <div class="security-grid" style="padding:0 20px">
      <div class="sec-chip"><div class="v status-verified">🟢 VERIFIED</div><div class="l">Store Status</div></div>
      <div class="sec-chip"><div class="v">HTTPS</div><div class="l">Connection</div></div>
      <div class="sec-chip"><div class="v">SHA-256</div><div class="l">Hash Verification</div></div>
      <div class="sec-chip"><div class="v">v3 Signing</div><div class="l">APK Signatures</div></div>
    </div>
    <div class="sec-head"><div class="sec-title"><span class="emoji">📊</span> Scan Summary</div></div>
    <div style="padding:0 20px">
      ${allApps().slice(0,5).map(a => `
        <div class="list-row" onclick="openApp('${a.id}')">
          <img src="${a.icon}" class="icon">
          <div class="info">
            <div class="name">${a.name}</div>
            <div class="dev"><span class="${a.security_status==='verified'?'status-verified':'status-review'}">${a.security_status==='verified'?'🟢 Verified':'🟡 Review'}</span> · Package: ${a.package||'com.zyrox.'+a.id}</div>
          </div>
          <button class="install-btn open" style="font-size:11px">DETAILS</button>
        </div>`).join('')}
    </div>
  </div>`;
}

/* ---------- DEVELOPER DASHBOARD ---------- */
function pageDeveloper(){
  const myApps = allApps().filter(a => (a.developer||'').toLowerCase().includes('arjun') || (a.developer||'').toLowerCase().includes('zyrox'));
  const totalDl = myApps.reduce((s,a)=>s+(a.downloads||0),0);
  const totalViews = totalDl * 4;
  const convRate = totalViews ? ((totalDl/totalViews)*100).toFixed(1) : '0';
  return `
  <div class="page">
    <div class="hero">
      <span class="hero-badge">👨‍💻 DEVELOPER</span>
      <h2>Developer Dashboard</h2>
      <p>Upload APKs, manage your apps, track analytics. Powered by GitHub Releases.</p>
    </div>
    <div class="dash-grid">
      <div class="dash-card"><div class="v">${myApps.length}</div><div class="l">My Apps</div></div>
      <div class="dash-card"><div class="v">${fmt(totalDl)}</div><div class="l">Downloads</div></div>
      <div class="dash-card"><div class="v">${fmt(totalViews)}</div><div class="l">Views</div></div>
      <div class="dash-card"><div class="v">${convRate}%</div><div class="l">Conversion</div></div>
    </div>
    <div class="sec-head"><div class="sec-title"><span class="emoji">📤</span> Upload New APK</div></div>
    <div class="upload-zone" onclick="toast('Upload via GitHub Releases: create a new release in zyroxteam/ZYROX-Pro repo and attach your APK. Coming soon: in-app upload.')">
      <div class="icon">📦</div>
      <div style="font-weight:600;color:var(--text);margin-bottom:4px">Drop APK here or tap to upload</div>
      <div style="font-size:12px">APK files up to 2 GB · Signature verified · SHA-256 checked</div>
    </div>
    <div class="sec-head"><div class="sec-title"><span class="emoji">📱</span> My Apps</div></div>
    ${myApps.map(a => `
      <div class="list-row" onclick="openApp('${a.id}')">
        <img src="${a.icon}" class="icon">
        <div class="info">
          <div class="name">${a.name} <span class="vrf-badge">v${a.version}</span></div>
          <div class="dev">⭐ ${a.rating} · ⬇ ${fmt(a.downloads||0)} · ${a.security_status==='verified'?'🟢 Live':'🟡 Review'}</div>
        </div>
        <button class="install-btn open" onclick="event.stopPropagation();toast('Analytics for ${a.name}')">📊</button>
      </div>`).join('')}
    <div class="dev-credit"><span class="crown">👑</span> DEV ARJUN RAJPUT · ZYROX STORE</div>
  </div>`;
}

/* ---------- COMPARE ---------- */
function pageCompare(){
  const apps = allApps().slice(0,3);
  return `
  <div class="page">
    <div class="sec-head"><div class="sec-title"><span class="emoji">⚔️</span> App Comparison</div></div>
    <div style="padding:0 20px 16px;font-size:13px;color:var(--text-dim)">Compare up to 3 apps side-by-side. Tap any app to add it to comparison.</div>
    <div class="compare-grid">
      <table>
        <thead><tr><th></th>${apps.map(a => `<th><img src="${a.icon}" style="width:32px;height:32px;border-radius:8px;margin:0 auto;display:block"></th>`).join('')}</tr>
        <tr><td></td>${apps.map(a => `<td style="font-weight:700;font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis">${a.name}</td>`).join('')}</tr></thead>
        <tbody>
          <tr><td style="text-align:left;color:var(--text-dim);font-size:11px">Rating</td>${apps.map(a=>`<td class="${a.rating===Math.max(...apps.map(x=>x.rating))?'winner':''}">⭐ ${a.rating}</td>`).join('')}</tr>
          <tr><td style="text-align:left;color:var(--text-dim);font-size:11px">Size</td>${apps.map(a=>`<td>${a.size}</td>`).join('')}</tr>
          <tr><td style="text-align:left;color:var(--text-dim);font-size:11px">Downloads</td>${apps.map(a=>`<td class="${a.downloads===Math.max(...apps.map(x=>x.downloads))?'winner':''}">${fmt(a.downloads)}</td>`).join('')}</tr>
          <tr><td style="text-align:left;color:var(--text-dim);font-size:11px">Version</td>${apps.map(a=>`<td>v${a.version||'1.0'}</td>`).join('')}</tr>
          <tr><td style="text-align:left;color:var(--text-dim);font-size:11px">Android</td>${apps.map(a=>`<td>${a.android||'7.0+'}</td>`).join('')}</tr>
          <tr><td style="text-align:left;color:var(--text-dim);font-size:11px">Verified</td>${apps.map(a=>`<td>${a.verified?'✅':'—'}</td>`).join('')}</tr>
          <tr><td style="text-align:left;color:var(--text-dim);font-size:11px">Category</td>${apps.map(a=>`<td style="text-transform:capitalize">${a.category}</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ---------- APP DETAIL SHEET ---------- */
window.openApp = function(id){
  const a = getApp(id); if(!a) return;
  const installed = LIBRARY.installed.includes(id);
  const fav = LIBRARY.favorites.includes(id);
  const reviews = (APPS.reviews||{})[id] || [
    {name:'Verified User',rating:5,text:'Excellent app! Works perfectly.',date:'3 days ago',helpful:12},
    {name:'Happy User',rating:4,text:'Really good, recommend trying it.',date:'1 week ago',helpful:8}
  ];
  const similar = allApps().filter(x => x.id !== id && (x.category === a.category || (x.tags||[]).some(t => (a.tags||[]).includes(t)))).slice(0,6);

  // generate fake screens with gradient backgrounds
  const screenGradients = ['linear-gradient(135deg,#00e5ff,#ff00d4)','linear-gradient(135deg,#8b5cf6,#00e5ff)','linear-gradient(135deg,#ff00d4,#ffd700)','linear-gradient(135deg,#22e06a,#00e5ff)','linear-gradient(135deg,#ff3b6b,#8b5cf6)'];

  $('#appDetail').innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-scroll">
      <div class="detail-top">
        <img src="${a.icon}" class="detail-icon">
        <div class="detail-info">
          <div class="detail-name">${a.name}</div>
          <div class="detail-dev">${a.verified?'<span class="vrf-badge">✓ Verified Developer</span>':''} ${a.developer}</div>
          <div class="detail-stats">
            <span class="rating">★ ${a.rating}</span>
            <span>⬇ ${fmt(a.downloads||0)}</span>
            <span>📦 ${a.size}</span>
            <span>🔒 ${a.security_status==='verified'?'<span class="status-verified">Verified</span>':'<span class="status-review">Review</span>'}</span>
          </div>
        </div>
      </div>
      <div class="detail-actions">
        <button class="detail-install" onclick="installApp('${a.id}');closeSheet()">${installed?'OPEN':'INSTALL'}</button>
        <button class="detail-sec-act" onclick="toggleFav('${a.id}')" id="favBtn">${fav?'❤️':'♡'}</button>
        <button class="detail-sec-act" onclick="shareApp('${a.id}')">↗</button>
      </div>
      <div class="detail-screens">
        ${screenGradients.slice(0, a.screens||4).map((g,i)=>`<div style="height:240px;width:130px;border-radius:12px;flex-shrink:0;background:${g};display:flex;align-items:center;justify-content:center;font-family:Orbitron;font-weight:900;font-size:24px;color:#fff;box-shadow:var(--shadow);opacity:${1-i*0.15}">${a.name.substring(0,8).toUpperCase()}</div>`).join('')}
      </div>

      <div class="detail-sec">
        <h4>About this app</h4>
        <p class="detail-desc">${a.description||'Premium app available on ZYROX Store. Fast, secure, verified.'}</p>
        <div class="tag-row">${(a.tags||[a.category]).map(t=>`<span class="tag">#${t}</span>`).join('')}</div>
      </div>

      ${a.whats_new ? `<div class="detail-sec">
        <h4>🆕 What's New (v${a.version})</h4>
        <div class="detail-desc"><ul style="padding-left:18px">${a.whats_new.map(w=>`<li style="margin-bottom:4px">${w}</li>`).join('')}</ul></div>
      </div>`:''}

      <div class="detail-sec">
        <h4>🛡️ Security Information</h4>
        <div class="security-grid">
          <div class="sec-chip"><div class="v status-verified">🟢 ${a.security_status==='verified'?'Verified':'Review'}</div><div class="l">Status</div></div>
          <div class="sec-chip"><div class="v" style="font-size:10px;font-family:monospace;word-break:break-all">${a.package||'com.zyrox.'+a.id}</div><div class="l">Package</div></div>
          <div class="sec-chip"><div class="v">v${a.version||'1.0'} (${a.versionCode||1})</div><div class="l">Version</div></div>
          <div class="sec-chip"><div class="v">${a.size}</div><div class="l">Size</div></div>
          <div class="sec-chip"><div class="v" style="font-size:9px;font-family:monospace">${(a.sha256||'verified...').substring(0,16)}…</div><div class="l">SHA-256</div></div>
          <div class="sec-chip"><div class="v">${a.android||'7.0+'}</div><div class="l">Android Req</div></div>
        </div>
        <p class="detail-desc" style="margin-top:8px;font-size:12px">${a.security_scan||'Signature verified. No malware detected.'}</p>
      </div>

      <div class="detail-sec">
        <h4>🔐 Permissions</h4>
        <div class="tag-row">${(a.permissions||['INTERNET']).map(p=>`<span class="tag">${p.replace(/_/g,' ')}</span>`).join('')}</div>
      </div>

      <div class="detail-sec">
        <h4>⭐ Reviews</h4>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:12px;border-radius:12px;background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.2)">
          <div style="font-size:28px;font-weight:800;font-family:Orbitron;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${a.rating}</div>
          <div><div style="color:var(--gold);font-size:14px">${stars(a.rating)}</div><div style="font-size:11px;color:var(--text-dim);margin-top:2px">AI Summary: ${a.rating>=4.5?'Excellent! Users love it. ':'Good app. '}Pros: easy to use, fast. ${a.rating<4.7?'Minor issues reported.':''}</div></div>
        </div>
        ${reviews.map(r=>`<div class="review">
          <div class="review-head">
            <div class="review-av">${r.name[0]}</div>
            <div class="review-nm">${r.name}</div>
            <div class="review-rt">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
          </div>
          <div class="review-tx">${r.text}</div>
          <div style="font-size:10px;color:var(--text-mute);margin-top:4px">${r.date} · ${r.helpful||0} found helpful</div>
        </div>`).join('')}
      </div>

      ${similar.length ? `<div class="detail-sec">
        <h4>🔗 Similar Apps</h4>
        <div class="similar-row">${similar.map(appCard).join('')}</div>
      </div>`:''}

      <div class="dev-credit" style="margin-top:20px"><span class="crown">👑</span> ZYROX STORE · DEV ARJUN RAJPUT</div>
    </div>`;
  $('#appDetail').classList.remove('hidden');
  $('#sheetBackdrop').classList.remove('hidden');
};
function closeSheet(){
  $('#appDetail').classList.add('hidden');
  $('#sheetBackdrop').classList.add('hidden');
}
window.installApp = function(id){
  const a = getApp(id); if(!a) return;
  if (a.download_url && a.download_url !== '#' && a.download_url.startsWith('http')) {
    toast('⬇ Starting download: '+a.name);
    trackDownload(id);
    simulateDownload(id);
  } else {
    toast('📦 Coming soon: '+a.name);
  }
};
window.toggleFav = function(id){
  const i = LIBRARY.favorites.indexOf(id);
  if (i>=0) { LIBRARY.favorites.splice(i,1); toast('Removed from library'); }
  else { LIBRARY.favorites.push(id); toast('❤️ Added to library'); }
  LS.set('zx_lib', LIBRARY);
  openApp(id);
};
window.shareApp = function(id){
  const a = getApp(id);
  if (navigator.share) navigator.share({title:a.name, text:'Check out '+a.name+' on ZYROX Store!', url:location.href}).catch(()=>{});
  else { navigator.clipboard?.writeText(location.href+'#'+id); toast('Link copied!'); }
};

/* ---------- NAV HELPERS ---------- */
function renderNavPage(page){
  $$('.nav-item').forEach(x => x.classList.remove('active'));
  renderPage(page);
}

/* ---------- TOAST ---------- */
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.add('hidden'), 2500);
}

/* ---------- AI ASSISTANT ---------- */
function openAI(){ $('#aiPanel').classList.remove('hidden'); if(!$('#aiChat').children.length) aiWelcome(); }
function closeAI(){ $('#aiPanel').classList.add('hidden'); }
function aiWelcome(){
  addMsg('bot', "👋 Hey! I'm ZYROX AI — your personal store assistant. Ask me anything about apps on the store! Try: 'Best offline game', 'Photo editors', or 'Study apps'.");
}
function addMsg(who, html){
  const c = $('#aiChat');
  const d = document.createElement('div');
  d.className = 'ai-msg '+who;
  d.innerHTML = html;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}
function sendAIMessage(){
  const inp = $('#aiInput');
  const txt = inp.value.trim(); if(!txt) return;
  addMsg('user', txt);
  inp.value = '';
  setTimeout(() => aiRespond(txt), 500);
}
function aiRespond(q){
  const ql = q.toLowerCase();
  let matches = [];
  let reason = '';

  // Smart matching
  if (/offline|no internet|without (internet|wifi)/i.test(q)) {
    matches = allApps().filter(a => (a.tags||[]).includes('offline') || /offline/i.test(a.description||''));
    reason = '🎯 Found these offline-capable apps:';
  }
  else if (/game|gaming|play/i.test(q)) {
    const mb = q.match(/(\d+)\s*mb/i);
    if (mb) {
      const max = parseInt(mb[1]);
      matches = (APPS.popular_games||[]).filter(a => parseInt(a.size) <= max);
      reason = `🎮 Games under ${mb[1]} MB:`;
    } else {
      matches = APPS.popular_games||[];
      reason = '🎮 Top games on ZYROX Store:';
    }
  }
  else if (/photo|editor|camera|picture|image/i.test(q)) {
    matches = allApps().filter(a => a.category==='photo' || (a.tags||[]).some(t=>/photo|camera|editor/i.test(t)));
    reason = '📸 Best photo apps:';
  }
  else if (/study|studying|education|school|learn/i.test(q)) {
    matches = allApps().filter(a => a.category==='education' || (a.tags||[]).some(t=>/study|note/i.test(t)));
    if (!matches.length) matches = (APPS.editors_choice||[]).filter(a => a.category==='productivity');
    reason = '📚 Great apps for studying:';
  }
  else if (/launcher|home screen|theme/i.test(q)) {
    matches = allApps().filter(a => a.category==='personalization' || /launcher/i.test(a.name));
    reason = '🎨 Best launchers & personalization:';
  }
  else if (/ai|artificial intelligence|chatgpt|gpt/i.test(q)) {
    matches = APPS.ai_apps||[];
    reason = '🤖 AI-powered apps:';
  }
  else if (/music|song|audio/i.test(q)) {
    matches = allApps().filter(a => a.category==='music');
    reason = '🎵 Music apps you may like:';
  }
  else if (/security|vpn|privacy|encrypt/i.test(q)) {
    matches = allApps().filter(a => a.category==='security' || /vault|lock/i.test(a.name));
    reason = '🛡️ Security & privacy apps:';
  }
  else if (/best|top|recommend/i.test(q)) {
    matches = [...(APPS.editors_choice||[]), ...(APPS.featured||[])].filter((a,i,arr)=>arr.findIndex(x=>x.id===a.id)===i).slice(0,5);
    reason = "⭐ ZYROX AI's top picks for you:";
  }
  else {
    // Text search fallback
    matches = allApps().filter(a => {
      const hay = (a.name+' '+a.developer+' '+(a.tags||[]).join(' ')+' '+(a.description||'')).toLowerCase();
      return ql.split(/\s+/).some(w => w.length > 2 && hay.includes(w));
    }).slice(0,5);
    reason = matches.length ? '🔍 Here are some matches:' : "🤔 I couldn't find an exact match. Try searching for a category like 'games', 'photo', or 'tools'.";
  }

  // Sort by rating
  matches.sort((a,b)=>(b.rating||0)-(a.rating||0));
  matches = matches.slice(0,4);

  if (!matches.length) {
    addMsg('bot', reason);
    return;
  }

  const appHtml = matches.map(a => `
    <div class="msg-app" onclick="closeAI();openApp('${a.id}')">
      <img src="${a.icon}">
      <div>
        <div class="n">${a.name} ${a.verified?'✓':''}</div>
        <div class="m">⭐ ${a.rating} · 📦 ${a.size} · ⬇ ${fmt(a.downloads||0)}</div>
      </div>
    </div>`).join('');

  // Pros/cons analysis
  const best = matches[0];
  const extra = matches.length > 1 ? `<div style="margin-top:8px;font-size:12px;color:var(--text-dim)"><b style="color:var(--cyan)">AI Pick:</b> ${best.name} stands out with a ${best.rating}★ rating and ${fmt(best.downloads||0)} downloads.</div>` : '';
  addMsg('bot', reason + appHtml + extra);
}
