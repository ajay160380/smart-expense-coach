import re

path = 'backend/tracker/views.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove any existing django_ratelimit imports
content = re.sub(r'from django_ratelimit\.decorators import .*?\n', '', content)

# Add the import at the very top, just after the docstring or first line
content = "from django_ratelimit.decorators import ratelimit\n" + content

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Import fixed.")
