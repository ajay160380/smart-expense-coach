import re
import time

def revert_logo(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The exact SVG string I injected
    svg_logo = r'<div style="background: linear-gradient\(135deg, var\(--primary\), var\(--primary-h\)\); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba\(0,0,0,0\.2\);\"><svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><line x1=\"2\" y1=\"10\" x2=\"22\" y2=\"10\"/></svg></div>'
    
    # The new img tag (using object-fit cover and border-radius to cut off any white corners)
    ts = int(time.time())
    new_img = f'<img src="{{% static \'tracker/images/icon.png\' %}}?v={ts}" alt="ExpenseTracker Logo" style="height: 44px; width: 44px; border-radius: 12px; object-fit: cover; background-color: transparent; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">'
    
    content = re.sub(svg_logo, new_img, content)

    # Also, some other pages like login/register/forgot_password might have used it. But they had the original img tag.
    # Let's ensure the original img tag has border-radius 12px to crop white corners
    old_img_regex = r'<img src="{% static \'tracker/images/icon\.png\' %}"[^>]*>'
    new_img_plain = f'<img src="{{% static \'tracker/images/icon.png\' %}}?v={ts}" alt="Logo" style="height: 60px; width: 60px; border-radius: 16px; object-fit: cover;">'
    content = re.sub(old_img_regex, new_img_plain, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

revert_logo('backend/tracker/templates/tracker/dashboard.html')
revert_logo('backend/tracker/templates/tracker/base.html')
revert_logo('backend/tracker/templates/tracker/login.html')
revert_logo('backend/tracker/templates/tracker/register.html')
revert_logo('backend/tracker/templates/tracker/forgot_password.html')

print("Logo reverted and styles updated for border-radius.")
