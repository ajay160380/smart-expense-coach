  let theme = localStorage.getItem('theme');
  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
// ── CONSTANTS ─────────────────────────────────────────────────────────
const COLORS = {food:'#7C6FF7',transport:'#34D399',shopping:'#F472B6',health:'#60A5FA',entertainment:'#FBBF24',education:'#A78BFA',utilities:'#FB923C',other:'#94A3B8'};
const ICONS  = {food:'🍜',transport:'🚗',shopping:'🛍️',health:'💊',entertainment:'🎬',education:'📚',utilities:'⚡',other:'📦'};
const LEVEL_TITLES = ['Rookie Saver','Budget Analyst','Expense Explorer','Money Watcher','Thrift Knight','Savings Hunter','Budget Warrior','Finance Ninja','Money Sage','Money Guru'];
const QUESTS = [
  {icon:'📝',name:'Log one expense today',xp:'+20 XP',done:true},
  {icon:'💰',name:'Keep budget below 80%',xp:'+50 XP',done:true},
  {icon:'🍜',name:'Spend under ₹500 on food',xp:'+30 XP',done:false},
  {icon:'📊',name:'Review weekly trend',xp:'+10 XP',done:false},
];

const CSRF_TOKEN      = '"X"';
const URL_AI_CHAT     = '';
const URL_VOICE       = '';
const URL_CAT_INSIGHT = '';
const URL_DEL_EXP     = ''.replace('999999/', '');
const URL_DEL_BILL    = ''.replace('999999/', '');
const URL_CHECK_UPDATES = '';
const URL_DAILY_TIP = '';
const URL_GOALS = '';
const URL_ADD_GOAL = '';
const URL_SPLITS = '';
const URL_CREATE_SPLIT = '';

let expenses = [
  
  {id:'"X"', amount:"X", cat:'"X"', date:'"X"', note:'"X"'},
  
];

let bills = [
  
  {id:'"X"', name:'"X"', amount:"X", due:'"X"', cat:'"X"'},
  
];

const ANOMALY_ALERTS = [
  
  {type:'"X"', icon:'"X"', message:'"X"', severity:'"X"'},
  
];

let budget       = "X";
// Try getting total directly from backend if available for accuracy, else fallback to JS sum.
const backendTotalSpent = "X"; 

let activeFilter = 'month';
let activeCatFilter = 'all';
let darkMode = document.documentElement.getAttribute('data-theme') === 'dark';
let xp = 1240, level = 7, streak = 5;
let aiOpen = false, aiTyping = false, aiHistory = [], lastMsg = '';
let profileOpen  = false;

const today = new Date();
if (darkMode) {
  if(document.getElementById('pd-theme-icon')) document.getElementById('pd-theme-icon').textContent = '☀️';
}
document.getElementById('month-label').textContent = today.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
document.getElementById('inp-date').value = today.toISOString().split('T')[0];
document.getElementById('bill-date').value = today.toISOString().split('T')[0];
if (document.getElementById('budget-inp')) document.getElementById('budget-inp').value = budget;

// ── PROFILE DROPDOWN ──────────────────────────────────────────────────
function toggleProfile() {
  profileOpen = !profileOpen;
  document.getElementById('profile-dropdown').classList.toggle('open', profileOpen);
  if (profileOpen) loadProfileStats();
}
// Close dropdown on outside click
document.addEventListener('click', e => {
  if (!document.getElementById('profile-wrap').contains(e.target)) {
    profileOpen = false;
    document.getElementById('profile-dropdown').classList.remove('open');
  }
});

async function loadProfileStats() {
  try {
    const res  = await fetch('/api/user-profile/', {headers:{'X-Requested-With':'XMLHttpRequest'}});
    const data = await res.json();
    const fmt  = n => '₹'+Math.round(n).toLocaleString('en-IN');
    // Dropdown mini stats
    if(document.getElementById('pd-txn-count')) document.getElementById('pd-txn-count').textContent = data.total_txns || 0;
    if(document.getElementById('pd-days'))      document.getElementById('pd-days').textContent      = data.member_days || 0;
    // Profile modal stats
    if(document.getElementById('pm-total-spent')) document.getElementById('pm-total-spent').textContent = fmt(data.lifetime_spent || 0);
    if(document.getElementById('pm-txn-count'))   document.getElementById('pm-txn-count').textContent   = data.total_txns || 0;
    if(document.getElementById('pm-days'))         document.getElementById('pm-days').textContent         = data.member_days || 0;
    if(document.getElementById('pm-member-days'))  document.getElementById('pm-member-days').textContent  = (data.member_days || 0)+' days';
    if(document.getElementById('pm-budget'))       document.getElementById('pm-budget').textContent       = fmt(data.budget || budget);
  } catch(e) {
    console.warn('Profile stats load failed:', e);
  }
}

// ── UTILITIES ─────────────────────────────────────────────────────────────

