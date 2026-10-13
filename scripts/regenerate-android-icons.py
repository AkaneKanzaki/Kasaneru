#!/usr/bin/env python3
"""Regenerate Android launcher icons from the torii source art with proper padding.

The old foreground filled the whole canvas, so launchers with a circular mask
clipped the torii pillars ("too zoomed in"). This script extracts the flat red
torii with a smooth alpha edge and re-renders it at ~60% of the canvas, centered:

  - adaptive-icon foreground (transparent; background layer provides #FFFCF7):
    mipmap-mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi/ic_launcher_foreground.png
    at 108/162/216/324/432 px (108dp)
  - legacy icons (on #FFFCF7):
    mipmap-*/ic_launcher.png and ic_launcher_round.png
    at 48/72/96/144/192 px

Run from the repo root:

    python3 scripts/regenerate-android-icons.py
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/icons/media-generation-kasaneru-torii-0-9cfe3792-c101-42e5-b014-2b05b10e3aa2.png"
RES = ROOT / "android/app/src/main/res"

TORII_RED = (207, 46, 24)      # sampled from the source art
PAPER = (255, 252, 247)        # matches ic_launcher_background (#FFFCF7)
ART_FRACTION = 0.60            # artwork width as a fraction of the canvas

FOREGROUND_SIZES = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
LEGACY_SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def extract_torii(src: Image.Image) -> Image.Image:
    """Return the red torii as RGBA with a smooth alpha edge on transparency.

    The paper background has subtle grain (redness up to ~11), so the alpha
    ramp starts at 20 to reject it; the crop box is measured from solid-red
    pixels (redness > 80) so grain can never pull the artwork off-center.
    """
    rgb = src.convert("RGB")
    w, h = rgb.size
    src_px = rgb.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_px = out.load()
    # solid-red bbox for a grain-proof, centered crop
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = src_px[x, y]
            redness = r - max(g, b)
            a = (redness - 20) / 100.0
            if a > 0:
                out_px[x, y] = TORII_RED + (int(255 * min(1.0, a)),)
                if redness > 80:
                    if x < minx: minx = x
                    if x > maxx: maxx = x
                    if y < miny: miny = y
                    if y > maxy: maxy = y
    if maxx <= minx:
        sys.exit("no torii artwork detected")
    out.info["cropbox"] = (minx, miny, maxx + 1, maxy + 1)
    return out


def place_centered(canvas: Image.Image, icon: Image.Image) -> None:
    """Alpha-composite icon exactly centered (avoids 0.5px off-center drift
    when (canvas - icon) is odd, which reads as a tilted/asymmetric icon)."""
    size = canvas.width
    w, h = icon.size
    # shrink by 1px when needed so the remainder is even -> exact centering
    if (size - w) % 2:
        w -= 1
    if (size - h) % 2:
        h -= 1
    if (w, h) != icon.size:
        icon = icon.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(icon, ((size - w) // 2, (size - h) // 2))


def main() -> None:
    if not SRC.exists():
        sys.exit(f"source art not found: {SRC}")
    art = extract_torii(Image.open(SRC))
    bbox = art.info["cropbox"]
    # small padding inside the bbox so antialiased edges are never clipped
    pad = 6
    bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
            min(art.width, bbox[2] + pad), min(art.height, bbox[3] + pad))
    cropped = art.crop(bbox)

    for density, size in FOREGROUND_SIZES.items():
        target_w = int(size * ART_FRACTION)
        scale = target_w / cropped.width
        icon = cropped.resize((target_w, int(cropped.height * scale)), Image.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        place_centered(canvas, icon)
        out = RES / f"mipmap-{density}/ic_launcher_foreground.png"
        canvas.save(out)
        print(f"wrote {out.relative_to(ROOT)} ({size}x{size})")

    for density, size in LEGACY_SIZES.items():
        target_w = int(size * ART_FRACTION)
        scale = target_w / cropped.width
        icon = cropped.resize((target_w, int(cropped.height * scale)), Image.LANCZOS)
        canvas = Image.new("RGBA", (size, size), PAPER + (255,))
        place_centered(canvas, icon)
        canvas.convert("RGB").save(RES / f"mipmap-{density}/ic_launcher.png")
        print(f"wrote mipmap-{density}/ic_launcher.png ({size}x{size})")
        # round variant: circular crop
        mask = Image.new("L", (size, size), 0)
        mp = mask.load()
        c, rad = size / 2, size / 2
        for y in range(size):
            for x in range(size):
                if (x - c + 0.5) ** 2 + (y - c + 0.5) ** 2 <= rad ** 2:
                    mp[x, y] = 255
        rounded = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        rounded.paste(canvas, (0, 0), mask)
        rounded.convert("RGB").save(RES / f"mipmap-{density}/ic_launcher_round.png")
        print(f"wrote mipmap-{density}/ic_launcher_round.png ({size}x{size})")


if __name__ == "__main__":
    main()
