from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


SOURCE = Path(r"C:\Users\TechnoHub_1\Desktop\sushi-cafe\public\menu")
OUTPUT = SOURCE / "sets"
OUTPUT.mkdir(parents=True, exist_ok=True)


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGB", size, "#0D0D0D")
    source = image.convert("RGB")
    source.thumbnail((size[0] * 2, size[1] * 2))
    scale = max(size[0] / source.width, size[1] / source.height)
    resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    canvas.paste(resized.crop((left, top, left + size[0], top + size[1])), (0, 0))
    canvas = ImageEnhance.Contrast(canvas).enhance(1.08)
    canvas = ImageEnhance.Color(canvas).enhance(1.05)
    return canvas


def rounded_tile(image: Image.Image, size: tuple[int, int], radius: int = 18) -> Image.Image:
    tile = cover(image, size)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius, fill=255)
    result = Image.new("RGB", size, "#151515")
    result.paste(tile, (0, 0), mask)
    return result


def create_composite(name: str, left: str, right_top: str, right_bottom: str) -> None:
    canvas = Image.new("RGB", (1600, 1000), "#0D0D0D")
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.rectangle((20, 20, 1580, 980), fill=(0, 0, 0, 230))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")

    left_tile = rounded_tile(Image.open(SOURCE / left), (920, 944), 20)
    top_tile = rounded_tile(Image.open(SOURCE / right_top), (620, 460), 18)
    bottom_tile = rounded_tile(Image.open(SOURCE / right_bottom), (620, 460), 18)

    canvas.paste(left_tile, (24, 28))
    canvas.paste(top_tile, (956, 28))
    canvas.paste(bottom_tile, (956, 512))
    canvas.save(OUTPUT / name, quality=92)


create_composite("tempura-set.jpg", "menu-12.jpeg", "menu-01.jpeg", "menu-05.jpeg")
create_composite("baked-mini-set.jpg", "menu-11.jpeg", "menu-07.jpeg", "menu-09.jpeg")
print(OUTPUT)