function fmt(n)  { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fmtD(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'}); }
function esc(s)  { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function getCsrf() { return CSRF_TOKEN; }

function getFiltered() {
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date+'T00:00:00');
    if (activeFilter === 'week')  { const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; }
    if (activeFilter === 'month') { return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); }
    return true;
  });
}
function getCatFiltered() {
  const f = getFiltered();
  return activeCatFilter === 'all' ? f : f.filter(e => e.cat === activeCatFilter);
}
function setFilter(f, el) {
  activeFilter = f;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  render();
}
function setCatFilter(c) { activeCatFilter = c; renderFilterTags(); renderTxns(); }

function toggleTheme() {
  darkMode = !darkMode;
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '');
  const icon = darkMode ? '☀️' : '🌙';
  if(document.getElementById('pd-theme-icon')) document.getElementById('pd-theme-icon').textContent = icon;
  localStorage.setItem('theme', darkMode ? 'dark' : 'light');
}

function render() {
  renderHero();
  renderStats();
  renderCats();
  renderChart();
  renderFilterTags();
  renderTxns();
  renderBills();
  renderBadges();
  renderGame();
  renderAnomalies();
  updateBannerMsg();
}

function renderHero() {
  const f = getFiltered();
  let total = 0;
  
  // Use backend database sum if looking at all time for max accuracy
  if (activeFilter === 'all' && backendTotalSpent > 0 && f.length === expenses.length) {
      total = backendTotalSpent;
  } else {
      total = f.reduce((s,e) => s+e.amount, 0);
  }

  const pct   = budget > 0 ? Math.min(total/budget*100, 100) : 0;
  document.getElementById('hero-total').innerHTML = '₹<strong>'+Math.round(total).toLocaleString('en-IN')+'</strong>';
  document.getElementById('hero-budget-label').textContent = 'of '+fmt(budget)+' budget';
  const bar = document.getElementById('progress-fill');
  requestAnimationFrame(() => {
    bar.style.width = pct.toFixed(1)+'%';
    bar.className   = 'progress-fill'+(pct>80?' danger':pct>60?' warn':'');
  });
  document.getElementById('hero-pct').textContent   = pct.toFixed(1)+'%';
  document.getElementById('hero-rem').textContent   = fmt(Math.max(budget-total,0));
  document.getElementById('hero-count').textContent = f.length;
}

function renderStats() {
  const f     = getFiltered();
  const total = f.reduce((s,e) => s+e.amount, 0);
  const days  = activeFilter==='week'?7:activeFilter==='month'?new Date().getDate():30;
  const avg   = total/Math.max(days,1);
  const high  = f.length ? Math.max(...f.map(e=>e.amount)) : 0;
  const sr    = budget > 0 ? Math.max(0,(budget-total)/budget*100) : 0;
  document.getElementById('stat-avg').textContent  = fmt(avg);
  document.getElementById('stat-high').textContent = fmt(high);
  const sv = document.getElementById('stat-save');
  sv.textContent = Math.round(sr)+'%';
  sv.className   = 'sc-val '+(sr>30?'green':sr>10?'amber':'red');
}

function renderCats() {
  const f     = getFiltered();
  const total = f.reduce((s,e) => s+e.amount, 0);
  const m     = {};
  f.forEach(e => { m[e.cat] = (m[e.cat]||0)+e.amount; });
  const sorted = Object.entries(m).sort((a,b) => b[1]-a[1]);
  const el = document.getElementById('cat-list');
  if (!sorted.length) { el.innerHTML='<div class="empty">No expenses yet 😴</div>'; return; }
  el.innerHTML = sorted.map(([cat,amt]) => {
    const pct = total > 0 ? amt/total*100 : 0;
    return `<div class="cat-item" onclick="showInsight('${cat}')" id="ci-${cat}">
      <div class="cat-top">
        <span class="cat-name"><span class="cat-dot" style="background:${COLORS[cat]}"></span>${ICONS[cat]||'📦'} ${cat.charAt(0).toUpperCase()+cat.slice(1)}</span>
        <span class="cat-amt">${fmt(amt)} · ${Math.round(pct)}%</span>
      </div>
      <div class="cat-track"><div class="cat-fill" style="width:${pct.toFixed(1)}%;background:${COLORS[cat]}"></div></div>
    </div>`;
  }).join('');
}

