import sys

path = 'backend/tracker/templates/tracker/dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

layout_code = """  <style>
  /* ── SIDEBAR LAYOUT ── */
  .dash-app-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }
  .app-sidebar {
    width: 240px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: sticky;
    top: 24px;
    flex-shrink: 0;
  }
  .app-sidebar-btn {
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
  }
  .app-content {
    flex: 1;
    min-width: 0;
  }
  .tab-pane {
    display: none;
    animation: fadeIn 0.3s ease;
  }
  .tab-pane.active {
    display: block;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  
  @media(max-width: 768px) {
    .dash-app-layout { flex-direction: column; }
    .app-sidebar { width: 100%; position: static; flex-direction: row; overflow-x: auto; padding: 12px; }
    .app-sidebar-btn { white-space: nowrap; }
  }
  </style>
  <div class="dash-app-layout">
    <!-- LEFT SIDEBAR -->
    <div class="app-sidebar">
      <div style="font-weight: 800; font-size: 18px; margin-bottom: 12px; padding: 0 8px; color: var(--text); font-family: 'Outfit', sans-serif;">Paisa Mitra</div>
      <button class="app-sidebar-btn active" onclick="switchTab('overview', this)">📊 Overview</button>
      <button class="app-sidebar-btn" onclick="switchTab('transactions', this)">💳 Transactions</button>
      <button class="app-sidebar-btn" onclick="switchTab('notepad_goals', this)">📝 Notepad & Goals</button>
      <button class="app-sidebar-btn" onclick="switchTab('ai_coach', this)">🤖 AI Coach & Insights</button>
    </div>

    <!-- RIGHT CONTENT -->
    <div class="app-content">
      
      <!-- OVERVIEW TAB -->
      <div id="tab-overview" class="tab-pane active">
        <div class="dash-layout">
          <div class="dash-main">
            <div class="bento-top">
              {% include 'tracker/partials/hero_stats.html' %}
            </div>
            {% include 'tracker/partials/analytics.html' %}
          </div>
          <div class="dash-side">
            {% include 'tracker/partials/bills.html' %}
          </div>
        </div>
      </div>

      <!-- TRANSACTIONS TAB -->
      <div id="tab-transactions" class="tab-pane">
        {% include 'tracker/partials/transactions.html' %}
      </div>

      <!-- NOTEPAD & GOALS TAB -->
      <div id="tab-notepad_goals" class="tab-pane">
        <div class="dash-layout">
          <div class="dash-main">
            {% include 'tracker/partials/notepad.html' %}
          </div>
          <div class="dash-side">
            {% include 'tracker/partials/savings_goals.html' %}
            {% include 'tracker/partials/split_expenses.html' %}
          </div>
        </div>
      </div>

      <!-- AI COACH TAB -->
      <div id="tab-ai_coach" class="tab-pane">
        <div class="dash-layout">
          <div class="dash-main">
            {% include 'tracker/partials/monthly_comparison.html' %}
            {% include 'tracker/partials/insight_panel.html' %}
          </div>
          <div class="dash-side">
            {% include 'tracker/partials/ai_coach.html' %}
            {% include 'tracker/partials/daily_tip.html' %}
          </div>
        </div>
      </div>

    </div>
  </div>
  <script>
    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.app-sidebar-btn').forEach(el => el.classList.remove('active'));
      
      document.getElementById('tab-' + tabId).classList.add('active');
      btn.classList.add('active');
    }
  </script>
"""

# Find lines to replace
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "<!-- ═══ 2 COLUMN DASHBOARD LAYOUT ═══ -->" in line:
        start_idx = i
    if "<!-- /dash-layout -->" in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx] + [layout_code + '\n'] + lines[end_idx+1:]
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Replaced!")
else:
    print(f"Could not find markers. {start_idx}, {end_idx}")
