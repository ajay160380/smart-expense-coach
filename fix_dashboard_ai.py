import sys

path = 'backend/tracker/templates/tracker/dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start of AI COACH TAB
start_idx = -1
for i, line in enumerate(lines):
    if "<!-- AI COACH TAB -->" in line:
        start_idx = i
        break

if start_idx != -1:
    # Rewrite everything from AI COACH TAB down to the end of the HTML structure (before JS)
    
    # We want to replace from start_idx up to the <script> block at the bottom
    script_idx = -1
    for i in range(start_idx, len(lines)):
        if "<script>" in lines[i] and "function switchTab" in lines[i+1]:
            script_idx = i
            break
            
    if script_idx != -1:
        new_content = """      <!-- AI COACH TAB -->
      <div id="tab-ai_coach" class="tab-pane">
        <div class="dash-layout">
          <div class="dash-main">
            {% include 'tracker/partials/monthly_comparison.html' %}
            {% include 'tracker/partials/ai_chat_inline.html' %}
          </div>
          <div class="dash-side">
            {% include 'tracker/partials/ai_coach.html' %}
            {% include 'tracker/partials/daily_tip.html' %}
          </div>
        </div>
      </div>

    </div>
  </div>
"""
        new_lines = lines[:start_idx] + [new_content] + lines[script_idx:]
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print("AI Coach tab fixed!")
    else:
        print("Script tag not found")
else:
    print("AI Coach tab not found")
