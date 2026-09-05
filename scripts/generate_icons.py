"""Generates the PWA app icons: a brand-gradient square with a white
target/bullseye glyph (matching the Target icon used in the app's navbar).

Run with: python3 scripts/generate_icons.py
Requires: pillow, numpy (pip install --break-system-packages pillow numpy)
"""

import numpy as np
from PIL import Image, ImageDraw

OUT_DIR = "frontend/public/icons"

BRAND_START = (37, 99, 235)  # #2563eb
BRAND_END = (147, 51, 234)  # #9333ea


def gradient_image(size: int) -> Image.Image:
    """Diagonal (top-left -> bottom-right) linear gradient, matching the
    app's `bg-brand-gradient` CSS (135deg, brand-600 -> accent-600)."""
    x = np.linspace(0, 1, size)
    y = np.linspace(0, 1, size)
    xx, yy = np.meshgrid(x, y)
    t = np.clip((xx + yy) / 2, 0, 1)  # 135deg diagonal blend factor

    arr = np.zeros((size, size, 3), dtype=np.uint8)
    for c in range(3):
        arr[:, :, c] = (BRAND_START[c] + (BRAND_END[c] - BRAND_START[c]) * t).astype(np.uint8)

    return Image.fromarray(arr, mode="RGB").convert("RGBA")


def draw_target_glyph(size: int, safe_scale: float) -> Image.Image:
    """Returns an 'L' mode mask: white where the target rings/dot should
    show, black where the background gradient should show through."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    cx = cy = size / 2
    r = size * 0.5 * safe_scale

    rings = [
        (r, r * 0.78),  # outer ring: outer radius, inner radius
        (r * 0.58, r * 0.38),  # middle ring
    ]
    for outer, inner in rings:
        d.ellipse([cx - outer, cy - outer, cx + outer, cy + outer], fill=255)
        d.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], fill=0)

    dot_r = r * 0.18
    d.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=255)

    return mask


def make_icon(size: int, maskable: bool = False) -> Image.Image:
    bg = gradient_image(size)
    glyph_mask = draw_target_glyph(size, safe_scale=0.5 if maskable else 0.62)
    white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    return Image.composite(white, bg, glyph_mask)


def make_favicon(size: int = 64) -> Image.Image:
    return make_icon(size, maskable=False)


if __name__ == "__main__":
    import os

    os.makedirs(OUT_DIR, exist_ok=True)

    make_icon(192).save(f"{OUT_DIR}/icon-192.png")
    make_icon(512).save(f"{OUT_DIR}/icon-512.png")
    make_icon(512, maskable=True).save(f"{OUT_DIR}/icon-512-maskable.png")

    # Apple touch icon: no transparency, iOS rounds the corners itself.
    apple = make_icon(180, maskable=False).convert("RGB")
    apple.save(f"{OUT_DIR}/apple-touch-icon.png")

    # Favicon (multi-res .ico for browser tabs)
    sizes = [16, 32, 48]
    imgs = [make_icon(s).convert("RGBA") for s in sizes]
    imgs[0].save(
        "frontend/public/favicon.ico",
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=imgs[1:],
    )

    print("Generated icons in", OUT_DIR, "and frontend/public/favicon.ico")
