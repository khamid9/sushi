from pathlib import Path

import fitz


PDF_PATH = Path(r"C:\Users\TechnoHub_1\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\BDD88F54CCC8DA5089B84CCE9DD87A57EA37A4C1\transfers\2026-48\Menu.pdf")
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "menu-source" / "embedded"


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    document = fitz.open(PDF_PATH)

    text = "\n\n".join(page.get_text() for page in document)
    (OUTPUT_DIR.parent / "menu.txt").write_text(text, encoding="utf-8")

    seen = set()
    image_count = 0
    for page in document:
        for image_info in page.get_images(full=True):
            xref = image_info[0]
            if xref in seen:
                continue
            seen.add(xref)

            image = document.extract_image(xref)
            extension = image["ext"]
            output_path = OUTPUT_DIR / f"menu-{image_count + 1:02d}.{extension}"
            output_path.write_bytes(image["image"])
            image_count += 1

    print(f"pages={document.page_count} images={image_count}")


if __name__ == "__main__":
    main()
