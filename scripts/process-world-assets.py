#!/usr/bin/env python3
"""Cut, punch, analog-crush, downsample, and WebP-encode world raw assets.

Reads public/images/world/raw/* and writes public/images/world/cut/<name>.webp.
The pointing-hand cursor.png is cut/trimmed and written as cut/cursor.png (no analog
crush; CSS cursors cap at 128px and need a sharp fingertip). tv-static.gif is kept as a
noise plate and composited into the punched screen of old-tv-transparent-screen.webp.
Full-scene plates in public/images/world/raw/bgs/ skip cut/punch and write to
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
STATIC_EDGE = 320
TARGET_KB = 120

PUNCH_SCREEN = {"crt-transparent-screen", "old-tv-transparent-screen"}
PUNCH_EYES = {"white-rabbit-mask"}
PUNCH_OPENING = {"open-molded-door"}
PUNCH_WINDOWS = {"wrecked-rusted-blue-car", "wrecked-rusted-car"}
PUNCH_ROPES = {"green-tent", "yellow-tent", "red-tent"}
# Off-white sleeve on white paper: edge-flood only. Interior punch eats the box.
MATCHBOX = {"match-box"}
MATCHBOX_FUZZ = 12
MATCHBOX_HALO_CHROMA = 16
# Dithered etchings: edge flood misses large paper pockets, but tiny white specks are the texture.
PUNCH_LARGE_PAPER = {"graves-with-tree"}
PAPER_LUM = 200
PAPER_CHROMA = 28
PAPER_MIN_PX = 80
# Black figures: enclosed paper in elbow/hand gaps. Tiny blobs are eyes/ticks.
PUNCH_SILHOUETTE_GAPS = {
    "guitarist-silhouette",
    "guitar-silhouette-2",
    "singer-silhouette",
}
SILHOUETTE_GAP_MIN_PX = 15
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
STATIC = {"tv-static"}

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


def resize_cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    tw, th = size
    w, h = im.size
    scale = max(tw / max(w, 1), th / max(h, 1))
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    resized = im.resize((nw, nh), Image.Resampling.BILINEAR)
    x = max(0, (nw - tw) // 2)
    y = max(0, (nh - th) // 2)
    return resized.crop((x, y, x + tw, y + th))


def interior_holes(arr: np.ndarray) -> np.ndarray:
    """Transparent pixels not connected to the image edge (punched screens)."""
    a = arr[:, :, 3]
    trans = a <= 8
    h, w = a.shape
    seeds: list[tuple[int, int]] = []
    for x in range(0, w, 2):
        seeds.append((0, x))
        seeds.append((h - 1, x))
    for y in range(0, h, 2):
        seeds.append((y, 0))
        seeds.append((y, w - 1))
    exterior = flood_from_points(arr, seeds, lambda y, x: bool(trans[y, x]))
    return trans & ~exterior


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
    """Punch flat white in the rabbit-mask sockets. Dark rims stop the face flood."""
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = arr[:, :, 3]
    # Sockets sit in the lower face, below the ear bases.
    seeds: list[tuple[int, int]] = []
    for fy, fx in ((0.75, 0.33), (0.77, 0.65)):
        cy, cx = int(h * fy), int(w * fx)
        for dy in (-20, -10, 0, 10, 20):
            for dx in (-20, -10, 0, 10, 20):
                seeds.append((cy + dy, cx + dx))

    def pred(y: int, x: int) -> bool:
        return bool(a[y, x] > 0 and lum[y, x] >= 246)

    kill = flood_from_points(arr, seeds, pred)
    k = Image.fromarray((kill.astype(np.uint8) * 255), "L").filter(ImageFilter.MaxFilter(5))
    kill = (np.array(k) > 0) & (a > 0) & (lum >= 238) & (chroma <= 24)
    return apply_mask(arr, kill)


def harden_eyes(im: Image.Image) -> Image.Image:
    """Walk leftover paper out from the sockets; stop at the dark rims."""
    arr = np.array(im.convert("RGBA"))
    if not interior_holes(arr).any():
        return im
    for _ in range(4):
        holes = interior_holes(arr)
        grow = np.array(Image.fromarray((holes.astype(np.uint8) * 255), "L").filter(ImageFilter.MaxFilter(3))) > 0
        rgb = arr[:, :, :3].astype(np.int16)
        lum = rgb.mean(axis=-1)
        chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
        a = arr[:, :, 3]
        kill = grow & (a > 0) & (lum >= 165) & (chroma <= 36)
        if not kill.any():
            break
        arr[kill, 3] = 0
    return Image.fromarray(arr, "RGBA")


def punch_windows(arr: np.ndarray) -> np.ndarray:
    """Punch leftover white in enclosed glass (and empty sockets that match)."""
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = arr[:, :, 3]
    seed_m = (a > 0) & (lum >= 240) & (chroma <= 18)
    ys, xs = np.where(seed_m)
    seeds = list(zip(ys.tolist(), xs.tolist()))
    if not seeds:
        return arr
    if len(seeds) > 2500:
        seeds = seeds[:: max(1, len(seeds) // 2500)]

    def pred(y: int, x: int) -> bool:
        return bool(a[y, x] > 0 and lum[y, x] >= 205 and chroma[y, x] <= 32)

    kill = flood_from_points(arr, seeds, pred)
    k = Image.fromarray((kill.astype(np.uint8) * 255), "L")
    k = k.filter(ImageFilter.MaxFilter(5))
    kill = (np.array(k) > 0) & (a > 0) & (chroma <= 40)
    return apply_mask(arr, kill)


def punch_ropes(arr: np.ndarray) -> np.ndarray:
    """Punch leftover paper white trapped between guy-lines and canvas."""
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = arr[:, :, 3]
    kill = (a > 0) & (lum >= 175) & (chroma <= 22)
    k = Image.fromarray((kill.astype(np.uint8) * 255), "L").filter(ImageFilter.MaxFilter(3))
    kill = (np.array(k) > 0) & (a > 0) & (lum >= 160) & (chroma <= 26)
    return apply_mask(arr, kill)


def harden_ropes(im: Image.Image) -> Image.Image:
    """Drop remaining paper-white after analog crush; keep colored canvas."""
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = arr[:, :, 3]
    arr[(a > 0) & (lum >= 215) & (chroma <= 22), 3] = 0
    return Image.fromarray(arr, "RGBA")


def harden_windows(im: Image.Image) -> Image.Image:
    """Drop JPEG-brightened rims and watermark specks around punched glass."""
    arr = np.array(im.convert("RGBA"))
    holes = interior_holes(arr)
    if not holes.any():
        return im
    touch = np.array(Image.fromarray((holes.astype(np.uint8) * 255), "L").filter(ImageFilter.MaxFilter(5))) > 0
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = arr[:, :, 3]
    kill = touch & (a > 0) & (lum >= 155) & (chroma <= 45)
    arr[kill, 3] = 0
    return Image.fromarray(arr, "RGBA")


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


def fill_small_holes(arr: np.ndarray, max_px: int, rgb: tuple[int, int, int] = (22, 22, 22)) -> np.ndarray:
    """Fill tiny enclosed transparent specks; leave large interior pockets (sky in branches)."""
    holes = interior_holes(arr)
    if not holes.any():
        return arr
    h, w = holes.shape
    seen = np.zeros_like(holes)
    out = arr.copy()
    for y in range(h):
        for x in np.where(holes[y] & ~seen[y])[0]:
            if seen[y, x]:
                continue
            q: deque[tuple[int, int]] = deque([(y, x)])
            seen[y, x] = True
            cells = [(y, x)]
            while q:
                cy, cx = q.popleft()
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and holes[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
                        cells.append((ny, nx))
            if len(cells) <= max_px:
                for cy, cx in cells:
                    out[cy, cx, 0] = rgb[0]
                    out[cy, cx, 1] = rgb[1]
                    out[cy, cx, 2] = rgb[2]
                    out[cy, cx, 3] = 255
    return out


def punch_paper_blobs(arr: np.ndarray, min_px: int) -> np.ndarray:
    """Punch enclosed paper components at least min_px. Tiny specks stay."""
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = arr[:, :, 3]
    paper = (a > 0) & (lum >= PAPER_LUM) & (chroma <= PAPER_CHROMA)
    h, w = paper.shape
    seen = np.zeros_like(paper)
    kill = np.zeros_like(paper)
    for y in range(h):
        for x in np.where(paper[y] & ~seen[y])[0]:
            if seen[y, x]:
                continue
            q: deque[tuple[int, int]] = deque([(y, x)])
            seen[y, x] = True
            cells = [(y, x)]
            while q:
                cy, cx = q.popleft()
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and paper[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
                        cells.append((ny, nx))
            if len(cells) >= min_px:
                for cy, cx in cells:
                    kill[cy, cx] = True
    return apply_mask(arr, kill)


def punch_large_paper(arr: np.ndarray) -> np.ndarray:
    """Punch leftover enclosed paper blobs; keep fine dither specks on the subject."""
    return punch_paper_blobs(arr, PAPER_MIN_PX)


def punch_silhouette_gaps(arr: np.ndarray) -> np.ndarray:
    """Punch leftover paper trapped between limbs; keep isolated eye ticks."""
    out = punch_paper_blobs(arr, SILHOUETTE_GAP_MIN_PX)
    rgb = out[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = out[:, :, 3]
    paper = (a > 0) & (lum >= 190) & (chroma <= 28)
    touch = _touching_transparent(a, 1)
    ys, xs = np.where(paper & touch)
    if len(ys) == 0:
        return out
    seeds = list(zip(ys.tolist(), xs.tolist()))

    def pred(y: int, x: int) -> bool:
        return bool(paper[y, x])

    return apply_mask(out, flood_from_points(out, seeds, pred))


def harden_silhouette_gaps(im: Image.Image) -> Image.Image:
    """Drop analog-brightened paper still sitting in punched limb gaps."""
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=-1)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = arr[:, :, 3]
    paper = (a > 0) & (lum >= 120) & (chroma <= 40)
    # Grow from existing transparency (exterior + punched gaps), not isolated eye ticks.
    touch = _touching_transparent(a, 1)
    ys, xs = np.where(paper & touch)
    if len(ys):
        seeds = list(zip(ys.tolist(), xs.tolist()))
        kill = flood_from_points(arr, seeds, lambda y, x: bool(paper[y, x]))
        arr = apply_mask(arr, kill)
    return Image.fromarray(arr, "RGBA")


def _peel_matchbox_halo(arr: np.ndarray) -> np.ndarray:
    """Drop 1px of leftover paper on the silhouette; leave the sleeve body."""
    rgb = arr[:, :, :3].astype(np.int16)
    chroma = rgb.max(axis=-1) - rgb.min(axis=-1)
    a = arr[:, :, 3]
    halo = _touching_transparent(a, 1) & (a > 0) & (chroma <= MATCHBOX_HALO_CHROMA)
    return apply_mask(arr, halo)


def cut_matchbox(arr: np.ndarray) -> np.ndarray:
    """White sleeve on white paper: drop edge-connected paper, leave the box."""
    out = apply_mask(arr, flood_from_edges(arr, np.array([255, 255, 255]), MATCHBOX_FUZZ))
    return _peel_matchbox_halo(out)


def harden_matchbox(im: Image.Image) -> Image.Image:
    """Re-peel analog-brightened paper on the rim only."""
    arr = _peel_matchbox_halo(np.array(im.convert("RGBA")))
    return Image.fromarray(trim(arr), "RGBA")


def process_still(path: Path) -> Image.Image:
    name = path.stem
    im = to_rgba(Image.open(path))
    arr = np.array(im)
    kind = classify_bg(arr)
    if name in MATCHBOX:
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
    if name in PUNCH_WINDOWS:
        arr = punch_windows(arr)
    if name in PUNCH_ROPES:
        arr = punch_ropes(arr)
    if name in PUNCH_LARGE_PAPER:
        arr = punch_large_paper(arr)
    if name in PUNCH_SILHOUETTE_GAPS:
        arr = punch_silhouette_gaps(arr)

    if name == "cursor":
        arr = cursor_defringe(arr)
    elif name not in MATCHBOX:
        # Soft fringe on an off-white box reads as a white halo; skip it.
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
        if name in PUNCH_WINDOWS:
            out = harden_windows(out)
        if name in PUNCH_EYES:
            out = harden_eyes(out)
        if name in PUNCH_SILHOUETTE_GAPS:
            out = harden_silhouette_gaps(out)
        if name in PUNCH_ROPES:
            out = harden_ropes(out)
        if name in MATCHBOX:
            out = harden_matchbox(out)
    cursor = resize_max(out, 44) if name == "match" else None
    return out, cursor


def process_bg(path: Path) -> Image.Image:
    """Full-bleed scene plates: no cut/punch/trim, analog crush only."""
    im = to_rgba(Image.open(path))
    im = resize_max(im, BG_EDGE)
    return analog_degrade(im, f"bg:{path.stem}")


def process_gif(path: Path):
    name = path.stem
    is_static = name in STATIC
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
        if not is_static:
            arr = apply_mask(arr, flood_from_edges(arr, np.array([0, 0, 0]), BLACK_FUZZ))
        frames.append(Image.fromarray(arr, "RGBA"))
        disposal = getattr(im, "disposal_method", 1)
        last = Image.new("RGBA", (w, h), (0, 0, 0, 0)) if disposal == 2 else composed
    if not is_static and len(frames) > 24:
        frames = frames[::2]
        durations = durations[::2]
    edge = STATIC_EDGE if is_static else FIRE_EDGE
    resized = [resize_max(fr, edge) for fr in frames]
    if is_static:
        # Noise fill: keep every pixel. Analog crush would smear the grain.
        return resized, durations
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


def bake_tv_static() -> None:
    """Fill the punched old-TV screen with looping static. Always from raw."""
    tv_raw = next((p for p in _image_files(RAW) if p.stem == "old-tv-transparent-screen"), None)
    static_raw = RAW / "tv-static.gif"
    if tv_raw is None or not static_raw.exists():
        return
    tv, _ = process_still(tv_raw)
    frames, durs = process_gif(static_raw)
    hole = interior_holes(np.array(tv))
    if not hole.any():
        print("fail bake tv-static: no screen hole", file=sys.stderr)
        return
    filled: list[Image.Image] = []
    for fr in frames:
        fit = resize_cover(fr.convert("RGBA"), tv.size)
        base = np.array(tv)
        fill = np.array(fit)
        if fill.shape[:2] != base.shape[:2]:
            fit = fit.resize(tv.size, Image.Resampling.BILINEAR)
            fill = np.array(fit)
        base[hole, :3] = fill[hole, :3]
        base[hole, 3] = 255
        filled.append(Image.fromarray(base, "RGBA"))
    dest = CUT / "old-tv-transparent-screen.webp"
    encode_anim_webp(filled, durs, dest)
    kb = dest.stat().st_size / 1024
    print(f"ok  tv-static -> old-tv screen           {kb:7.1f} KB -> {dest.name}")


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

        if (not only) or only & {"tv-static", "old-tv-transparent-screen"}:
            try:
                bake_tv_static()
            except Exception as e:
                print(f"fail bake tv-static: {e}", file=sys.stderr)

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
