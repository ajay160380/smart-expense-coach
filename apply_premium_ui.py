import sys
import re

path = 'backend/tracker/templates/tracker/dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject Premium CSS
premium_css = """
/* 🌟 PREMIUM UI UPGRADE 🌟 */
body {
    background: radial-gradient(circle at 15% 50%, rgba(56, 189, 248, 0.08), transparent 25%),
                radial-gradient(circle at 85% 30%, rgba(167, 139, 250, 0.08), transparent 25%),
                var(--bg);
    background-attachment: fixed;
}
.card, .app-sidebar, .insight-panel {
    background: rgba(15, 23, 42, 0.6) !important;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
}
.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
}
.app-sidebar { position: sticky; top: 24px; }

/* 📝 NOTEPAD PREMIUM */
.note-card {
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    position: relative;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    margin-bottom: 12px;
}
.note-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    border-color: rgba(255,255,255,0.15);
}
.note-content {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text);
    margin-bottom: 16px;
}
.note-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--text3);
    border-top: 1px dashed var(--border2);
    padding-top: 12px;
    font-weight: 500;
}
.note-del-btn {
    background: rgba(255, 71, 87, 0.1);
    color: var(--red);
    border: none;
    padding: 5px 14px;
    border-radius: 20px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}
.note-del-btn:hover {
    background: var(--red);
    color: #fff;
    box-shadow: 0 4px 12px rgba(255, 71, 87, 0.4);
}

/* 🎯 GOAL CARD PREMIUM */
.goal-card {
    background: rgba(30, 41, 59, 0.5) !important;
    border: 1px solid rgba(255,255,255,0.06) !important;
    border-radius: 16px !important;
    padding: 24px !important;
    display: flex;
    flex-direction: column;
    gap: 16px;
    transition: all 0.3s ease;
}
.goal-card:hover {
    background: rgba(30, 41, 59, 0.8) !important;
    border-color: var(--primary-l) !important;
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.3);
}
.goal-actions {
    display: flex;
    gap: 12px !important;
    margin-top: auto;
}
.goal-action-btn {
    flex: 1;
    padding: 12px !important;
    border-radius: 12px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    border: 1px solid var(--border2) !important;
    background: rgba(255,255,255,0.03) !important;
    color: var(--text) !important;
    cursor: pointer;
    transition: all 0.2s ease !important;
}
.goal-action-btn:hover {
    background: var(--primary-l) !important;
    color: var(--primary) !important;
    border-color: var(--primary) !important;
}
.goal-action-btn.danger:hover {
    background: rgba(255, 71, 87, 0.1) !important;
    color: var(--red) !important;
    border-color: var(--red) !important;
}

/* 📱 SPLIT CARD PREMIUM */
.split-card {
    background: rgba(30, 41, 59, 0.5) !important;
    border: 1px solid rgba(255,255,255,0.06) !important;
    border-radius: 16px !important;
    padding: 24px !important;
    margin-bottom: 16px !important;
    transition: all 0.3s ease;
}
.split-card:hover {
    border-color: var(--primary-l) !important;
    background: rgba(30, 41, 59, 0.8) !important;
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.3);
}
.split-actions-row {
    display: flex;
    gap: 10px !important;
    flex-wrap: wrap;
    margin-top: 20px !important;
}
.split-action {
    flex: 1 1 calc(50% - 5px);
    padding: 12px !important;
    border-radius: 12px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    border: 1px solid var(--border2) !important;
    background: rgba(255,255,255,0.03) !important;
    color: var(--text2) !important;
    cursor: pointer;
    transition: all 0.2s ease !important;
    text-align: center;
}
.split-action:hover {
    background: var(--primary-l) !important;
    color: var(--primary) !important;
    border-color: var(--primary) !important;
}
"""

if "/* 🌟 PREMIUM UI UPGRADE 🌟 */" not in content:
    content = content.replace("</style>", premium_css + "\n</style>")

# 2. Update loadNotes() Javascript
new_load_notes = """async function loadNotes() {
    try {
        const res = await fetch('/api/notes/');
        const data = await res.json();
        const list = document.getElementById('notes-list');
        if (data.notes && data.notes.length > 0) {
            list.innerHTML = data.notes.map(note => `
                <div class="note-card">
                    <div class="note-content">${note.text.replace(/\\n/g, '<br>')}</div>
                    <div class="note-footer">
                        <span><span style="font-size:14px; margin-right:4px;">🗓️</span> ${new Date(note.created_at).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                        <button class="note-del-btn" onclick="deleteNote(${note.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `<div class="empty-state">No notes found. Create one!</div>`;
        }
    } catch (e) {
        console.error(e);
    }
}"""

# regex replace the existing loadNotes() completely
# We find the start of function and end of it.
pattern = re.compile(r'async function loadNotes\(\) \{.*?\n\}', re.DOTALL)
content = pattern.sub(new_load_notes, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Premium CSS and updated loadNotes()")
