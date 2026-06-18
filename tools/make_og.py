"""Generate the 1200x630 Open Graph banner for GG Soluciones.

Brand: dark navy background with blue gradient glow, logo + headline.
Output: og-image.png (and a JPG fallback) at repo root.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630

# Brand colors
BG_TOP = (5, 8, 15)        # #05080f
BG_BOT = (10, 23, 48)      # #0a1730
ACCENT = (47, 128, 237)    # #2f80ed
ACCENT_DEEP = (26, 79, 160)  # #1a4fa0
TEXT = (237, 242, 250)
MUTED = (150, 168, 196)

FONTS = "C:/Windows/Fonts"


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


# --- background vertical gradient ---
base = Image.new("RGB", (W, H), BG_TOP)
top = Image.new("RGB", (W, H), BG_TOP)
bot = Image.new("RGB", (W, H), BG_BOT)
mask = Image.new("L", (W, H))
mdata = []
for y in range(H):
    mdata.extend([int(255 * (y / H))] * W)
mask.putdata(mdata)
base = Image.composite(bot, top, mask)

# --- blue glow orb (top-right) ---
glow = Image.new("RGB", (W, H), (0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([W - 520, -260, W + 180, 360], fill=(20, 60, 130))
glow = glow.filter(ImageFilter.GaussianBlur(150))
# screen-blend the glow onto base
import PIL.ImageChops as IC
base = IC.screen(base, glow)

# second softer orb bottom-left
glow2 = Image.new("RGB", (W, H), (0, 0, 0))
g2 = ImageDraw.Draw(glow2)
g2.ellipse([-280, H - 300, 320, H + 220], fill=(14, 40, 90))
glow2 = glow2.filter(ImageFilter.GaussianBlur(160))
base = IC.screen(base, glow2)

draw = ImageDraw.Draw(base)

# --- logo (left) ---
logo = Image.open(os.path.join(ROOT, "logo.png")).convert("RGBA")
LOGO_H = 250
ratio = LOGO_H / logo.height
logo = logo.resize((int(logo.width * ratio), LOGO_H), Image.LANCZOS)
LX, LY = 96, (H - logo.height) // 2 - 10
base.paste(logo, (LX, LY), logo)

# --- text block (right of logo) ---
TX = LX + logo.width + 64
right_limit = W - 80

f_eyebrow = font("seguisb.ttf", 26)
f_head = font("seguibl.ttf", 60)
f_sub = font("segoeuib.ttf", 30)


def text_w(d, s, fnt):
    b = d.textbbox((0, 0), s, font=fnt)
    return b[2] - b[0]


def wrap(d, s, fnt, maxw):
    words = s.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if text_w(d, t, fnt) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


avail = right_limit - TX

# eyebrow
eyebrow = "ggsoluciones.com.ar"
draw.text((TX, 150), eyebrow, font=f_eyebrow, fill=ACCENT)

# headline
headline = "Desarrollo de Software & Consultoría IT"
hlines = wrap(draw, headline, f_head, avail)
y = 196
for ln in hlines:
    draw.text((TX, y), ln, font=f_head, fill=TEXT)
    y += 70

# accent underline bar
y += 6
draw.rounded_rectangle([TX, y, TX + 92, y + 8], radius=4, fill=ACCENT)
y += 34

# subline
sub = "Agentes IA · Automatización · Datos · Jujuy"
for ln in wrap(draw, sub, f_sub, avail):
    draw.text((TX, y), ln, font=f_sub, fill=MUTED)
    y += 40

# --- save ---
out_png = os.path.join(ROOT, "og-image.png")
base.save(out_png, "PNG", optimize=True)
base.save(os.path.join(ROOT, "og-image.jpg"), "JPEG", quality=88)
print("written", out_png, base.size)
