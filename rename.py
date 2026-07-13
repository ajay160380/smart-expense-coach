import os
import re

dirs_to_skip = {'.git', 'node_modules', 'env', '__pycache__', 'dist', 'build', '.expo'}
exts_to_check = {'.py', '.html', '.js', '.json', '.md'}

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in dirs_to_skip]
    for file in files:
        if any(file.endswith(ext) for ext in exts_to_check):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                continue

            new_content = content.replace('Expense Tracker', 'Expense Tracker')
            new_content = new_content.replace('ExpenseTracker', 'ExpenseTracker')
            new_content = new_content.replace('EXPENSE TRACKER', 'EXPENSE TRACKER')
            
            # Avoid replacing the HF URL by temporarily protecting it
            # HF URL: ajay160380-paisa-mitra.hf.space
            # If they want everything renamed, I will just do it, but HF URL MUST stay the same otherwise the app breaks!
            # Wait, let's just do simple string replacements. But what if "paisa-mitra" is in a URL? The script above only does 'Expense Tracker' and 'ExpenseTracker', not 'paisa-mitra'.
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
