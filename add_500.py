import os

path = 'backend/tracker/views.py'
with open(path, 'a', encoding='utf-8') as f:
    f.write("""

def server_error(request, *args, **kwargs):
    import logging
    logger = logging.getLogger('django.request')
    logger.error('Internal Server Error: %s', request.path)
    
    if request.path.startswith('/api/'):
        from django.http import JsonResponse
        return JsonResponse({"error": "Internal Server Error"}, status=500)
    from django.shortcuts import render
    return render(request, "500.html", status=500)
""")

# Create a simple 500.html template if it doesn't exist
template_dir = 'backend/tracker/templates'
os.makedirs(template_dir, exist_ok=True)
template_path = os.path.join(template_dir, '500.html')
if not os.path.exists(template_path):
    with open(template_path, 'w', encoding='utf-8') as f:
        f.write("""
<!DOCTYPE html>
<html>
<head>
    <title>Server Error (500)</title>
    <style>
        body { font-family: sans-serif; text-align: center; padding-top: 50px; background: #121212; color: #fff; }
        h1 { color: #f87171; }
    </style>
</head>
<body>
    <h1>Oops! Something went wrong.</h1>
    <p>We're experiencing an internal server error. Please try again later.</p>
</body>
</html>
""")

print("500 handler added.")
