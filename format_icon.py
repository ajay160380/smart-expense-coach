import sys
from PIL import Image, ImageOps

img_path = sys.argv[1]
img = Image.open(img_path).convert("RGBA")

# Create a 1024x1024 white background
bg = Image.new("RGBA", (1024, 1024), (255, 255, 255, 255))

# Resize image to fit nicely within 1024x1024, say 800x800 max
img.thumbnail((800, 800), Image.Resampling.LANCZOS)
bg.paste(img, ((1024 - img.width) // 2, (1024 - img.height) // 2), img)

bg.save("mobile_app/assets/icon.png", format="PNG")
bg.save("mobile_app/assets/android-icon-foreground.png", format="PNG")

# Adaptive background (just solid white)
bg_color = Image.new("RGBA", (1024, 1024), (255, 255, 255, 255))
bg_color.save("mobile_app/assets/android-icon-background.png", format="PNG")
bg.save("mobile_app/assets/splash-icon.png", format="PNG")

print("Icons generated successfully!")
