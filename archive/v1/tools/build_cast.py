"""Builds the Number Kitchen townsfolk into assets/cast/.

Everyone shares one kit — the same head, eyes, brows, mouth, arms and legs — so the
cast reads as one family; what differs is skin, hair, face mood and outfit. That is
the trick ABC Town's build_characters.py uses, and it is why eight people cost about
as much as one.

Parts that might animate later are tagged (arm-l, arm-r, leg-l, leg-r, face, brows,
mouth, pupil) with a transform-origin, as in ABC Town. Nothing animates them yet:
the guests are drawn as <img>, which Safari rasterises once and reuses, and up to six
of them share a stage on a 2017 iPad.

Re-run after editing:

    python tools/build_cast.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "cast"

INK = "#3a2e2e"


# ---------------------------------------------------------------- shared kit

def part(cls, inner, ox=None, oy=None):
    style = f' style="transform-origin:{ox}px {oy}px"' if ox is not None else ""
    return f'<g class="{cls}"{style}>{inner}</g>'


def shadow():
    return '<ellipse class="shadow" cx="100" cy="228" rx="52" ry="8" fill="#000" opacity=".12"/>'


def legs(trouser, shoe):
    out = ""
    for s, x in ((-1, 86), (1, 114)):
        cls = "leg-l" if s < 0 else "leg-r"
        inner = (f'<rect x="{x - 8}" y="186" width="16" height="30" rx="7" fill="{trouser}"/>'
                 f'<ellipse cx="{x + s * 4}" cy="219" rx="14" ry="8" fill="{shoe}" stroke="{INK}" stroke-width="2.5"/>')
        out += part(cls, inner, x, 188)
    return out


def arm(side, sleeve, skin, pose="down", mitt=None):
    """Returns (sleeve_svg, hand_svg). Draw the sleeve behind the torso and the hand
    in front, both pivoting on the shoulder."""
    s = side
    sx, sy = 100 + s * 30, 144
    if pose == "down":
        cx, cy, hx, hy = sx + s * 14, sy + 24, sx + s * 12, sy + 46
    elif pose == "out":
        cx, cy, hx, hy = sx + s * 20, sy + 6, sx + s * 34, sy + 16
    elif pose == "wave":
        cx, cy, hx, hy = sx + s * 26, sy - 12, sx + s * 22, sy - 38
    else:
        raise ValueError(pose)
    cls = "arm-l" if s < 0 else "arm-r"
    limb = (f'<path d="M{sx},{sy} Q{cx},{cy} {hx},{hy}" fill="none" stroke="{sleeve}" '
            f'stroke-width="15" stroke-linecap="round"/>')
    hand = f'<circle cx="{hx}" cy="{hy}" r="10" fill="{mitt or skin}" stroke="{INK}" stroke-width="2.5"/>'
    return part(cls, limb, sx, sy), part(cls, hand, sx, sy)


def eye(cx, cy, r, iris, look=(0.15, 0.1)):
    px, py = cx + look[0] * r * 0.35, cy + look[1] * r * 0.3
    pupil = (f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{r * 0.62:.1f}" fill="{iris}"/>'
             f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{r * 0.38:.1f}" fill="#1a1a1a"/>'
             f'<circle cx="{px - r * 0.24:.1f}" cy="{py - r * 0.27:.1f}" r="{r * 0.22:.1f}" fill="#fff"/>')
    s = (f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{r * 1.08:.1f}" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'
         + part("pupil", pupil))
    return part("eye", s, cx, cy)


def brow(cx, y, mood, side):
    s = side
    if mood == "happy":     return f"M{cx - 9},{y + 3} Q{cx},{y - 5} {cx + 9},{y + 3}"
    if mood == "cheeky":    return (f"M{cx - 9},{y - 2} Q{cx},{y - 11} {cx + 9},{y - 4}" if s < 0
                                    else f"M{cx - 9},{y + 2} Q{cx},{y - 1} {cx + 9},{y + 2}")
    if mood == "surprised": return f"M{cx - 9},{y - 4} Q{cx},{y - 13} {cx + 9},{y - 4}"
    if mood == "kind":      return f"M{cx - 9},{y + 2} Q{cx},{y - 3} {cx + 9},{y + 4}"
    if mood == "keen":      return f"M{cx - s * 9},{y + 1} Q{cx},{y - 7} {cx + s * 9},{y - 1}"
    raise ValueError(mood)


def brows(lx, rx, y, mood):
    return part("brows", f'<g fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round">'
                         f'<path d="{brow(lx, y, mood, -1)}"/><path d="{brow(rx, y, mood, 1)}"/></g>',
                (lx + rx) / 2, y)


def mouth(cx, my, kind, uid, w=19):
    if kind == "grin":
        d = f"M{cx - w},{my} C{cx - w // 2},{my + 26} {cx + w // 2},{my + 26} {cx + w},{my} Z"
        s = (f'<clipPath id="m{uid}"><path d="{d}"/></clipPath>'
             f'<path d="{d}" fill="#6e1a2b" stroke="{INK}" stroke-width="2.5"/>'
             f'<g clip-path="url(#m{uid})"><rect x="{cx - w}" y="{my - 2}" width="{2 * w}" height="8" fill="#fff"/></g>')
    elif kind == "smile":
        d = f"M{cx - w},{my} C{cx - w // 2},{my + 30} {cx + w // 2},{my + 30} {cx + w},{my} Z"
        s = (f'<clipPath id="m{uid}"><path d="{d}"/></clipPath>'
             f'<path d="{d}" fill="#6e1a2b" stroke="{INK}" stroke-width="2.5"/>'
             f'<g clip-path="url(#m{uid})"><rect x="{cx - w}" y="{my - 2}" width="{2 * w}" height="7" fill="#fff"/>'
             f'<ellipse cx="{cx}" cy="{my + 22}" rx="10" ry="7" fill="#ff7b9c"/></g>')
    elif kind == "small":
        s = f'<path d="M{cx - 11},{my} Q{cx},{my + 10} {cx + 11},{my}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    elif kind == "smirk":
        s = (f'<path d="M{cx - 14},{my} Q{cx},{my + 14} {cx + 16},{my - 4}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
             f'<ellipse cx="{cx + 8}" cy="{my + 7}" rx="5" ry="4" fill="#ff7b9c" stroke="{INK}" stroke-width="2"/>')
    elif kind == "oh":
        s = f'<ellipse cx="{cx}" cy="{my + 5}" rx="7" ry="9" fill="#6e1a2b" stroke="{INK}" stroke-width="2.5"/>'
    else:
        raise ValueError(kind)
    return part("mouth", s, cx, my)


def face(uid, iris, mood, mouth_kind, look=(0.15, 0.1), freckles=False):
    """The face kit, positioned on the shared head (centre 100,80, radius 46)."""
    cy, gap, r = 80, 18, 11
    lx, rx = 100 - gap, 100 + gap
    s = part("blush", f'<ellipse cx="{lx - r - 7}" cy="{cy + r + 4}" rx="9" ry="6" fill="#ff8fa3" opacity=".5"/>'
                      f'<ellipse cx="{rx + r + 7}" cy="{cy + r + 4}" rx="9" ry="6" fill="#ff8fa3" opacity=".5"/>')
    if freckles:
        s += ''.join(f'<circle cx="{100 + dx}" cy="{cy + dy}" r="1.8" fill="#c98a5e"/>'
                     for dx, dy in ((-34, 8), (-29, 14), (-38, 15), (34, 8), (29, 14), (38, 15)))
    s += eye(lx, cy, r, iris, look) + eye(rx, cy, r, iris, look)
    s += brows(lx, rx, cy - r - 9, mood)
    s += mouth(100, cy + r + 15, mouth_kind, uid)
    return part("face", s, 100, cy)


def head(skin):
    return (f'<circle cx="100" cy="80" r="46" fill="{skin}" stroke="{INK}" stroke-width="3"/>'
            f'<ellipse cx="52" cy="86" rx="8" ry="11" fill="{skin}" stroke="{INK}" stroke-width="2.5"/>'
            f'<ellipse cx="148" cy="86" rx="8" ry="11" fill="{skin}" stroke="{INK}" stroke-width="2.5"/>')


def neck(skin):
    return f'<rect x="90" y="112" width="20" height="26" rx="8" fill="{skin}" stroke="{INK}" stroke-width="2.5"/>'


# ---- hair: the back half sits behind the head, the front half over it ----

def hair_back(style, c):
    if style == "bun":
        return (f'<circle cx="100" cy="28" r="17" fill="{c}" stroke="{INK}" stroke-width="2.5"/>'
                f'<circle cx="100" cy="80" r="48" fill="{c}"/>')
    if style == "bob":
        return f'<path d="M50 84 A50 50 0 0 1 150 84 L150 118 Q128 104 100 104 Q72 104 50 118 Z" fill="{c}"/>'
    if style == "curly":
        return ('<g fill="%s">' % c + ''.join(
            f'<circle cx="{100 + dx}" cy="{56 + dy}" r="17"/>'
            for dx, dy in ((-40, 10), (-28, -12), (0, -22), (28, -12), (40, 10))) + '</g>')
    if style == "ponytail":
        return (f'<circle cx="100" cy="80" r="48" fill="{c}"/>'
                f'<path d="M144 62 Q176 74 170 120 Q166 146 150 150 Q162 122 152 96 Q146 78 138 72 Z" fill="{c}" stroke="{INK}" stroke-width="2.5"/>')
    if style == "braids":
        out = f'<circle cx="100" cy="80" r="48" fill="{c}"/>'
        for s in (-1, 1):
            x = 100 + s * 50
            out += (f'<path d="M{x},74 Q{x + s * 12},104 {x + s * 6},140" fill="none" stroke="{c}" '
                    f'stroke-width="15" stroke-linecap="round"/>'
                    f'<circle cx="{x + s * 7}" cy="146" r="6" fill="#ff5fa2" stroke="{INK}" stroke-width="2"/>')
        return out
    if style == "grey-bun":
        return (f'<circle cx="100" cy="30" r="19" fill="{c}" stroke="{INK}" stroke-width="2.5"/>'
                f'<circle cx="100" cy="80" r="48" fill="{c}"/>')
    if style in ("short", "none"):
        return ""
    raise ValueError(style)


def hair_front(style, c):
    if style in ("bun", "grey-bun"):
        return f'<path d="M56 68 Q68 34 100 34 Q132 34 144 68 Q124 50 100 50 Q76 50 56 68 Z" fill="{c}"/>'
    if style == "bob":
        return f'<path d="M54 72 Q62 34 100 34 Q138 34 146 72 Q126 48 100 48 Q74 48 54 72 Z" fill="{c}"/>'
    if style == "curly":
        return f'<path d="M58 66 Q70 38 100 38 Q130 38 142 66 Q120 52 100 56 Q78 52 58 66 Z" fill="{c}"/>'
    if style == "ponytail":
        return f'<path d="M56 68 Q66 34 100 34 Q134 34 144 68 Q120 48 92 54 Q72 58 56 68 Z" fill="{c}"/>'
    if style == "braids":
        return f'<path d="M56 68 Q68 34 100 34 Q132 34 144 68 Q122 48 100 48 Q78 48 56 68 Z" fill="{c}"/>'
    if style == "short":
        return f'<path d="M56 70 Q64 32 100 32 Q136 32 144 70 Q130 46 100 46 Q70 46 56 70 Z" fill="{c}"/>'
    if style == "none":
        return ""
    raise ValueError(style)


# ---- headwear ----

def hat(kind, a, b=None):
    b = b or a
    if kind == "toque":     # chef's hat
        return (f'<path d="M62 44 Q52 4 80 10 Q92 -8 120 10 Q148 4 138 44 Z" fill="{a}" stroke="{INK}" stroke-width="3"/>'
                f'<rect x="60" y="40" width="80" height="20" rx="8" fill="{a}" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M64 46 h72" stroke="{INK}" stroke-width="2" opacity=".25"/>')
    if kind == "bandana":
        return (f'<path d="M54 56 Q100 22 146 56 Q100 44 54 56 Z" fill="{a}" stroke="{INK}" stroke-width="2.5"/>'
                f'<path d="M52 54 Q100 26 148 54 L148 64 Q100 46 52 64 Z" fill="{a}" stroke="{INK}" stroke-width="2.5"/>'
                f'<path d="M146 58 l22 -8 -6 18 z" fill="{a}" stroke="{INK}" stroke-width="2.5"/>'
                + ''.join(f'<circle cx="{70 + i * 20}" cy="{50 + (i % 2) * 5}" r="3" fill="#fff" opacity=".8"/>' for i in range(4)))
    if kind == "straw":
        return (f'<ellipse cx="100" cy="52" rx="68" ry="15" fill="{a}" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M66 50 Q70 14 100 14 Q130 14 134 50 Z" fill="{a}" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M66 44 Q100 34 134 44" fill="none" stroke="{b}" stroke-width="7"/>')
    if kind == "sunhat":
        return (f'<ellipse cx="100" cy="54" rx="70" ry="17" fill="{a}" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M64 52 Q66 12 100 12 Q134 12 136 52 Z" fill="{a}" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M64 46 Q100 36 136 46" fill="none" stroke="{b}" stroke-width="8"/>'
                f'<circle cx="132" cy="42" r="7" fill="#ff7bac" stroke="{INK}" stroke-width="2"/>')
    if kind == "cap":
        return (f'<path d="M58 52 Q60 12 100 12 Q140 12 142 52 Z" fill="{a}" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M140 50 Q176 50 174 62 Q150 62 140 58 Z" fill="{b}" stroke="{INK}" stroke-width="3"/>'
                f'<circle cx="100" cy="16" r="6" fill="{b}" stroke="{INK}" stroke-width="2"/>')
    if kind == "hardhat":
        return (f'<ellipse cx="100" cy="52" rx="66" ry="13" fill="{a}" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M58 50 Q60 10 100 10 Q140 10 142 50 Z" fill="{a}" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M100 12 V50 M76 18 V48 M124 18 V48" stroke="{b}" stroke-width="4" opacity=".55"/>')
    if kind == "bow":
        return (f'<path d="M100 34 L70 18 Q60 34 70 50 Z" fill="{a}" stroke="{INK}" stroke-width="2.5"/>'
                f'<path d="M100 34 L130 18 Q140 34 130 50 Z" fill="{a}" stroke="{INK}" stroke-width="2.5"/>'
                f'<circle cx="100" cy="34" r="9" fill="{b}" stroke="{INK}" stroke-width="2.5"/>')
    if kind == "none":
        return ""
    raise ValueError(kind)


# ---- outfits ----

TORSO = "M68 196 C64 148 76 130 100 130 C124 130 136 148 132 196 Z"


def outfit(kind, a, b=None, c=None):
    b = b or a
    c = c or "#fff"
    s = f'<path d="{TORSO}" fill="{a}" stroke="{INK}" stroke-width="3"/>'
    if kind == "chef":
        s += (f'<path d="M100 130 L84 146 L100 162 L116 146 Z" fill="{b}" stroke="{INK}" stroke-width="2.5"/>'
              + ''.join(f'<circle cx="{86 if i % 2 else 114}" cy="{164 + (i // 2) * 16}" r="4" fill="{c}"/>' for i in range(4)))
    elif kind == "apron":
        s += (f'<path d="M82 132 L82 196 L118 196 L118 132 Q100 142 82 132 Z" fill="{b}" stroke="{INK}" stroke-width="2.5"/>'
              + ''.join(f'<path d="M84 {150 + i * 14} h32" stroke="{c}" stroke-width="4" opacity=".7"/>' for i in range(3)))
    elif kind == "dungarees":
        s += (f'<path d="M76 158 L124 158 L128 196 L72 196 Z" fill="{b}" stroke="{INK}" stroke-width="2.5"/>'
              f'<path d="M84 158 L88 132 M116 158 L112 132" stroke="{b}" stroke-width="9" stroke-linecap="round"/>'
              f'<circle cx="88" cy="164" r="4" fill="{c}"/><circle cx="112" cy="164" r="4" fill="{c}"/>')
    elif kind == "hivis":
        s += (f'<path d="M78 136 L78 196 L122 196 L122 136 Q100 144 78 136 Z" fill="{b}" stroke="{INK}" stroke-width="2.5"/>'
              f'<path d="M78 170 h44" stroke="{c}" stroke-width="8" opacity=".9"/>')
    elif kind == "plaid":
        s += (''.join(f'<path d="M{74 + i * 13} 132 V196" stroke="{b}" stroke-width="5" opacity=".65"/>' for i in range(5))
              + ''.join(f'<path d="M68 {144 + i * 16} h64" stroke="{b}" stroke-width="5" opacity=".65"/>' for i in range(4)))
    elif kind == "coat":
        s += (f'<path d="M100 130 V196" stroke="{INK}" stroke-width="2.5"/>'
              f'<path d="M100 130 L82 148 M100 130 L118 148" stroke="{INK}" stroke-width="2.5" fill="none"/>'
              + ''.join(f'<circle cx="108" cy="{158 + i * 16}" r="4" fill="{c}"/>' for i in range(3)))
    elif kind == "dress":
        s += (f'<path d="M72 196 C70 160 78 138 100 138 C122 138 130 160 128 196 Z" fill="{b}" stroke="{INK}" stroke-width="2.5"/>'
              + ''.join(f'<circle cx="{100 + dx}" cy="{158 + dy}" r="4" fill="{c}"/>'
                        for dx, dy in ((-14, 4), (0, 16), (14, 4), (-8, 28), (10, 30))))
    elif kind == "cardigan":
        s += (f'<path d="M100 132 V196" stroke="{b}" stroke-width="3"/>'
              f'<path d="M78 136 Q84 166 82 196 M122 136 Q116 166 118 196" fill="none" stroke="{b}" stroke-width="7"/>'
              + ''.join(f'<circle cx="100" cy="{150 + i * 16}" r="4" fill="{c}"/>' for i in range(3))
              + f'<circle cx="82" cy="150" r="6" fill="#ffd54f" stroke="{INK}" stroke-width="2"/>')
    else:
        raise ValueError(kind)
    return s


def glasses():
    return ('<g fill="none" stroke="%s" stroke-width="3">'
            '<circle cx="82" cy="80" r="17"/><circle cx="118" cy="80" r="17"/>'
            '<path d="M99 79 h2"/><path d="M65 76 L54 72"/><path d="M135 76 L146 72"/></g>' % INK)


# ---------------------------------------------------------------- the cast

def person(key, skin, hair, hair_c, trouser, shoe, sleeve, fit, fit_a, fit_b, fit_c,
           iris, mood, mouth_kind, hat_kind, hat_a, hat_b=None,
           pose=("down", "down"), mitt=None, freckles=False, specs=False):
    la, lh = arm(-1, sleeve, skin, pose[0], mitt)
    ra, rh = arm(1, sleeve, skin, pose[1], mitt)
    body = shadow()
    body += legs(trouser, shoe)
    body += la + ra                       # sleeves behind the torso
    body += neck(skin)
    body += outfit(fit, fit_a, fit_b, fit_c)
    body += lh + rh                       # hands in front of it
    body += hair_back(hair, hair_c)
    body += head(skin)
    body += hair_front(hair, hair_c)
    body += face(key, iris, mood, mouth_kind, freckles=freckles)
    if specs:
        body += glasses()
    body += hat(hat_kind, hat_a, hat_b)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" data-char="{key}">'
            f'{body}</svg>')


CAST = {
    # A chef, so one of them clearly works here.
    "pip": lambda: person("pip", "#f2c49b", "short", "#6b4423", "#3f4d66", "#5a4632", "#ffffff",
                          "chef", "#ffffff", "#e8503a", "#d8dee6", "#5b7bb5", "happy", "grin",
                          "toque", "#ffffff", pose=("down", "wave")),
    # The baker: bandana, striped apron, flour on her hands.
    "bea": lambda: person("bea", "#8d5524", "bun", "#241a14", "#6b4f8f", "#3c3c46", "#f0a6c0",
                          "apron", "#f0a6c0", "#4a7ec4", "#ffffff", "#3b2a1c", "kind", "smile",
                          "bandana", "#e8503a", pose=("out", "down")),
    # The farmer: straw hat, dungarees, freckles.
    "ollie": lambda: person("ollie", "#f7d7b5", "curly", "#d4642a", "#5d8c3f", "#7a4a2a", "#ffd23f",
                            "dungarees", "#ffd23f", "#5d8c3f", "#f5c542", "#4a7a3a", "cheeky", "smirk",
                            "straw", "#e8c87a", "#c0563a", freckles=True, pose=("down", "out")),
    # The littlest customer, up on tiptoes for the counter.
    "mimi": lambda: person("mimi", "#d99a6c", "braids", "#2e1f16", "#e85fa2", "#ffffff", "#ff8fc4",
                           "dress", "#ff8fc4", "#ffc2dd", "#ffffff", "#5b3a1c", "surprised", "smile",
                           "bow", "#ff5fa2", "#ffd54f", pose=("wave", "wave")),
    # The builder, in from the site next door.
    "gus": lambda: person("gus", "#c68642", "none", "#000000", "#4a6fa5", "#4a4a52", "#4a7ec4",
                          "hivis", "#4a7ec4", "#ff9e2c", "#f5f5f5", "#2f2418", "keen", "grin",
                          "hardhat", "#ffd23f", "#e0a800", pose=("out", "down")),
    # The gardener, gloves still on.
    "nell": lambda: person("nell", "#8d5524", "ponytail", "#1f1710", "#6b7a4a", "#5a4632", "#c0563a",
                           "plaid", "#c0563a", "#7a2f22", "#ffffff", "#3b2a1c", "happy", "small",
                           "sunhat", "#e8c87a", "#5d8c3f", mitt="#7fc46b", pose=("down", "out")),
    # The postie, mid-round.
    "rory": lambda: person("rory", "#ffe0bd", "short", "#e0b84a", "#2f3f66", "#3c3c46", "#2f4f8f",
                           "coat", "#2f4f8f", "#1f3a66", "#ffd23f", "#4a6b3a", "cheeky", "grin",
                           "cap", "#2f4f8f", "#ffd23f", pose=("down", "wave")),
    # Everyone's nan, always first in the queue.
    "tilly": lambda: person("tilly", "#f7d7b5", "grey-bun", "#cfd2d6", "#6b5b7a", "#4a3a4a", "#b89ad4",
                            "cardigan", "#b89ad4", "#9a7ac0", "#fff4b8", "#5b6b5a", "kind", "smile",
                            "none", "#ffffff", pose=("out", "down"), specs=True),
}


def namespace_ids(key, text):
    """Prefix every id so the whole cast can share one page without clip-path clashes."""
    text = re.sub(r'\bid="([^"]+)"', lambda m: f'id="{key}-{m.group(1)}"', text)
    return re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{key}-{m.group(1)})', text)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in CAST.items():
        (OUT / f"{name}.svg").write_text(namespace_ids(name, fn()), encoding="utf-8")
        print(f"  {name}.svg")
    print(f"Wrote {len(CAST)} townsfolk to {OUT}")


if __name__ == "__main__":
    main()
