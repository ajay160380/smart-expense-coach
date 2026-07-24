import os

dashboard_path = 'backend/tracker/templates/tracker/dashboard.html'
partials_dir = 'backend/tracker/templates/tracker/partials'

if not os.path.exists(partials_dir):
    os.makedirs(partials_dir)

with open(dashboard_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Define blocks to extract using string find
blocks = {
    'hero_stats.html': ('<!-- HERO (CLEAN STAT STYLE) -->', '<!-- CATEGORY + CHART -->'),
    'analytics.html': ('<!-- CATEGORY + CHART -->', '<!-- INSIGHT PANEL -->'),
    'insight_panel.html': ('<!-- INSIGHT PANEL -->', '<!-- ✅ TRANSACTIONS — SCROLLABLE VERSION -->'),
    'transactions.html': ('<!-- ✅ TRANSACTIONS — SCROLLABLE VERSION -->', '    </div><!-- /dash-main -->'),
    'ai_coach.html': ('<!-- AI BANNER -->', '<!-- BILLS -->'),
    'bills.html': ('<!-- BILLS -->', '<!-- 📝 NOTEPAD -->'),
    'notepad.html': ('<!-- 📝 NOTEPAD -->', '<!-- 📊 MONTHLY COMPARISON -->'),
    'monthly_comparison.html': ('<!-- 📊 MONTHLY COMPARISON -->', '<!-- 💡 DAILY TIP -->'),
    'daily_tip.html': ('<!-- 💡 DAILY TIP -->', '<!-- 🎯 SAVINGS GOALS -->'),
    'savings_goals.html': ('<!-- 🎯 SAVINGS GOALS -->', '<!-- 📱 EXPENSE SPLIT -->'),
    'split_expenses.html': ('<!-- 📱 EXPENSE SPLIT -->', '    </div><!-- /dash-side -->'),
    'ai_fab.html': ('<!-- AI FAB -->', '<!-- MODALS -->'),
    'modals.html': ('<!-- MODALS -->', '{% endblock %}')
}

new_html = html

for filename, (start_marker, end_marker) in blocks.items():
    start_idx = new_html.find(start_marker)
    if start_idx == -1: continue
    end_idx = new_html.find(end_marker, start_idx)
    
    if end_idx != -1:
        content = new_html[start_idx:end_idx].strip()
        with open(os.path.join(partials_dir, filename), 'w', encoding='utf-8') as f:
            f.write(content)
        replacement = f"{{% include 'tracker/partials/{filename}' %}}\n"
        new_html = new_html[:start_idx] + replacement + new_html[end_idx:]

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Dashboard successfully split into partials!")