function renderChart() {
  const el = document.getElementById('bar-chart');
  const days = [];
  for (let i=6; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(d); }
  const totals = days.map(d => {
    const ds = d.toISOString().split('T')[0];
    return expenses.filter(e=>e.date===ds).reduce((s,e)=>s+e.amount,0);
  });
  const maxV = Math.max(...totals, 1);
  const lbls = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  el.innerHTML = totals.map((v,i) => {
    const h    = Math.max(v/maxV*130, v>0?8:3);
    const isT  = days[i].toDateString() === new Date().toDateString();
    const color = isT ? 'linear-gradient(to top,var(--primary),#a78bfa)' : 'var(--surface3)';
    return `<div class="bc">
      <div class="bv" style="font-size:9px;color:var(--text3)">${v>0?fmt(v):''}</div>
      <div class="br" style="height:${h}px;background:${color};border:1px solid var(--border)"></div>
      <div class="bl" style="color:${isT?'var(--primary)':'var(--text3)'};font-weight:${isT?700:400}">${lbls[days[i].getDay()]}</div>
    </div>`;
  }).join('');
}

function renderFilterTags() {
  const cats = [...new Set(getFiltered().map(e=>e.cat))];
  document.getElementById('filter-tags').innerHTML = ['all',...cats].map(c =>
    `<button class="ftag ${activeCatFilter===c?'active':''}" onclick="setCatFilter('${c}')">${c==='all'?'All 📋':ICONS[c]+' '+c.charAt(0).toUpperCase()+c.slice(1)}</button>`
  ).join('');
}

// ✅ SCROLLABLE TRANSACTIONS WITH COUNT LABEL
function renderTxns() {
  const search = document.getElementById('search-input').value.toLowerCase();
  let f = getCatFiltered();
  if (search) f = f.filter(e => e.cat.includes(search)||(e.note||'').toLowerCase().includes(search));
  const el = document.getElementById('txn-list');

  // Update count label
  const countLabel = document.getElementById('txn-count-text');
  const scrollHint = document.getElementById('scroll-hint');
  if (countLabel) countLabel.textContent = `${f.length} transaction${f.length!==1?'s':''}`;
  if (scrollHint) scrollHint.style.display = f.length > 8 ? 'flex' : 'none';

  if (!f.length) { el.innerHTML='<div class="empty">No transactions yet 🧾</div>'; return; }
  el.innerHTML = [...f].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e =>
    `<div class="txn-item">
      <div class="txn-icon" style="background:${COLORS[e.cat]}20">${ICONS[e.cat]||'📦'}</div>
      <div class="txn-info">
        <div class="txn-cat">${e.cat.charAt(0).toUpperCase()+e.cat.slice(1)}${e.note?` <span style="font-size:10px;color:var(--text3);font-weight:400">· ${esc(e.note)}</span>`:''}</div>
        <div class="txn-meta">${fmtD(e.date)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="txn-amt">${fmt(e.amount)}</span>
        <button class="txn-del" onclick="deleteExpense('${e.id}')" title="Delete">✕</button>
      </div>
    </div>`
  ).join('');
}

function renderBills() {
  const el  = document.getElementById('bills-list');
  const now = new Date();
  if (!bills.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:12px 0;font-weight:500;">No upcoming bills 🎉</div>';
    return;
  }
  el.innerHTML = bills.map(b => {
    const due     = new Date(b.due+'T00:00:00');
    const diff    = Math.ceil((due-now)/86400000);
    const overdue = diff < 0;
    const dueSoon = !overdue && diff <= 3;
    const dueLabel = overdue ? `⚠️ Overdue by ${Math.abs(diff)}d` : diff===0 ? '🔴 Due today' : diff<=3 ? `⚡ Due in ${diff}d` : `Due in ${diff}d`;
    return `<div class="bill-card ${overdue?'overdue':dueSoon?'due-soon':''}">
      <div class="bill-top">
        <div class="bill-icon">${ICONS[b.cat]||'📅'}</div>
        <div class="bill-name">${esc(b.name)}</div>
      </div>
      <div class="bill-amt">${fmt(b.amount)}</div>
      <div class="bill-due" style="color:${overdue?'var(--red)':dueSoon?'var(--amber)':'var(--text3)'}">${dueLabel}</div>
      <button class="bill-del" onclick="deleteBill('${b.id}')" title="Cancel bill">✕</button>
    </div>`;
  }).join('');
}

function renderBadges() {
  const container = document.getElementById('badge-container');
  const f     = getFiltered();
  const total = f.reduce((s,e) => s+e.amount, 0);
  const pct   = budget > 0 ? (total/budget*100) : 0;
  let badges  = [];
  if (expenses.length >= 1)  badges.push({cls:'b-starter',text:'🌱 Starter'});
  if (expenses.length >= 10) badges.push({cls:'b-pro',text:'🔥 Pro Tracker'});
  if (pct > 0 && pct <= 50)  badges.push({cls:'b-ninja',text:'🥷 Savings Ninja'});
  if (streak >= 5)           badges.push({cls:'b-pro',text:`🔥 ${streak}-Day Streak`});
  if (pct >= 90)             badges.push({cls:'b-danger',text:'🚨 Danger Zone'});
  container.innerHTML = badges.length
    ? badges.map((b,i) => `<span class="badge ${b.cls}" style="animation-delay:${i*.1}s">${b.text}</span>`).join('')
    : '<span style="font-size:11px;color:var(--text3);">Track more to earn badges!</span>';
  if (document.getElementById('badge-count-val'))
    document.getElementById('badge-count-val').textContent = badges.length;
}

