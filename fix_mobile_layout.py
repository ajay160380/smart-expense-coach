import re

def fix_mobile(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace the broken image logo with a sleek SVG logo
    svg_logo = '''<div style="background: linear-gradient(135deg, var(--primary), var(--primary-h)); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>'''
    
    content = re.sub(r'<img src="{% static \'tracker/images/icon\.png\' %}[^>]*>', svg_logo, content)

    # 2. Add Mobile CSS Overrides if they don't exist
    mobile_css = """
/* --- MOBILE FIXES --- */
@media (max-width: 768px) {
    /* Stop Lag on Mobile */
    body::before, body::after { animation: none !important; opacity: 0.2 !important; }
    .card, .insight-panel, .app-sidebar { backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; }
    
    /* Fix Sidebar Menu Squishing */
    .app-sidebar { 
        display: flex !important; 
        flex-direction: row !important; 
        overflow-x: auto !important; 
        white-space: nowrap !important; 
        flex-wrap: nowrap !important;
        scrollbar-width: none; 
        padding-bottom: 5px !important;
        justify-content: flex-start !important;
    }
    .app-sidebar::-webkit-scrollbar { display: none; }
    .app-sidebar-btn { flex: 0 0 auto !important; padding: 10px 14px !important; }
    
    /* Fix FAB overlap */
    .floating-dock { flex-wrap: wrap !important; justify-content: center !important; }
    
    /* Ensure Header wraps correctly */
    .nav { flex-wrap: wrap; justify-content: space-between; }
    .nav-brand { flex: 1 1 auto; }
}
"""
    if "/* --- MOBILE FIXES --- */" not in content:
        # Find the last closing style tag and insert before it
        content = content.replace("</style>", mobile_css + "\n</style>")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_mobile('backend/tracker/templates/tracker/dashboard.html')
fix_mobile('backend/tracker/templates/tracker/base.html')

print("Mobile CSS and Logo fixed.")
