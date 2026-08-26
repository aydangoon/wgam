#!/usr/bin/env python3
"""Cut, punch, analog-crush, downsample, and WebP-encode world raw assets.

Reads public/images/world/raw/* and writes public/images/world/cut/<name>.webp.
The pointing-hand cursor.png is cut/trimmed and written as cut/cursor.png (no analog
crush; CSS cursors cap at 128px and need a sharp fingertip). Full-scene plates in
public/images/world/raw/bgs/ skip cut/punch and write to
public/images/world/cut/bgs/<name>.webp. Pass --bgs to process plates only, or
--only=<stem> to process one raw file. Re-running overwrites cut files. Raw files
are never modified.
"""

from __future__ import annotations

import hashlib
import io
import os
import subprocess
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "public/images/world/raw"
RAW_BGS = RAW / "bgs"
CUT = ROOT / "public/images/world/cut"
CUT_BGS = CUT / "bgs"
CWEBP = "cwebp"
GIF2WEBP = "gif2webp"

WHITE_FUZZ = 28
BLACK_FUZZ = 18
MAX_EDGE = 720
MAP_EDGE = 480
FIRE_EDGE = 560
BG_EDGE = 1280
CURSOR_EDGE = 48
TARGET_KB = 120

PUNCH_SCREEN = {"crt-transparent-screen", "old-tv-transparent-screen"}
PUNCH_EYES = {"white-rabbit-mask"}
PUNCH_OPENING = {"open-molded-door"}
REMBG_LIKE = {"match-box"}
MAP_ICONS = {
    "4-tent-cluster",
    "tv-stack",
    "wrecked-rusted-car",
    "wrecked-rusted-blue-car",
    "wrecked-rusted-green-car",
    "moldy-closed-door",
    "empty-bookshelf",
    "old-tv-transparent-screen",
}
FIRE = {"camp-fire", "wide-fire", "fire-1"}

# Analog-horror crush: real JPEG encode at a small size, then upscale.
# ImageMagick `-noise Gaussian` errors on IM7 (replaced by `-statistic NonPeak`).
# `-quality` is a no-op unless encoding JPEG. Stay in Python so alpha survives.
ANALOG_JPEG_Q = 33
ANALOG_NOISE_SIGMA = 7.0
ANALOG_CHROMA_PX = 1
ANALOG_PRE_BLUR = 0.28


def to_rgba(im: Image.Image) -> Image.Image:
    return im.convert("RGBA")


def corner_samples(arr: np.ndarray, n: int = 14) -> np.ndarray:
    h, w = arr.shape[:2]
    patches = [
        arr[0:n, 0:n],
        arr[0:n, w - n : w],
        arr[h - n : h, 0:n],
        arr[h - n : h, w - n : w],
    ]
    return np.concatenate([p.reshape(-1, p.shape[-1]) for p in patches], axis=0)


def classify_bg(arr: np.ndarray) -> str:
    rgb = arr[:, :, :3].astype(np.int16)
    samples = corner_samples(rgb, 16)
    mean = samples.mean(axis=0)
    # Checker: two clusters of grey/white in a repeating grid.
    if is_checker_corner(arr):
        return "checker"
    if mean.mean() < 28:
        return "black"
    return "white"


def is_checker_corner(arr: np.ndarray) -> bool:
    rgb = arr[:32, :32, :3].astype(np.int16)
    if rgb.size == 0:
        return False
    # Flatten unique-ish colors via 32-level quantize.
    q = (rgb.astype(np.int32) // 32) * 32
    flat = q[:, :, 0] * 1_000_000 + q[:, :, 1] * 1_000 + q[:, :, 2]
    vals, counts = np.unique(flat, return_counts=True)
    if len(vals) < 2:
        return False
    top2 = np.sort(counts)[-2:]
    coverage = top2.sum() / flat.size
    # Two greys covering most of the corner, and they aren't near-identical white.
    if coverage < 0.72:
        return False
    # Periodicity: check 8px and 10px grids.
    for period in (8, 10, 12, 16):
        a = rgb[0:period, 0:period].mean()
        b = rgb[0:period, period : period * 2].mean() if rgb.shape[1] >= period * 2 else a
        if abs(float(a) - float(b)) > 18:
            return True
    return False


def near(c: np.ndarray, target: np.ndarray, fuzz: int) -> np.ndarray:
    return np.abs(c.astype(np.int16) - target.astype(np.int16)).sum(axis=-1) <= fuzz * 3


def flood_from_edges(arr: np.ndarray, target: np.ndarray, fuzz: int) -> np.ndarray:
    """Return boolean mask of pixels to make transparent."""
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3]
    match = near(rgb, target, fuzz)
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def try_push(y: int, x: int) -> None:
        if 0 <= y < h and 0 <= x < w and not visited[y, x] and match[y, x]:
            visited[y, x] = True
            q.append((y, x))

    for x in range(w):
        try_push(0, x)
        try_push(h - 1, x)
    for y in range(h):
        try_push(y, 0)
        try_push(y, w - 1)

    while q:
        y, x = q.popleft()
        if y > 0:
            try_push(y - 1, x)
        if y + 1 < h:
            try_push(y + 1, x)
        if x > 0:
            try_push(y, x - 1)
        if x + 1 < w:
            try_push(y, x + 1)
    return visited