function renderGame() {
  const lvlTitle = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length-1)];
  document.getElementById('lvl-num').textContent   = level;
  document.getElementById('lvl-title').textContent = lvlTitle;
  const xpForLevel = level * 200;
  const xpProgress = xp % xpForLevel || xp;
  const xpPct      = Math.min(Math.round(xpProgress/xpForLevel*100), 100);
  document.getElementById('xp-fill').style.width     = xpPct+'%';
  document.getElementById('xp-prog-lbl').textContent = xpProgress.toLocaleString()+' / '+xpForLevel.toLocaleString();
  document.getElementById('xp-display').textContent  = xp.toLocaleString()+' XP';
  const done = QUESTS.filter(q=>q.done).length;
  document.getElementById('quest-done-val').textContent = done+'/'+QUESTS.length;
  document.getElementById('quests-row').innerHTML = QUESTS.map(q =>
    `<div class="quest-card ${q.done?'done-card':''}">
      <div class="qc-icon">${q.icon}</div>
      <div class="qc-name ${q.done?'done-txt':''}">${q.name}</div>
      <div class="qc-xp ${q.done?'done-xp':''}">${q.done?'✅ '+q.xp:q.xp}</div>
    </div>`
  ).join('');
  const dayNames  = ['S','M','T','W','T','F','S'];
  const todayDay  = today.getDay();
  document.getElementById('streak-days').innerHTML = dayNames.map((d,i) => {
    const cls = i===todayDay ? 'today-dot' : (todayDay-i)>0&&(todayDay-i)<streak ? 'done' : 'empty';
    return `<div class="sd ${cls}">${d}<span>${i===todayDay?'●':(todayDay-i)>0&&(todayDay-i)<streak?'✓':''}</span></div>`;
  }).join('');
  document.getElementById('streak-label').textContent = streak+' days in a row — keep it up! 🔥';
}

function renderAnomalies() {
  const container = document.getElementById('anomaly-container');
  if (!ANOMALY_ALERTS.length) { container.innerHTML=''; return; }
  container.innerHTML = ANOMALY_ALERTS.map((a,i) =>
    `<div class="anomaly-item ${a.severity}" id="anomaly-${i}">
      <span class="anomaly-icon">${a.icon}</span>
      <span>${esc(a.message)}</span>
      <button class="anomaly-close" onclick="document.getElementById('anomaly-${i}').remove()" title="Dismiss">✕</button>
    </div>`
  ).join('');
}

function updateBannerMsg() {
  const f     = getFiltered();
  const total = f.reduce((s,e) => s+e.amount, 0);
  const rem   = Math.max(budget-total, 0);
  const pct   = budget > 0 ? Math.round(total/budget*100) : 0;
  let msg;
  if (pct < 40)      msg = `Great job! You used only ${pct}% of your budget — you can comfortably save ${fmt(rem)} more. 🌟`;
  else if (pct < 70) msg = `${pct}% of your budget used. Keep an eye on spending — only ${fmt(rem)} left. ⚠️`;
  else if (pct < 100)msg = `Warning! ${pct}% used — only ${fmt(rem)} left. Slow down your spending 🚨`;
  else               msg = `Budget exceeded! You spent ${fmt(total-budget)} over budget. Create a recovery plan now. 😬`;
  document.getElementById('banner-msg').textContent = msg;
}

function deleteExpense(id) {
  if (!confirm('Ye expense delete karna chahte ho?')) return;
  const form = document.getElementById('delete-form');
  form.action = URL_DEL_EXP + id + '/';
  form.submit();
}
function deleteBill(id) {
  if (!confirm('Ye bill cancel karna chahte ho?')) return;
  const form = document.getElementById('delete-form');
  form.action = URL_DEL_BILL + id + '/';
  form.submit();
}

