import os
import requests
from dotenv import load_dotenv

load_dotenv('.env')
api_key = os.getenv('GROQ_API_KEY')
headers = {
    "Authorization": f"Bearer {api_key}"
}
response = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
models = response.json()
print([model['id'] for model in models.get('data', [])])
