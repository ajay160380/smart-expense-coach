import re

path = 'backend/tracker/templates/tracker/dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

animated_css = """
/* 🚀 ANIMATED AURORA THEME 🚀 */
body {
    position: relative;
    overflow-x: hidden;
}

/* Moving Aurora Orbs */
body::before, body::after {
    content: '';
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    z-index: -1;
    pointer-events: none;
    opacity: 0.6;
}
body::before {
    background: radial-gradient(circle at 40% 60%, rgba(56, 189, 248, 0.15), transparent 45%);
    animation: aurora-1 15s infinite ease-in-out alternate;
}
body::after {
    background: radial-gradient(circle at 60% 40%, rgba(167, 139, 250, 0.15), transparent 45%);
    animation: aurora-2 20s infinite ease-in-out alternate-reverse;
}

@keyframes aurora-1 {
    0% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(15%, -10%) scale(1.1); }
    100% { transform: translate(-10%, 15%) scale(0.9); }
}
@keyframes aurora-2 {
    0% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-15%, 15%) scale(1.2); }
    100% { transform: translate(10%, -10%) scale(0.95); }
}

/* Super Frosted Glassmorphism */
.card, .app-sidebar, .insight-panel, .split-card, .goal-card, .note-card, .h-stat, .stat-card, .txn-item {
    background: rgba(15, 23, 42, 0.25) !important;
    backdrop-filter: blur(40px) !important;
    -webkit-backdrop-filter: blur(40px) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* Glowing Hover Effects */
.card:hover, .split-card:hover, .goal-card:hover, .note-card:hover {
    box-shadow: 0 0 40px rgba(167, 139, 250, 0.15), 0 15px 40px rgba(0,0,0,0.6) !important;
    border-color: rgba(167, 139, 250, 0.3) !important;
}
.budget-btn:hover, .goal-action-btn:hover, .split-action:hover, .note-del-btn:hover {
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.3) !important;
    transform: translateY(-2px);
}

/* Animated Gradient Text */
.hero-amount, .sc-val {
    background: linear-gradient(270deg, #38bdf8, #818cf8, #a78bfa, #38bdf8);
    background-size: 300% 300%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-text 8s ease infinite;
}

@keyframes gradient-text {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}
"""

if "/* 🚀 ANIMATED AURORA THEME 🚀 */" not in content:
    content = content.replace("</style>", animated_css + "\n</style>")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Animated theme CSS injected")