function showInsight(cat) {
  const f = getFiltered().filter(e => e.cat===cat);
  if (!f.length) return;
  const allTotal = getFiltered().reduce((s,e) => s+e.amount, 0);
  const catTotal = f.reduce((s,e) => s+e.amount, 0);
  const share    = allTotal > 0 ? catTotal/allTotal*100 : 0;
  const high     = Math.max(...f.map(e=>e.amount));
  const avg      = catTotal/f.length;
  const color    = COLORS[cat] || '#888';
  document.querySelectorAll('.cat-item').forEach(ci => ci.classList.remove('active'));
  const ci = document.getElementById('ci-'+cat); if(ci) ci.classList.add('active');
  document.getElementById('ip-icon').textContent     = ICONS[cat]||'📦';
  document.getElementById('ip-icon').style.background = color+'20';
  document.getElementById('ip-title').textContent    = cat.charAt(0).toUpperCase()+cat.slice(1);
  document.getElementById('ip-badge').textContent    = Math.round(share)+'% of total spending';
  document.getElementById('ip-badge').style.cssText  = `background:${color}20;color:${color};padding:3px 12px;border-radius:100px;font-size:11px;font-weight:600;`;
  document.getElementById('ip-total').textContent    = fmt(catTotal);
  document.getElementById('ip-count').textContent    = f.length;
  document.getElementById('ip-avg').textContent      = fmt(avg);
  document.getElementById('ip-high').textContent     = fmt(high);
  const recent = [...f].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,4);
  document.getElementById('ip-recent').innerHTML =
    '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:10px;">Recent</div>' +
    recent.map(e => `<div class="row"><span style="color:var(--text2)">${fmtD(e.date)}${e.note?' · '+esc(e.note):''}</span><span>${fmt(e.amount)}</span></div>`).join('');
  document.getElementById('ip-tip-text').innerHTML = '<div class="ip-tip-loading"><span></span><span></span><span></span></div>';
  document.getElementById('insight-panel').classList.add('open');
  document.getElementById('insight-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
  fetchCatInsight(cat, 'month');
}

function closeInsight() {
  document.getElementById('insight-panel').classList.remove('open');
  document.querySelectorAll('.cat-item').forEach(ci => ci.classList.remove('active'));
}

async function fetchCatInsight(cat, period='month') {
  try {
    const resp = await fetch(`${URL_CAT_INSIGHT}?category=${cat}&period=${period}`, {
      headers:{'X-CSRFToken': getCsrf()}
    });
    if (!resp.ok) throw new Error('API error '+resp.status);
    const data = await resp.json();
    document.getElementById('ip-tip-text').textContent = data.ai_tip || 'No tip available.';
    if (data.total)   document.getElementById('ip-total').textContent = fmt(data.total);
    if (data.count)   document.getElementById('ip-count').textContent = data.count;
    if (data.avg)     document.getElementById('ip-avg').textContent   = fmt(data.avg);
    if (data.highest) document.getElementById('ip-high').textContent  = fmt(data.highest);
  } catch(e) {
    document.getElementById('ip-tip-text').textContent = 'AI is busy right now — please try again shortly. 😅';
  }
}

