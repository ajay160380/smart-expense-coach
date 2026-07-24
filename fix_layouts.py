import re

path = 'backend/tracker/templates/tracker/dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix goals-grid columns from 1fr 1fr to 1fr
content = content.replace('.goals-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}', '.goals-grid{display:grid;grid-template-columns:1fr;gap:16px;}')

# 2. Add .notes-grid CSS right before </style>
notes_grid_css = """
.notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    align-items: start;
    padding-bottom: 20px;
}
"""
content = content.replace('</style>', notes_grid_css + '\n</style>')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# 3. Update notepad.html to use notes-grid instead of bills-scroll
np_path = 'backend/tracker/templates/tracker/partials/notepad.html'
with open(np_path, 'r', encoding='utf-8') as f:
    np_content = f.read()

np_content = np_content.replace('class="bills-scroll"', 'class="notes-grid"')
with open(np_path, 'w', encoding='utf-8') as f:
    f.write(np_content)

print("Layout fixes applied!")