def flood_from_points(
    arr: np.ndarray,
    seeds: list[tuple[int, int]],
    predicate,
) -> np.ndarray:
    h, w = arr.shape[:2]
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def try_push(y: int, x: int) -> None:
        if 0 <= y < h and 0 <= x < w and not visited[y, x] and predicate(y, x):
            visited[y, x] = True
            q.append((y, x))

    for y, x in seeds:
        try_push(y, x)
    while q:
        y, x = q.popleft()
        if y > 0:
            try_push(y - 1, x)
        if y + 1 < h:
            try_push(y + 1, x)
        if x > 0:
            try_push(y, x - 1)
        if x + 1 < w:
            try_push(y, x + 1)
    return visited


def mask_checkerboard(arr: np.ndarray) -> np.ndarray:
    """Mask a Photoshop-style transparency checker by flooding low-chroma tiles."""
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    # Checker tiles are grey/white: low chroma, mid-to-high luminance.
    bg = (chroma <= 22) & (lum >= 160)

    def pred(y: int, x: int) -> bool:
        return bool(bg[y, x])

    seeds = []
    for x in range(0, w, 4):
        seeds.append((0, x))
        seeds.append((h - 1, x))
    for y in range(0, h, 4):
        seeds.append((y, 0))
        seeds.append((y, w - 1))
    return flood_from_points(arr, seeds, pred)


def apply_mask(arr: np.ndarray, kill: np.ndarray) -> np.ndarray:
    out = arr.copy()
    out[kill, 3] = 0
    return out


def defringe(arr: np.ndarray) -> np.ndarray:
    """Pull fringe pixels toward neighbor color and drop green halos."""
    out = arr.copy()
    a = out[:, :, 3]
    rgb = out[:, :, :3].astype(np.int16)
    h, w = a.shape
    opaque = a > 32
    transparent = a == 0
    # Green halo: high G relative to R/B on the silhouette edge.
    g = rgb[:, :, 1]
    r = rgb[:, :, 0]
    b = rgb[:, :, 2]
    greenish = (g > r + 18) & (g > b + 18)
    edge = opaque.copy()
    # erode-like: opaque touching transparent
    neigh_t = np.zeros_like(transparent)
    neigh_t[1:, :] |= transparent[:-1, :]
    neigh_t[:-1, :] |= transparent[1:, :]
    neigh_t[:, 1:] |= transparent[:, :-1]
    neigh_t[:, :-1] |= transparent[:, 1:]
    fringe = opaque & neigh_t
    out[fringe & greenish, 3] = 0
    # Soften remaining fringe
    out[fringe & ~greenish, 3] = np.minimum(out[fringe & ~greenish, 3], 160)
    return out


def _touching_transparent(alpha: np.ndarray, radius: int = 1) -> np.ndarray:
    trans = alpha == 0
    touch = trans.copy()
    for _ in range(radius):
        nxt = touch.copy()
        nxt[1:, :] |= touch[:-1, :]
        nxt[:-1, :] |= touch[1:, :]
        nxt[:, 1:] |= touch[:, :-1]
        nxt[:, :-1] |= touch[:, 1:]
        touch = nxt
    return touch