function exportCSV() {
  const rows = [['Date','Category','Amount','Note'], ...expenses.map(e=>[e.date,e.cat,e.amount,e.note||''])];
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'));
  a.download = `paisatracker_${today.toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('CSV export complete! ✅','success');
}
function exportJSON() {
  const data = {exported_at:new Date().toISOString(), budget, expenses};
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(data,null,2));
  a.download = `paisatracker_${today.toISOString().split('T')[0]}.json`;
  a.click();
  showToast('JSON export complete! ✅','success');
}

function openModal(id)  {
  document.getElementById(id).classList.add('open');
  if (id === 'profileModal') loadProfileStats();
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('keydown', e => {
  if(e.key==='Escape') {
    document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));
    profileOpen = false;
    document.getElementById('profile-dropdown').classList.remove('open');
  }
});

function openAI()   { if (!aiOpen) toggleAI(); }
function toggleAI() {
  aiOpen = !aiOpen;
  document.getElementById('ai-popup').classList.toggle('open', aiOpen);
  if (aiOpen) {
    document.getElementById('ai-notif').style.display = 'none';
    if (!aiHistory.length) sendWelcome();
    setTimeout(() => document.getElementById('ai-input').focus(), 350);
  }
}

function getFinancialContext() {
  const f     = getFiltered();
  const total = f.reduce((s,e) => s+e.amount, 0);
  const rem   = Math.max(budget-total, 0);
  const m     = {};
  f.forEach(e => { m[e.cat]=(m[e.cat]||0)+e.amount; });
  const topCat = Object.entries(m).sort((a,b)=>b[1]-a[1])[0];
  return {total, rem, budget, topCat, count:f.length, pct:budget>0?Math.round(total/budget*100):0};
}

function sendWelcome() {
  const ctx = getFinancialContext();
  let msg = `Hello! I am PaisaMitra 🙏\n\n`;
  msg += `✅ Remaining: ${fmt(ctx.rem)}\n`;
  msg += `📊 Budget used: ${ctx.pct}%\n`;
  if (ctx.topCat) msg += `🔥 Top category: ${ctx.topCat[0].charAt(0).toUpperCase()+ctx.topCat[0].slice(1)} — ${fmt(ctx.topCat[1])}`;
  msg += `\n\nWhat would you like to know? Ask me anything! 😊`;
  addBotMsg(msg);
}

function quickAsk(btn) {
  document.getElementById('ai-input').value = btn.textContent;
  sendMsg();
}

function addUserMsg(text) {
  const now = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const div = document.createElement('div');
  div.className = 'ai-msg user';
  div.innerHTML = `<div class="ai-bubble">${esc(text)}</div><div class="ai-time">${now}</div>`;
  document.getElementById('ai-msgs').appendChild(div);
  scrollMsgs();
}

function addBotMsg(text) {
  const now = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const div = document.createElement('div');
  div.className = 'ai-msg bot';
  div.innerHTML = `<div class="ai-bubble">${esc(text).replace(/\n/g,'<br>')}</div><div class="ai-time">${now}</div>`;
  document.getElementById('ai-msgs').appendChild(div);
  scrollMsgs();
  aiHistory.push({role:'assistant',content:text});
}

function showTyping() {
  const div = document.createElement('div');
  div.id        = 'typing-ind';
  div.className = 'ai-msg bot';
  div.innerHTML = '<div class="ai-bubble"><div class="typing-wrap"><span></span><span></span><span></span></div></div>';
  document.getElementById('ai-msgs').appendChild(div);
  scrollMsgs();
}
function hideTyping() { const t=document.getElementById('typing-ind'); if(t) t.remove(); }
function scrollMsgs() { const m=document.getElementById('ai-msgs'); m.scrollTop=m.scrollHeight; }

function showAIError(msg) {
  const banner = document.getElementById('ai-error-banner');
  document.getElementById('ai-error-text').textContent = msg;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 6000);
}

function retryLastMsg() {
  if (!lastMsg) return;
  document.getElementById('ai-input').value = lastMsg;
  sendMsg();
}

async function sendMsg() {
  const inp = document.getElementById('ai-input');
  const msg = inp.value.trim();
  if (!msg || aiTyping) return;
  lastMsg = msg;
  inp.value = '';
  addUserMsg(msg);
  aiHistory.push({role:'user', content:msg});
  document.getElementById('ai-chips').style.display = 'none';
  document.getElementById('ai-error-banner').classList.remove('show');
  aiTyping = true;
  document.getElementById('ai-send').disabled = true;
  showTyping();
  try {
    const response = await fetch(URL_AI_CHAT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json','X-CSRFToken': getCsrf()},
      body: JSON.stringify({message: msg, history: aiHistory.slice(-8)}),
    });
    if (!response.ok) {
      const errData = await response.json().catch(()=>({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }
    const data = await response.json();
    hideTyping();
    if (data.reply) addBotMsg(data.reply);
    else throw new Error('Empty reply from server');
  } catch(err) {
    hideTyping();
    console.error('AI Chat error:', err);
    showAIError('Unable to connect — please retry.');
    addBotMsg('Oops! A network issue occurred 😅 Please retry.');
  } finally {
    aiTyping = false;
    document.getElementById('ai-send').disabled = false;
    inp.focus();
  }
}

// ── VOICE ────────────────────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition     = null;
let isRecording     = false;
let silenceTimer    = null;
let finalText       = '';
let voiceCancelled  = false;

function cancelVoice() {
  voiceCancelled = true;
  clearTimeout(silenceTimer);
  if (recognition) { try { recognition.abort(); } catch(e){} }
  hideVoiceOverlay();
  resetMicBtn();
}
function showVoiceOverlay() {
  document.getElementById('voice-overlay').classList.add('show');
  document.getElementById('voice-status').textContent = 'Listening... 🎤';
  document.getElementById('voice-sub').textContent    = 'Please speak your expense';
  document.getElementById('voice-preview').textContent = '—';
}
function hideVoiceOverlay() { document.getElementById('voice-overlay').classList.remove('show'); }
function resetMicBtn() {
  const btn = document.getElementById('mic-btn');
  btn.innerHTML = '🎙️ Record expense';
  btn.classList.remove('recording');
}

if (SpeechRecognition) {
  recognition        = new SpeechRecognition();
  recognition.lang   = 'hi-IN';
  recognition.continuous      = true;
  recognition.interimResults  = true;
  recognition.onstart = () => {
    isRecording = true; finalText = ''; voiceCancelled = false;
    showVoiceOverlay();
    document.getElementById('mic-btn').classList.add('recording');
    document.getElementById('mic-btn').innerHTML = '🔴 Recording...';
  };
  recognition.onresult = (event) => {
    let text = '';
    for (let i = event.resultIndex; i < event.results.length; i++) text += event.results[i][0].transcript;
    finalText = text;
    document.getElementById('voice-preview').textContent = text || '—';
    document.getElementById('voice-status').textContent  = 'Listening... 🎙️';
    clearTimeout(silenceTimer);
    if (finalText.trim()) {
      silenceTimer = setTimeout(() => {
        if (!voiceCancelled) { recognition.stop(); sendVoiceToBackend(finalText); }
      }, 1800);
    }
  };
  recognition.onend = () => {
    isRecording = false;
    if (!voiceCancelled && !finalText.trim()) {
      hideVoiceOverlay(); resetMicBtn();
      showToast('No speech detected — please try again!', 'error');
    }
  };
  recognition.onerror = (event) => {
    console.error('Voice error:', event.error);
    isRecording = false; hideVoiceOverlay(); resetMicBtn();
    if (!voiceCancelled) {
      const errs = {'not-allowed':'Microphone permission denied!','network':'Network error.','no-speech':'No speech detected.'};
      showToast(errs[event.error] || 'Mic error: '+event.error, 'error');
    }
  };
} else {
  setTimeout(() => { const btn = document.getElementById('mic-btn'); if(btn) btn.style.display='none'; }, 100);
}

function startVoice() {
  if (!recognition) { showToast('Voice not supported — please use Chrome.', 'error'); return; }
  if (isRecording) {
    clearTimeout(silenceTimer);
    recognition.stop();
    if (finalText.trim()) sendVoiceToBackend(finalText);
    else { hideVoiceOverlay(); resetMicBtn(); }
    return;
  }
  try { recognition.start(); } catch(e) { showToast('Voice could not start: '+e.message, 'error'); }
}

async function sendVoiceToBackend(text) {
  document.getElementById('voice-status').textContent = '⚡ AI is understanding...';
  document.getElementById('voice-sub').textContent    = 'Please wait...';
  document.getElementById('mic-btn').innerHTML        = '⚡ Processing...';
  try {
    const response = await fetch(URL_VOICE, {
      method: 'POST',
      headers: {'Content-Type': 'application/json','X-CSRFToken': getCsrf()},
      body: JSON.stringify({text}),  // No phone — browser mode uses session
    });
    const data = await response.json();
    hideVoiceOverlay();
    if (data.status === 'success') {
      showToast(data.message || '✅ Expense saved!', 'success', 4000);
      resetMicBtn();
      setTimeout(() => location.reload(), 1200);
    } else {
      showToast(data.message || 'AI could not understand — please try again.', 'error');
      resetMicBtn();
    }
  } catch(err) {
    hideVoiceOverlay(); resetMicBtn();
    showToast('Network issue — check your connection.', 'error');
    console.error('Voice backend error:', err);
  }
}

// ── SAVINGS GOALS ─────────────────────────────────────────────────────
async function saveGoal() {
  const name = document.getElementById('goal-name').value;
  const amount = document.getElementById('goal-amount').value;
  const deadline = document.getElementById('goal-deadline').value;
  const icon = document.getElementById('goal-icon').value || '🎯';
  if (!name || !amount || !deadline) return showToast('Please fill all fields', 'error');

  try {
    const res = await fetch('/api/savings-goals/add/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCsrf()},
      body: JSON.stringify({name, target_amount: amount, target_date: deadline, icon})
    });
    if (res.ok) {
      showToast('Goal created! 🎉', 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to create goal', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

let activeGoalId = null;
function openAddSavings(id) {
  activeGoalId = id;
  document.getElementById('addSavingsAmount').value = '';
  openModal('addSavingsModal');
}

async function addSavings() {
  if (!activeGoalId) return;
  const amount = document.getElementById('addSavingsAmount').value;
  if (!amount || amount <= 0) return showToast('Enter valid amount', 'error');

  try {
    const res = await fetch(`/api/savings-goals/${activeGoalId}/update/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCsrf()},
      body: JSON.stringify({add_amount: amount})
    });
    if (res.ok) {
      showToast('Savings added! 💰', 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      showToast('Failed to add savings', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

async function deleteGoal(id) {
  if (!confirm('Are you sure you want to delete this goal?')) return;
  try {
    const res = await fetch(`/api/savings-goals/${id}/delete/`, {
      method: 'POST',
      headers: {'X-CSRFToken': getCsrf()}
    });
    if (res.ok) {
      showToast('Goal deleted.', 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      showToast('Failed to delete goal', 'error');
    }
  } catch(err) {
    showToast('Network error', 'error');
  }
}

// ── SPLIT EXPENSES ────────────────────────────────────────────────────
async function createSplit() {
  const name = document.getElementById('split-name').value;
  const membersTxt = document.getElementById('split-members').value;
  if (!name || !membersTxt) return showToast('Please fill all fields', 'error');
  
  const members = membersTxt.split('\n').map(m => m.trim()).filter(m => m);
  if (members.length < 2) return showToast('Need at least 2 members', 'error');

  try {
    const res = await fetch('/api/splits/create/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCsrf()},
      body: JSON.stringify({name, members})
    });
    if (res.ok) {
      showToast('Split group created! 👥', 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to create group', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

let activeSplitId = null;
function openAddSplitExpense(id, name) {
  activeSplitId = id;
  openModal('splitExpModal');
}

async function addSplitExpense() {
  if (!activeSplitId) return;
  const amount = document.getElementById('split-amt').value;
  const description = document.getElementById('split-desc').value;
  const paidBy = document.getElementById('split-paid-by').value;
  if (!amount || !description || !paidBy) return showToast('Please fill all fields', 'error');

  try {
    const res = await fetch(`/api/splits/${activeSplitId}/add-expense/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCsrf()},
      body: JSON.stringify({amount, description, paid_by_name: paidBy})
    });
    if (res.ok) {
      showToast('Expense added to group!', 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to add expense', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

async function viewSplitSummary(id) {
  try {
    const res = await fetch(`/api/splits/${id}/summary/`);
    if (res.ok) {
      const data = await res.json();
      let html = `<div style="padding:15px;background:var(--bg3);border-radius:12px;margin-bottom:15px;">`;
      html += `<div style="color:var(--text2);margin-bottom:10px;">Total Group Expense: ₹${data.total_expense}</div>`;
      if (data.settlements.length === 0) {
        html += `<div style="color:var(--green);">Everyone is settled up! 🎉</div>`;
      } else {
        data.settlements.forEach(s => {
          html += `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
            <span><b>${s.from}</b> owes <b>${s.to}</b></span>
            <span style="color:var(--red);">₹${s.amount}</span>
          </div>`;
        });
      }
      html += `</div>`;
      
      const summaryText = data.settlements.length ? 
        encodeURIComponent(`*${data.group_name} Settlements*\n` + data.settlements.map(s => `${s.from} owes ${s.to}: ₹${s.amount}`).join('\n')) :
        encodeURIComponent(`*${data.group_name}* is completely settled up! 🎉`);
        
      html += `<button class="submit-btn" style="background:#25D366;color:#fff;" onclick="window.open('https://wa.me/?text=${summaryText}', '_blank')">Share via WhatsApp 💬</button>`;
      
      document.getElementById('settlement-results').innerHTML = html;
      openModal('settleModal');
    }
  } catch(err) {
    showToast('Network error', 'error');
  }
}

async function settleSplit(id) {
  if (!confirm('Mark all expenses in this group as fully settled?')) return;
  try {
    const res = await fetch(`/api/splits/${id}/settle/`, {
      method: 'POST',
      headers: {'X-CSRFToken': getCsrf()}
    });
    if (res.ok) {
      showToast('Group settled! 🎉', 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      showToast('Failed to settle group', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

// ── DAILY MONEY TIP ───────────────────────────────────────────────────
async function fetchDailyTip() {
  const tipEl = document.getElementById('daily-tip-text');
  if (!tipEl) return;
  try {
    const res = await fetch('/api/daily-tip/');
    if (res.ok) {
      const data = await res.json();
      tipEl.textContent = data.tip || "Save more today!";
    } else {
      tipEl.textContent = "Log more expenses to get personalized tips! 💡";
    }
  } catch (err) {
    tipEl.textContent = "Ready to start saving? 💸";
  }
}

// ── INITIAL RENDER ────────────────────────────────────────────────────
render();
fetchDailyTip();

// ── REAL-TIME POLLING ─────────────────────────────────────────────────
let currentLatestId = expenses.length > 0 ? Math.max(...expenses.map(e => parseInt(e.id))) : 0;

setInterval(async function() {
  if (document.hidden) return;
  try {
    const response = await fetch('/api/latest-update-time/', {
      method: 'GET',
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    });
    if (response.ok) {
      const data = await response.json();
      if (data.latest_id > currentLatestId) {
        console.log(`New expense detected! Reloading...`);
        showToast('New expense added via WhatsApp! Refreshing... 🔄', 'success', 2000);
        currentLatestId = data.latest_id;
        setTimeout(() => location.reload(), 300);
      }
    }
  } catch (error) {
    console.warn("Background update check failed:", error);
  }
}, 1500);

// Poll for WA Link Status if not linked yet

let linkPollInterval = setInterval(async function() {
  if (document.hidden) return;
  try {
    const response = await fetch('/api/wa-link-status/', {
      method: 'GET',
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    });
    if (response.ok) {
      const data = await response.json();
      if (data.linked) {
        clearInterval(linkPollInterval);
        
        // Hide the banner if it exists
        const waBanner = document.getElementById('wa-banner');
        if (waBanner) {
            waBanner.style.transition = 'opacity 0.5s ease-out';
            waBanner.style.opacity = '0';
            setTimeout(() => {
                waBanner.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:center; width:100%; gap:12px; color: var(--green);">
                        <svg viewBox="0 0 24 24" style="width: 32px; height: 32px; fill: currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <span style="font-size: 1.2rem; font-weight: 700; font-family: 'Outfit', sans-serif;">WhatsApp Successfully Connected ✅</span>
                    </div>
                `;
                waBanner.style.opacity = '1';
                // Remove entirely after a few seconds
                setTimeout(() => waBanner.remove(), 4000);
            }, 500);
        }
        showToast('WhatsApp successfully connected!', 'success');
      }
    }
  } catch (err) {
    console.warn("WA link poll failed:", err);
  }
}, 3000);


