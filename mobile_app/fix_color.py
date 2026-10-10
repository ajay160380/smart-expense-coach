import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix DonutChart mainColor definition
    content = content.replace(
        "const mainColor = data && data.length > 0 ? data[0].color : '#A78BFA';",
        "const mainColor = (data && data.length > 0 && data[0].color) ? data[0].color : '#A78BFA';"
    )
    
    with open(filepath, 'w') as f:
        f.write(content)

fix_file('src/screens/DashboardScreen.js')
fix_file('src/screens/AnalyticsScreen.js')
print("Done fixing DonutChart colors")
