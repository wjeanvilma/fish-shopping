#!/usr/bin/env python3
"""Phase 10 (post-1.0) — final icon pack + Play feature graphic generator.

Rasterizes the Fish Shopping brand mark into:
  - Android legacy mipmaps (mdpi→xxxhdpi) + keeps adaptive XML vectors
  - Web favicon sync, apple-touch, PWA 192/512 + maskable 512
  - Play hi-res 512 icon + 1024×500 feature graphic PNG

Usage:
  python3 shared/tools/generate_store_chrome.py
  npm run icons:generate
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
INK = (0x15, 0x34, 0x49, 255)
SKY = (0x9F, 0xD3, 0xEA, 255)
REWARD = (0xE8, 0xAF, 0x4A, 255)
ACTION = (0x00, 0x8F, 0x95, 255)
CATALOG = ROOT / "shared/store/icon-pack.json"


def draw_mark(size: int, *, rounded: bool = True, pad_ratio: float = 0.0) -> Image.Image:
    """Draw the Fish Shopping mark into a square RGBA image."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = int(size * pad_ratio)
    box = [pad, pad, size - pad - 1, size - pad - 1]
    if rounded:
        radius = max(2, int((size - 2 * pad) * 0.22))
        draw.rounded_rectangle(box, radius=radius, fill=INK)
    else:
        draw.rectangle(box, fill=INK)

    def p(x: float, y: float) -> tuple[float, float]:
        span = size - 2 * pad
        return pad + x / 64.0 * span, pad + y / 64.0 * span

    body = [
        p(10, 34),
        p(18, 24),
        p(32, 20),
        p(44, 22),
        p(52, 28),
        p(54, 34),
        p(52, 40),
        p(44, 46),
        p(32, 48),
        p(18, 44),
    ]
    draw.polygon(body, fill=SKY)
    draw.polygon([p(8, 34), p(2.5, 29.8), p(2.5, 38.2)], fill=REWARD)
    ex, ey = p(42, 30)
    er = max(1.5, size * 0.04)
    draw.ellipse([ex - er, ey - er, ex + er, ey + er], fill=INK)
    shade = [
        p(18, 38),
        p(28, 42),
        p(40, 42),
        p(48, 38),
        p(42, 44),
        p(28, 46),
        p(20, 42),
    ]
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(overlay).polygon(shade, fill=ACTION[:3] + (90,))
    return Image.alpha_composite(img, overlay)


def write_android_mipmaps() -> None:
    res = ROOT / "app/src/main/res"
    sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in sizes.items():
        out_dir = res / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        square = draw_mark(size, rounded=True)
        round_img = draw_mark(size, rounded=True)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
        round_out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        round_out.paste(round_img, mask=mask)
        for old in ("ic_launcher.webp", "ic_launcher_round.webp", "ic_launcher.png", "ic_launcher_round.png"):
            p = out_dir / old
            if p.exists():
                p.unlink()
        square.save(out_dir / "ic_launcher.png", "PNG")
        round_out.save(out_dir / "ic_launcher_round.png", "PNG")
        print(f"wrote {folder}/ic_launcher.png ({size})")


def write_feature_graphic() -> None:
    fg = Image.new("RGBA", (1024, 500), (0x9F, 0xD3, 0xEA, 255))
    d = ImageDraw.Draw(fg)
    for y in range(500):
        t = y / 499.0
        r = int(0x9F * (1 - t) + 0x2F * t)
        g = int(0xD3 * (1 - t) + 0x6F * t)
        b = int(0xEA * (1 - t) + 0x8A * t)
        d.line([(0, y), (1023, y)], fill=(r, g, b, 255))
    d.polygon(
        [
            (0, 320), (120, 300), (240, 320), (360, 300), (480, 320),
            (600, 300), (720, 320), (840, 300), (960, 320), (1024, 312),
            (1024, 500), (0, 500),
        ],
        fill=(26, 74, 92, 140),
    )
    d.rectangle([120, 250, 900, 286], fill=(0xC4, 0xA5, 0x74, 255))
    for x in (160, 320, 500, 680, 840):
        d.rectangle([x, 286, x + 18, 381], fill=(0x6B, 0x52, 0x30, 255))
    d.polygon([(620, 210), (840, 210), (858, 250), (602, 250)], fill=ACTION)
    mark = draw_mark(112, rounded=True)
    fg.alpha_composite(mark, (72, 70))
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    for path in (
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/Library/Fonts/Georgia.ttf",
    ):
        if Path(path).exists():
            try:
                font_title = ImageFont.truetype(path, 68)
                font_sub = ImageFont.truetype(path, 26)
                break
            except OSError:
                pass
    d.text((220, 78), "Fish Shopping", fill=INK, font=font_title)
    d.text(
        (224, 160),
        "Catch, cut, and sell fish in a cozy 3D harbor market",
        fill=INK[:3] + (200,),
        font=font_sub,
    )
    out = ROOT / "shared/store/feature-graphic.png"
    fg.convert("RGB").save(out, "PNG", optimize=True)
    print(f"wrote {out.relative_to(ROOT)} (1024x500)")


def write_web_and_play_icons() -> None:
    public = ROOT / "web/public"
    store = ROOT / "shared/store"
    public.mkdir(parents=True, exist_ok=True)

    # Keep favicon.svg byte-identical to brand-mark.svg (source of truth).
    brand = store / "brand-mark.svg"
    favicon = public / "favicon.svg"
    shutil.copyfile(brand, favicon)
    print(f"synced {favicon.relative_to(ROOT)} ← brand-mark.svg")

    touch = draw_mark(180, rounded=True)
    touch.save(public / "apple-touch-icon.png", "PNG")
    print("wrote web/public/apple-touch-icon.png (180)")

    icon192 = draw_mark(192, rounded=True)
    icon192.save(public / "icon-192.png", "PNG")
    print("wrote web/public/icon-192.png (192)")

    mark512 = draw_mark(512, rounded=True)
    mark512.save(public / "icon-512.png", "PNG")
    print("wrote web/public/icon-512.png (512)")

    # Maskable: full-bleed ink plate + inset mark (≈10% pad ≈ 80% safe zone).
    maskable = Image.new("RGBA", (512, 512), INK)
    inset = draw_mark(512, rounded=False, pad_ratio=0.12)
    maskable = Image.alpha_composite(maskable, inset)
    maskable.save(public / "icon-512-maskable.png", "PNG")
    print("wrote web/public/icon-512-maskable.png (512 maskable)")

    play = draw_mark(512, rounded=True).convert("RGB")
    play_path = store / "play-icon-512.png"
    play.save(play_path, "PNG", optimize=True)
    print(f"wrote {play_path.relative_to(ROOT)} (512 Play hi-res)")


def write_manifest_icons_note() -> None:
    """Ensure catalog phase stamp is present (manifest edited separately)."""
    if CATALOG.is_file():
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
        if data.get("phase") != 10:
            raise SystemExit(f"icon-pack.json phase expected 10, got {data.get('phase')}")


def main() -> int:
    write_manifest_icons_note()
    write_android_mipmaps()
    write_web_and_play_icons()
    write_feature_graphic()
    print("OK icons:generate — Phase 10 icon pack + feature graphic")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
