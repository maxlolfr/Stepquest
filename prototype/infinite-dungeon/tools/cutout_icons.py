"""Turns Gemini icons (object on a plain black, sometimes white-edged, background)
into transparent 256x256 WebP files. Usage: python3 tools/cutout_icons.py in.jpg:name [...]
Output: img/<name>.webp. Background = dark or near-white pixels connected to the border;
its glow is kept as partial transparency so halos still look soft on dark UI."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = os.path.join(os.path.dirname(__file__), '..', 'img')

def cutout(src, name, size=256):
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    mx, mn = im.max(2), im.min(2)
    cand = (mx < 48) | (mn > 205)
    lab, _ = ndimage.label(cand)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    alpha = np.ones(mx.shape, np.float32)
    white = bg & (mn > 205)
    alpha[bg] = np.clip((mx[bg] - 6) / 70, 0, 1) ** 1.3   # dark glow -> soft
    alpha[white] = 0
    alpha = ndimage.gaussian_filter(alpha, 0.8) * (~white) + 0
    alpha = np.maximum(alpha, (~bg).astype(np.float32))
    # un-premultiply the dark halo so it reads as light, not as a grey smudge
    rgb = im.copy()
    a3 = np.clip(alpha, 0.05, 1)[..., None]
    rgb = np.where(bg[..., None], np.clip(rgb / a3, 0, 255), rgb)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    box = img.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    img = img.crop(box)
    w, h = img.size; side = int(max(w, h) * 1.06)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - w) // 2, (side - h) // 2))
    canvas = canvas.resize((size, size), Image.LANCZOS)
    path = os.path.join(OUT, f'{name}.webp')
    canvas.save(path, 'WEBP', quality=88, method=6)
    return path, os.path.getsize(path)

if __name__ == '__main__':
    for arg in sys.argv[1:]:
        src, name = arg.rsplit(':', 1)
        print(*cutout(src, name))
