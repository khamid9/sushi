from pathlib import Path

from PIL import Image, ImageDraw


SOURCE_DIR = Path(r"C:\Users\TechnoHub_1\Desktop\sushi-cafe\menu-source\embedded")
OUTPUT_PATH = Path(r"C:\Users\TechnoHub_1\Desktop\sushi-cafe\menu-source\contact-sheet.jpg")

files = sorted(SOURCE_DIR.glob("*.jpeg"))
canvas = Image.new("RGB", (720, 1560), "#151515")
draw = ImageDraw.Draw(canvas)

for index, file_path in enumerate(files):
    image = Image.open(file_path).convert("RGB")
    image.thumbnail((220, 220))
    column = index % 3
    row = index // 3
    x = column * 240 + 10
    y = row * 260 + 10
    canvas.paste(image, (x, y))
    draw.text((x, y + 230), file_path.name, fill="#ffffff")

canvas.save(OUTPUT_PATH, quality=90)
print(OUTPUT_PATH)
