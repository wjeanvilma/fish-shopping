#!/usr/bin/env python3
"""Phase 9 (post-1.0) — rasterize listing storyboards into phone + tablet PNGs.

Reads shared/store/listing.json screenshot shots and shared/store/screenshot-capture.json
size table, then writes RGB PNGs under shared/store/screenshots/captures/{phone,tablet}/.

Usage:
  python3 shared/tools/capture_store_screenshots.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
LISTING = ROOT / "shared/store/listing.json"
CATALOG = ROOT / "shared/store/screenshot-capture.json"

INK = (0x15, 0x34, 0x49)
SKY = (0x9F, 0xD3, 0xEA)
REWARD = (0xE8, 0xAF, 0x4A)
ACTION = (0x00, 0x8F, 0x95)
FOAM = (0xF4, 0xFF, 0xFE)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_storyboard_labels(svg_path: Path) -> tuple[str, str, str]:
    """Pull brand / title / detail lines from the storyboard SVG text nodes."""
    text = svg_path.read_text(encoding="utf-8")
    labels = re.findall(r">([^<>]+)</text>", text)
    brand = labels[0].strip() if len(labels) > 0 else "Fish Shopping"
    title = labels[1].strip() if len(labels) > 1 else svg_path.stem
    detail = labels[2].strip() if len(labels) > 2 else ""
    return brand, title, detail


def fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, size: int) -> ImageFont.ImageFont:
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", size)
    except OSError:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
        except OSError:
            font = ImageFont.load_default()
            return font
    while size > 12:
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= max_width:
            return font
        size -= 2
        try:
            font = ImageFont.truetype(font.path, size)  # type: ignore[attr-defined]
        except Exception:
            return font
    return font


def render_capture(
    *,
    width: int,
    height: int,
    brand: str,
    title: str,
    detail: str,
    shot_id: str,
    form_factor: str,
    orientation: str,
) -> Image.Image:
    img = Image.new("RGB", (width, height), SKY)
    draw = ImageDraw.Draw(img)
    margin = max(24, min(width, height) // 24)
    radius = max(18, min(width, height) // 28)
    draw.rounded_rectangle(
        [margin, margin, width - margin - 1, height - margin - 1],
        radius=radius,
        fill=INK,
    )

    # Decorative pier line
    pier_y = int(height * 0.72)
    draw.rectangle([margin * 2, pier_y, width - margin * 2, pier_y + max(8, height // 80)], fill=ACTION)

    max_text = width - margin * 4
    brand_font = fit_font(draw, brand, max_text, max(28, width // 18))
    title_font = fit_font(draw, title, max_text, max(22, width // 28))
    detail_font = fit_font(draw, detail or shot_id, max_text, max(16, width // 40))
    meta_font = fit_font(draw, f"{form_factor} · {shot_id} · {orientation}", max_text, max(14, width // 48))

    cy = height * 0.38
    for text, font, color, dy in (
        (brand, brand_font, REWARD, 0),
        (title, title_font, FOAM, int(height * 0.07)),
        (detail, detail_font, SKY, int(height * 0.12)),
        (f"{form_factor} · {shot_id} · {orientation}", meta_font, ACTION, int(height * 0.28)),
    ):
        if not text:
            continue
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) / 2, cy + dy), text, font=font, fill=color)

    return img


def main() -> int:
    listing = load_json(LISTING)
    catalog = load_json(CATALOG)
    if catalog.get("phase") != 9:
        raise SystemExit(f"Expected screenshot-capture phase 9, got {catalog.get('phase')}")

    shots = listing["screenshotShots"]
    formats = catalog["formats"]
    out_root = ROOT / catalog["outputDir"]
    written: list[str] = []

    for shot in shots:
        shot_id = shot["id"]
        orientation = shot["orientation"]
        storyboard = ROOT / shot["storyboard"]
        if not storyboard.is_file():
            raise SystemExit(f"Missing storyboard {storyboard}")
        brand, title, detail = parse_storyboard_labels(storyboard)
        # Prefer listing title when present
        title = shot.get("title") or title

        for form_factor, spec in formats.items():
            size = spec[orientation]
            w, h = int(size["width"]), int(size["height"])
            img = render_capture(
                width=w,
                height=h,
                brand=brand,
                title=title,
                detail=detail,
                shot_id=shot_id,
                form_factor=form_factor,
                orientation=orientation,
            )
            dest_dir = out_root / form_factor
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / f"{shot_id}.png"
            img.save(dest, format="PNG", optimize=True)
            written.append(str(dest.relative_to(ROOT)))

    manifest = {
        "phase": 9,
        "generatedBy": "shared/tools/capture_store_screenshots.py",
        "count": len(written),
        "files": written,
    }
    (out_root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"OK screenshots:capture — {len(written)} PNGs → {out_root.relative_to(ROOT)}")
    for path in written:
        print(f"  {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
