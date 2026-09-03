import os
from groq import Groq

client = Groq(api_key=os.environ.get('GROQ_API_KEY'))
try:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": "hello"}],
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        max_tokens=1000,
    )
    print(response.choices[0].message.content)
except Exception as e:
    print('ERROR:', str(e))
