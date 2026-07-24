import re

path = 'backend/tracker/templates/tracker/dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the CSS
old_css = """  .app-sidebar-btn {
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    background: transparent;
    border: none;
    text-align: left;
    font-weight: 600;
    font-size: 14px;
    color: var(--text2);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .app-sidebar-btn:hover {
    background: var(--surface2);
    color: var(--text);
  }
  .app-sidebar-btn.active {
    background: var(--primary-l);
    color: var(--primary);
    border-left: 3px solid var(--primary);
  }"""

new_css = """  .app-sidebar-btn {
    padding: 10px 16px;
    border-radius: 14px;
    background: transparent;
    border: 1px solid transparent;
    text-align: left;
    font-weight: 500;
    font-size: 15px;
    color: var(--text2);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 6px;
  }
  .app-sidebar-btn:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
    transform: translateX(4px);
  }
  .app-sidebar-btn.active {
    background: linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(167, 139, 250, 0.05) 100%);
    color: #fff;
    border: 1px solid rgba(56, 189, 248, 0.3);
    box-shadow: 0 4px 15px rgba(56, 189, 248, 0.1), inset 0 0 10px rgba(56, 189, 248, 0.05);
  }
  .menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    font-size: 16px;
    transition: all 0.3s ease;
  }
  .app-sidebar-btn.active .menu-icon {
    background: linear-gradient(135deg, #38bdf8, #818cf8);
    box-shadow: 0 4px 12px rgba(56, 189, 248, 0.4);
    color: white;
  }"""

content = content.replace(old_css, new_css)

# 2. Replace the HTML
old_html = """      <button class="app-sidebar-btn active" onclick="switchTab('overview', this)">📊 Overview</button>
      <button class="app-sidebar-btn" onclick="switchTab('transactions', this)">💳 Transactions</button>
      <button class="app-sidebar-btn" onclick="switchTab('notepad_goals', this)">📝 Notepad & Goals</button>
      <button class="app-sidebar-btn" onclick="switchTab('ai_coach', this)">🤖 AI Coach & Insights</button>"""

new_html = """      <button class="app-sidebar-btn active" onclick="switchTab('overview', this)"><span class="menu-icon">📊</span> Overview</button>
      <button class="app-sidebar-btn" onclick="switchTab('transactions', this)"><span class="menu-icon">💳</span> Transactions</button>
      <button class="app-sidebar-btn" onclick="switchTab('notepad_goals', this)"><span class="menu-icon">📝</span> Notepad & Goals</button>
      <button class="app-sidebar-btn" onclick="switchTab('ai_coach', this)"><span class="menu-icon">🤖</span> AI Coach</button>"""

content = content.replace(old_html, new_html)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Menu upgraded!")
