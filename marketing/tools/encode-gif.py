from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parents[2]
for lang in ('en', 'ru'):
    timeline = json.loads((root / 'marketing/captures' / f'{lang}-timeline.json').read_text())
    images = [Image.open(item['file']).convert('RGB').resize((960, 600), Image.Resampling.LANCZOS) for item in timeline]
    palette = images[0].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    frames = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in images]
    frames[0].save(root / 'marketing/assets' / lang / 'demo.gif', save_all=True, append_images=frames[1:], duration=[round(item['duration'] * 1000) for item in timeline], loop=0, optimize=True, disposal=2)
    print(f'{lang}: 18-second GIF, 960×600')
