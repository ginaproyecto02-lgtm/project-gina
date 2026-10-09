# Genera los íconos de la extensión y las imágenes promocionales de las tiendas.
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
NAVY=(31,42,68,255); GOLD=(201,162,39,255); WHITE=(255,255,255,255); INK=(18,24,40,255)
EXT="/home/claude/ext/extension/icons"; OUT="/home/claude/ext/store/imagenes"
os.makedirs(OUT, exist_ok=True)

def eye(d, cx, cy, w, simple=False):
    """Ojo en almendra centrado en (cx, cy) con ancho w."""
    h = w*0.56
    # almendra: intersección de dos círculos grandes
    r = (w*w/4 + h*h/4) / h
    mask = Image.new("L", d.im.size if hasattr(d,'im') else (1,1), 0)
    return h, r

def draw_icon(size, padding_ratio=0.125):
    S = 8  # superresolución
    W = size*S
    im = Image.new("RGBA", (W, W), (0,0,0,0))
    pad = int(W*padding_ratio)
    box = [pad, pad, W-pad, W-pad]
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(box, radius=int((W-2*pad)*0.22), fill=NAVY)
    cx = cy = W/2
    ew = (W-2*pad)*0.78; eh = ew*0.58
    # almendra con dos arcos
    r = (ew*ew/4 + eh*eh/4) / eh
    m1 = Image.new("L", (W,W), 0); ImageDraw.Draw(m1).ellipse([cx-r, cy-eh/2, cx+r, cy-eh/2+2*r], fill=255)
    m2 = Image.new("L", (W,W), 0); ImageDraw.Draw(m2).ellipse([cx-r, cy+eh/2-2*r, cx+r, cy+eh/2], fill=255)
    almond = Image.composite(m1, Image.new("L",(W,W),0), m2)
    im.paste(Image.new("RGBA",(W,W),WHITE), (0,0), almond)
    ir = eh*0.42
    d.ellipse([cx-ir, cy-ir, cx+ir, cy+ir], fill=GOLD)
    pr = ir*0.45
    d.ellipse([cx-pr, cy-pr, cx+pr, cy+pr], fill=INK)
    if size >= 32:
        hr = pr*0.38
        d.ellipse([cx-pr*0.15-hr, cy-pr*0.55-hr, cx-pr*0.15+hr, cy-pr*0.55+hr], fill=WHITE)
    return im.resize((size,size), Image.LANCZOS)

# Íconos de la extensión: 128 con margen de 16 px (arte 96); 16 y 48 casi sin margen para que se vean grandes.
draw_icon(128, 0.125).save(f"{EXT}/icon128.png")
draw_icon(48, 0.04).save(f"{EXT}/icon48.png")
draw_icon(16, 0.0).save(f"{EXT}/icon16.png")
draw_icon(300, 0.0).save(f"{OUT}/logo-300.png")          # Edge: logotipo 300x300
draw_icon(128, 0.125).save(f"{OUT}/icono-128.png")

def font(sz, bold=False):
    for f in (["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"] if bold else ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]):
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()

def promo(w, h, path, title_sz, sub_sz, icon_sz):
    im = Image.new("RGBA", (w, h), NAVY)
    d = ImageDraw.Draw(im)
    # franja dorada sutil
    d.rectangle([0, h-int(h*0.035), w, h], fill=GOLD)
    ic = draw_icon(icon_sz, 0.0)
    x0 = int(w*0.07); y0 = (h-icon_sz)//2 - int(h*0.02)
    im.alpha_composite(ic, (x0, y0))
    tx = x0 + icon_sz + int(w*0.045)
    d.text((tx, y0 + int(icon_sz*0.05)), "Gina", font=font(title_sz, True), fill=WHITE)
    d.text((tx, y0 + int(icon_sz*0.05) + int(title_sz*1.25)), "Know who your", font=font(sub_sz), fill=(214,220,234,255))
    d.text((tx, y0 + int(icon_sz*0.05) + int(title_sz*1.25) + int(sub_sz*1.3)), "money backs.", font=font(sub_sz), fill=(214,220,234,255))
    im.convert("RGB").save(path)

promo(440, 280, f"{OUT}/promo-pequeno-440x280.png", 40, 21, 110)
promo(1400, 560, f"{OUT}/promo-marquesina-1400x560.png", 110, 52, 280)
print("ok")
