import re

filepath = 'backend/tracker/templates/tracker/dashboard.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove previous mobile fixes blocks to avoid duplicates
content = re.sub(r'/\* --- MOBILE FIXES --- \*/.*?(?=</style>)', '', content, flags=re.DOTALL)

advanced_mobile_css = """
/* --- ADVANCED MOBILE OPTIMIZATIONS --- */
@media (max-width: 768px) {
    /* 1. Eliminate Lag: Disable heavy animations & reduce blur */
    body::before, body::after {
        animation: none !important;
        opacity: 0.1 !important;
        background-size: cover !important;
    }
    .card, .insight-panel, .app-sidebar, .hero {
        backdrop-filter: blur(4px) !important;
        -webkit-backdrop-filter: blur(4px) !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        border: 1px solid rgba(255,255,255,0.05) !important;
    }
    .hero::before { animation: none !important; opacity: 0.2 !important; }
    
    /* Hardware acceleration for scrolling */
    .app-sidebar, .tx-list, .dash-main {
        transform: translateZ(0);
        -webkit-overflow-scrolling: touch;
    }

    /* 2. Redesign Header */
    .nav {
        padding: 12px !important;
        display: flex !important;
        flex-wrap: nowrap !important;
        justify-content: space-between !important;
        align-items: center !important;
    }
    .nav-brand { font-size: 16px !important; }

    /* 3. Redesign Sidebar into Swipable Tabs */
    .app-sidebar {
        display: flex !important;
        flex-direction: row !important;
        overflow-x: auto !important;
        white-space: nowrap !important;
        padding: 8px 12px !important;
        gap: 8px !important;
        scrollbar-width: none; /* Firefox */
        border-right: none !important;
        border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        position: relative !important;
        top: 0 !important;
        background: transparent !important;
    }
    .app-sidebar::-webkit-scrollbar { display: none; }
    .app-sidebar-btn {
        flex: 0 0 auto !important;
        padding: 8px 16px !important;
        font-size: 13px !important;
        border-radius: 20px !important;
        background: rgba(255,255,255,0.03) !important;
        border: 1px solid rgba(255,255,255,0.05) !important;
    }
    .app-sidebar-btn.active {
        background: rgba(255,255,255,0.1) !important;
        border-color: rgba(255,255,255,0.2) !important;
    }

    /* 4. Fix Hero & Card padding */
    .hero { padding: 20px !important; }
    .hero-amount { font-size: 28px !important; }
    .card { padding: 16px !important; margin-bottom: 12px !important; }
    .grid2, .compare-grid, .goals-grid, .stat-row { 
        grid-template-columns: 1fr !important; 
        gap: 12px !important; 
    }

    /* 5. Bottom Action Bar Redesign */
    .app { padding-bottom: 90px !important; } /* Space for bottom bar */
    
    .floating-dock {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        width: 100% !important;
        transform: none !important;
        border-radius: 24px 24px 0 0 !important;
        padding: 12px 16px !important;
        display: flex !important;
        justify-content: space-around !important;
        gap: 8px !important;
        border-bottom: none !important;
        border-left: none !important;
        border-right: none !important;
        background: rgba(15, 15, 20, 0.85) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        box-shadow: 0 -4px 24px rgba(0,0,0,0.4) !important;
        animation: none !important;
    }
    .floating-dock .add-btn, .floating-dock .voice-btn {
        flex: 1 !important;
        padding: 12px !important;
        font-size: 13px !important;
        display: flex !important;
        justify-content: center !important;
        border-radius: 12px !important;
    }
    
    /* Ensure AI Fab doesn't overlap */
    .ai-fab {
        bottom: 80px !important;
        right: 16px !important;
        width: 48px !important;
        height: 48px !important;
        font-size: 20px !important;
    }
}
"""

content = content.replace("</style>", advanced_mobile_css + "\n</style>")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Advanced mobile optimizations applied.")