def cursor_defringe(arr: np.ndarray) -> np.ndarray:
    """Drop the pale/grey anti-aliased halo so only the hand remains."""
    out = arr.copy()
    rgb = out[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = out[:, :, 3]
    out[a < 160, 3] = 0
    a = out[:, :, 3]
    # Ghost ring is light + desaturated; fingertip flesh is pale but still warm.
    halo = ((lum >= 165) & (chroma <= 28) & (a < 245)) | (chroma <= 10)
    kill = _touching_transparent(a, 2) & (a > 0) & halo
    out[kill, 3] = 0
    a = out[:, :, 3]
    out[:, :, 3] = np.array(Image.fromarray(a, "L").filter(ImageFilter.MinFilter(3)))
    return out


def harden_cursor_alpha(im: Image.Image) -> Image.Image:
    """After downscale, drop Lanczos-mixed grey fringe pixels."""
    arr = np.array(im.convert("RGBA"))
    a = arr[:, :, 3]
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    arr[a < 200, 3] = 0
    a = arr[:, :, 3]
    halo = ((lum >= 165) & (chroma <= 28) & (a < 245)) | (chroma <= 10)
    kill = _touching_transparent(a, 1) & (a > 0) & halo
    arr[kill, 3] = 0
    return Image.fromarray(trim(arr), "RGBA")


def cursor_hotspot(im: Image.Image) -> tuple[int, int]:
    """Index-fingertip: topmost opaque row, centered on that row's span."""
    a = np.array(im.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(a > 40)
    if len(xs) == 0:
        return 0, 0
    top = int(ys.min())
    xs_top = xs[ys == top]
    return int(xs_top.min() + (xs_top.max() - xs_top.min()) // 2), top


def trim(arr: np.ndarray) -> np.ndarray:
    a = arr[:, :, 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return arr
    pad = 2
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + pad + 1)
    return arr[y0:y1, x0:x1]


def resize_max(im: Image.Image, edge: int) -> Image.Image:
    w, h = im.size
    m = max(w, h)
    if m <= edge:
        return im
    scale = edge / m
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def _rng(key: str) -> np.random.Generator:
    digest = hashlib.sha256(f"wgam-analog-v1:{key}".encode()).digest()
    seed = int.from_bytes(digest[:8], "little")
    return np.random.default_rng(seed)


def _analog_small_edge(max_edge: int) -> int:
    """Long-edge target for the JPEG crush. Never upscale tiny sprites first.

    Full-scene backgrounds (~1280) crush to 640 so the 2× down/up ratio matches
    the 720→360 sprite pass instead of smearing a cityscape from 360px.
    """
    if max_edge >= 960:
        return 640
    if max_edge >= 640:
        return 360
    if max_edge >= 500:
        return 300
    if max_edge >= 360:
        return 240
    if max_edge >= 220:
        return max(140, int(max_edge * 0.58))
    if max_edge >= 120:
        return max(88, int(max_edge * 0.70))
    return max(40, int(max_edge * 0.82))


def _fill_under_alpha(rgb: np.ndarray, alpha: np.ndarray, radius: int = 10) -> np.ndarray:
    """Bleed opaque RGB into transparent pixels so JPEG ringing doesn't halo."""
    a = (alpha.astype(np.float32) / 255.0)[:, :, None]
    premul = Image.fromarray(np.clip(rgb.astype(np.float32) * a, 0, 255).astype(np.uint8), "RGB")
    weight = Image.fromarray(alpha, "L")
    steps = max(3, radius // 2)
    for _ in range(steps):
        premul = premul.filter(ImageFilter.BoxBlur(2))
        weight = weight.filter(ImageFilter.BoxBlur(2))
    pa = np.array(premul).astype(np.float32)
    wa = np.maximum(np.array(weight).astype(np.float32) / 255.0, 1e-4)
    filled = np.clip(pa / wa[:, :, None], 0, 255).astype(np.uint8)
    opaque = alpha > 8
    filled[opaque] = rgb[opaque]
    return filled


def _jpeg_roundtrip(im: Image.Image, quality: int) -> Image.Image:
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=quality, subsampling=2)
    buf.seek(0)
    return Image.open(buf).convert("RGB")


def _hblur(ch: np.ndarray, taps: np.ndarray) -> np.ndarray:
    pad = len(taps) // 2
    p = np.pad(ch.astype(np.float32), ((0, 0), (pad, pad)), mode="edge")
    out = np.zeros(ch.shape, dtype=np.float32)
    for i, w in enumerate(taps):
        out += p[:, i : i + ch.shape[1]] * w
    return out


def _smear_chroma(rgb: np.ndarray) -> np.ndarray:
    """Horizontal chroma smear (VHS-ish); luma stays sharper."""
    arr = rgb.astype(np.float32)
    y = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    cb = arr[:, :, 2] - y
    cr = arr[:, :, 0] - y
    taps = np.array([1, 2, 3, 2, 1], dtype=np.float32)
    taps /= taps.sum()
    cb = _hblur(cb, taps)
    cr = _hblur(cr, taps)
    r = np.clip(y + cr, 0, 255)
    b = np.clip(y + cb, 0, 255)
    g = np.clip(y - 0.509 * cr - 0.194 * cb, 0, 255)
    return np.stack([r, g, b], axis=-1).astype(np.uint8)


def _chroma_offset(rgb: np.ndarray, dx: int) -> np.ndarray:
    """Shift R/B without wrapping (wrapping paints opposite-edge color)."""
    if dx <= 0:
        return rgb
    r = rgb[:, :, 0]
    g = rgb[:, :, 1]
    b = rgb[:, :, 2]
    r2 = np.empty_like(r)
    b2 = np.empty_like(b)
    r2[:, dx:] = r[:, :-dx]
    r2[:, :dx] = r[:, :dx]
    b2[:, :-dx] = b[:, dx:]
    b2[:, -dx:] = b[:, -dx:]
    return np.stack([r2, g, b2], axis=-1)


def _luma_noise(rgb: np.ndarray, sigma: float, rng: np.random.Generator) -> np.ndarray:
    h, w = rgb.shape[:2]
    nh, nw = max(1, h // 2), max(1, w // 2)
    coarse = rng.normal(0, sigma, size=(nh, nw)).astype(np.float32)
    coarse_im = Image.fromarray(np.clip(coarse + 128, 0, 255).astype(np.uint8), "L")
    coarse = np.array(coarse_im.resize((w, h), Image.Resampling.BILINEAR), dtype=np.float32) - 128
    fine = rng.normal(0, sigma * 0.4, size=(h, w)).astype(np.float32)
    out = rgb.astype(np.float32) + coarse[:, :, None] + fine[:, :, None]
    return np.clip(out, 0, 255).astype(np.uint8)


def analog_degrade(im: Image.Image, key: str) -> Image.Image:
    """Downscale → JPEG crush → noise/chroma smear → upscale; restore alpha.

    Works on a flattened RGB copy so transparency is not JPEG-encoded. Original
    alpha is written back so collage edges stay clean on a white page.
    """
    rgba = np.array(im.convert("RGBA"))
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3]
    w, h = im.size
    m = max(w, h)
    filled = _fill_under_alpha(rgb, alpha)
    work = Image.fromarray(filled, "RGB")
    if ANALOG_PRE_BLUR > 0:
        work = work.filter(ImageFilter.GaussianBlur(ANALOG_PRE_BLUR))
    target = _analog_small_edge(m)
    if m > target:
        scale = target / m
        small = work.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.BILINEAR)
    else:
        small = work
    small = _jpeg_roundtrip(small, ANALOG_JPEG_Q)
    arr = np.array(small)
    arr = _smear_chroma(arr)
    arr = _chroma_offset(arr, ANALOG_CHROMA_PX)
    arr = _luma_noise(arr, ANALOG_NOISE_SIGMA, _rng(key))
    up = Image.fromarray(arr, "RGB").resize((w, h), Image.Resampling.BILINEAR)
    out = np.array(up)
    return Image.fromarray(np.dstack([out, alpha]), "RGBA")


def punch_interior_bright(arr: np.ndarray, seeds: list[tuple[int, int]], thresh: int = 238) -> np.ndarray:
    rgb = arr[:, :, :3].astype(np.int16)
    a = arr[:, :, 3]
    lum = rgb.mean(axis=-1)

    def pred(y: int, x: int) -> bool:
        return a[y, x] > 0 and lum[y, x] >= thresh

    kill = flood_from_points(arr, seeds, pred)
    return apply_mask(arr, kill)


def punch_screen(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    # Seed a small grid around the visual center (the CRT face).
    seeds = []
    for dy in (-h // 10, 0, h // 10):
        for dx in (-w // 10, 0, w // 10):
            seeds.append((h // 2 + dy, w // 2 + dx))
    rgb = arr[:, :, :3].astype(np.int16)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    lum = rgb.mean(axis=-1)
    a = arr[:, :, 3]

    def pred(y: int, x: int) -> bool:
        if a[y, x] == 0:
            return False
        # White screen OR checker-grey screen.
        return (lum[y, x] >= 232 and chroma[y, x] <= 18) or (
            chroma[y, x] <= 20 and 140 <= lum[y, x] <= 250
        )

    kill = flood_from_points(arr, seeds, pred)
    return apply_mask(arr, kill)


def punch_eyes(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    # Eyes sit in the upper-middle third of a rabbit mask.
    seeds = [
        (int(h * 0.42), int(w * 0.32)),
        (int(h * 0.42), int(w * 0.68)),
        (int(h * 0.38), int(w * 0.36)),
        (int(h * 0.38), int(w * 0.64)),
    ]
    return punch_interior_bright(arr, seeds, thresh=246)


def punch_opening(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    seeds = [
        (int(h * 0.35), int(w * 0.52)),
        (int(h * 0.45), int(w * 0.55)),
        (int(h * 0.22), int(w * 0.50)),
    ]
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = arr[:, :, 3]
    # Opening is white OR leftover blue sky.
    def pred(y: int, x: int) -> bool:
        if a[y, x] == 0:
            return False
        if lum[y, x] >= 236:
            return True
        b = rgb[y, x, 2]
        r = rgb[y, x, 0]
        return b > r + 18 and lum[y, x] > 140

    kill = flood_from_points(arr, seeds, pred)
    return apply_mask(arr, kill)


def cut_matchbox(arr: np.ndarray) -> np.ndarray:
    """White-on-white: keep colored matches and dilate to recover the sleeve."""
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    interesting = (chroma > 14) | (lum < 232)
    im = Image.fromarray((interesting.astype(np.uint8) * 255), mode="L")
    im = im.filter(ImageFilter.MaxFilter(9))
    im = im.filter(ImageFilter.MaxFilter(9))
    im = im.filter(ImageFilter.MaxFilter(5))
    mask = np.array(im) > 0
    out = arr.copy()
    out[~mask, 3] = 0
    return out


def process_still(path: Path) -> Image.Image:
    name = path.stem
    im = to_rgba(Image.open(path))
    arr = np.array(im)
    kind = classify_bg(arr)
    if name in REMBG_LIKE:
        arr = cut_matchbox(arr)
    elif kind == "checker":
        arr = apply_mask(arr, mask_checkerboard(arr))
        # leftover white around the subject
        arr = apply_mask(arr, flood_from_edges(arr, np.array([255, 255, 255]), WHITE_FUZZ))
    elif kind == "black":
        arr = apply_mask(arr, flood_from_edges(arr, np.array([0, 0, 0]), BLACK_FUZZ))
    else:
        arr = apply_mask(arr, flood_from_edges(arr, np.array([255, 255, 255]), WHITE_FUZZ))

    if name in PUNCH_SCREEN:
        arr = punch_screen(arr)
    if name in PUNCH_EYES:
        arr = punch_eyes(arr)
    if name in PUNCH_OPENING:
        arr = punch_opening(arr)

    if name == "cursor":
        arr = cursor_defringe(arr)
    else:
        arr = defringe(arr)
    arr = trim(arr)
    out = Image.fromarray(arr, "RGBA")
    edge = MAP_EDGE if name in MAP_ICONS else MAX_EDGE
    if name in FIRE:
        edge = FIRE_EDGE
    if name == "match":
        edge = 128
    if name == "cursor":
        # CSS cursors cap at 128px; skip analog crush so the fingertip stays sharp.
        edge = CURSOR_EDGE
    out = resize_max(out, edge)
    if name == "cursor":
        out = harden_cursor_alpha(out)
    else:
        out = analog_degrade(out, name)
    cursor = resize_max(out, 44) if name == "match" else None
    return out, cursor


def process_bg(path: Path) -> Image.Image:
    """Full-bleed scene plates: no cut/punch/trim, analog crush only."""
    im = to_rgba(Image.open(path))
    im = resize_max(im, BG_EDGE)
    return analog_degrade(im, f"bg:{path.stem}")


def process_gif(path: Path):
    im = Image.open(path)
    w, h = im.size
    n = getattr(im, "n_frames", 1)
    frames: list[Image.Image] = []
    durations: list[int] = []
    last = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for i in range(n):
        im.seek(i)
        durations.append(int(im.info.get("duration", 80) or 80))
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        layer.paste(im.convert("RGBA"), (0, 0))
        composed = Image.alpha_composite(last, layer)
        arr = np.array(composed)
        arr = apply_mask(arr, flood_from_edges(arr, np.array([0, 0, 0]), BLACK_FUZZ))
        frames.append(Image.fromarray(arr, "RGBA"))
        disposal = getattr(im, "disposal_method", 1)
        last = Image.new("RGBA", (w, h), (0, 0, 0, 0)) if disposal == 2 else composed
    if len(frames) > 24:
        frames = frames[::2]
        durations = durations[::2]
    resized = [resize_max(fr, FIRE_EDGE) for fr in frames]
    # Trim using the union of opaque pixels so frames stay aligned.
    boxes = []
    for fr in resized:
        a = np.array(fr)[:, :, 3]
        ys, xs = np.where(a > 8)
        if len(xs):
            boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
    if boxes:
        x0 = min(b[0] for b in boxes)
        y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes) + 1
        y1 = max(b[3] for b in boxes) + 1
        resized = [fr.crop((x0, y0, x1, y1)) for fr in resized]
    resized = [analog_degrade(fr, f"{path.stem}:{i}") for i, fr in enumerate(resized)]
    return resized, durations


def encode_webp(im: Image.Image, dest: Path, quality: int = 80) -> None:
    tmp = dest.with_suffix(".png")
    im.save(tmp, "PNG")
    cmd = [CWEBP, "-q", str(quality), "-alpha_q", "85", "-m", "6", "-mt", str(tmp), "-o", str(dest)]
    subprocess.run(cmd, check=True, capture_output=True)
    tmp.unlink(missing_ok=True)


def encode_anim_webp(frames: list[Image.Image], durations: list[int], dest: Path) -> None:
    durs = durations or [80] * len(frames)
    frames[0].save(
        dest,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durs,
        loop=0,
        lossless=False,
        quality=72,
        method=4,
    )


def _image_files(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(
        p for p in folder.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif"}
    )


def main() -> int:
    only_bgs = "--bgs" in sys.argv
    only = {arg.split("=", 1)[1] for arg in sys.argv if arg.startswith("--only=")}
    CUT.mkdir(parents=True, exist_ok=True)
    CUT_BGS.mkdir(parents=True, exist_ok=True)

    if not only_bgs:
        files = _image_files(RAW)
        if not files:
            print(f"no files in {RAW}", file=sys.stderr)
            return 1
        for path in files:
            if only and path.stem not in only:
                continue
            dest = CUT / f"{path.stem}.webp"
            try:
                if path.suffix.lower() == ".gif":
                    frames, durs = process_gif(path)
                    encode_anim_webp(frames, durs, dest)
                else:
                    im, cursor = process_still(path)
                    if path.stem == "cursor":
                        dest = CUT / "cursor.png"
                        im.save(dest, "PNG", optimize=True)
                        hx, hy = cursor_hotspot(im)
                        print(f"     cursor hotspot {hx},{hy} size {im.size[0]}x{im.size[1]}")
                    else:
                        encode_webp(im, dest, quality=78 if path.stem not in FIRE else 70)
                    if cursor is not None:
                        encode_webp(cursor, CUT / "match-cursor.webp", quality=80)
                kb = dest.stat().st_size / 1024
                print(f"ok  {path.name:40s}  {kb:7.1f} KB -> {dest.name}")
            except subprocess.CalledProcessError as e:
                print(f"fail encode {path.name}: {e.stderr.decode()[:400]}", file=sys.stderr)
            except Exception as e:
                print(f"fail {path.name}: {e}", file=sys.stderr)

    if only:
        return 0

    bgs = _image_files(RAW_BGS)
    if not bgs:
        print(f"no files in {RAW_BGS}", file=sys.stderr)
        return 1 if only_bgs else 0
    for path in bgs:
        dest = CUT_BGS / f"{path.stem}.webp"
        try:
            im = process_bg(path)
            encode_webp(im, dest, quality=76)
            kb = dest.stat().st_size / 1024
            print(f"ok  bgs/{path.name:36s}  {kb:7.1f} KB -> bgs/{dest.name}")
        except subprocess.CalledProcessError as e:
            print(f"fail encode bgs/{path.name}: {e.stderr.decode()[:400]}", file=sys.stderr)
        except Exception as e:
            print(f"fail bgs/{path.name}: {e}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
