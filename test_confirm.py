import requests
import json

url = "http://127.0.0.1:8000/api/confirm-tip-sent/"
data = {"secret": "paisamitra-daily-2025", "user_id": 1, "type": "night"}
try:
    res = requests.post(url, json=data)
    print(res.status_code, res.text)
except Exception as e:
    print(e)
