import re

filepath = 'backend/tracker/templates/tracker/dashboard.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to insert the .ai-popup rule inside the @media (max-width: 768px) block.
# Let's find the closing brace of that media block.
ai_mobile_css = """
    /* 6. AI Bot Mobile Redesign (Bottom Sheet) */
    .ai-popup {
        width: 100vw !important;
        max-width: 100vw !important;
        height: 85vh !important;
        bottom: 0 !important;
        right: 0 !important;
        left: 0 !important;
        border-radius: 24px 24px 0 0 !important;
        z-index: 10000 !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        transform-origin: bottom center !important;
        border-left: none !important;
        border-right: none !important;
        border-bottom: none !important;
    }
"""

if ".ai-popup {" not in content.split('/* --- ADVANCED MOBILE OPTIMIZATIONS --- */')[-1]:
    content = content.replace("    .ai-fab {", ai_mobile_css + "\n    .ai-fab {")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("AI bot mobile layout fixed safely.")
