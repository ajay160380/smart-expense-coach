import re
content = """
<think>
Here's a thinking process...
</think>

Here's a short, versatile message you can use:

"Hope you're having a great day! Reach out anytime if you need support or just want to connect. Take care!"
"""
ans = re.sub(r"<think>(?:.*?</think>|.*$)", "", content, flags=re.DOTALL).strip()
print("STRIPPED:")
print(repr(ans))
