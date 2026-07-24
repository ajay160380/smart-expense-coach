import re

path = 'backend/tracker/templates/tracker/dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add renderMiniTxns() call in render()
if 'renderMiniTxns();' not in content:
    content = content.replace('renderTxns();', 'renderTxns();\n  renderMiniTxns();')

# 2. Add the actual function if it doesn't exist
mini_txn_fn = """
function renderMiniTxns() {
  const el = document.getElementById('mini-txn-list');
  if (!el) return;
  const top4 = [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,4);
  if (!top4.length) {
    el.innerHTML = '<div class="empty">No recent activity 😴</div>';
    return;
  }
  el.innerHTML = top4.map(t => `
    <div class="txn-item" style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--border2); display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="cat-icon" style="font-size: 20px; background: rgba(255,255,255,0.05); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">${ICONS[t.cat]||'💰'}</div>
        <div>
          <div style="font-size: 13px; font-weight: 500; color: var(--text);">${esc(t.note) || t.cat.toUpperCase()}</div>
          <div style="font-size: 11px; color: var(--text3);">${fmtD(t.date)}</div>
        </div>
      </div>
      <div style="font-size: 14px; font-weight: 600; color: var(--text);">- ${fmt(t.amount)}</div>
    </div>
  `).join('');
}
"""

if 'function renderMiniTxns()' not in content:
    content = content.replace('function renderTxns() {', mini_txn_fn + '\nfunction renderTxns() {')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Mini txns JS added successfully")
