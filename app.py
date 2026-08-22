import os
import sys
import subprocess

if __name__ == "__main__":
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    os.chdir(backend_dir)
    
    print("🚀 Running Django migrations...", flush=True)
    subprocess.run([sys.executable, "manage.py", "migrate"], check=False)
    
    print("🚀 Starting Django Server on 0.0.0.0:7860...", flush=True)
    subprocess.run([sys.executable, "manage.py", "runserver", "0.0.0.0:7860", "--insecure"])
