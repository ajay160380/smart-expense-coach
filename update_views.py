import re
with open('backend/tracker/views.py', 'r') as f:
    code = f.read()

# Replace model
code = re.sub(r'model="llama-3\.1-8b-instant"', 'model="llama-3.3-70b-versatile"', code)
code = re.sub(r'model="qwen/qwen3\.6-27b"', 'model="llama-3.3-70b-versatile"', code)

# Remove the regex stripping
old_line = 'ans = re.sub(r"<think>(?:.*?</think>|.*$)", "", r.choices[0].message.content, flags=re.DOTALL).strip()'
new_line = 'ans = (r.choices[0].message.content or "").strip()'
code = code.replace(old_line, new_line)

with open('backend/tracker/views.py', 'w') as f:
    f.write(code)
print("Updated views.py")
