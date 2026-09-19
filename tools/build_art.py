"""Builds every piece of food, utensil and recipe icon into assets/art/, and the
animatable vessels into js/vessels.js.

The cast (tools/build_cast.py) is drawn with a heavy ink outline, flat fills and a
single highlight. The food was not, which is why the two never looked like they came
from the same game. Everything here uses that same language.

Two output shapes, for two different jobs:

  assets/art/*.svg  Ingredients, finished portions, utensils and recipe icons.
                    Referenced as <img>, so Safari rasterises each file once and
                    reuses it — a stage can hold twenty of the same ingredient.
  js/vessels.js     Bowls, ovens, blenders and pans. These need their INSIDES
                    animated (contents swirling, a door glowing, dough spreading),
                    which an <img> cannot do, so they are inlined with their parts
                    tagged. Only ever one on screen at a time.

Re-run after editing:

    python tools/build_art.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "assets" / "art"
VESSELS_JS = ROOT / "js" / "vessels.js"

INK = "#3a2e2e"
W = 3.6          # outline weight on a 100 box, matched by eye to the cast's at 200
WV = 3.0         # ... and on a vessel's 200x140 box


# ---------------------------------------------------------------- drawing kit

def sh(d, fill, w=W, op=None, cls=None):
    o = f' opacity="{op}"' if op is not None else ""
    c = f' class="{cls}"' if cls else ""
    return (f'<path{c} d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{w}" '
            f'stroke-linejoin="round" stroke-linecap="round"{o}/>')


def flat(d, fill, op=None, cls=None):
    """A shape with no outline — shading and detail that sits inside an outlined form."""
    o = f' opacity="{op}"' if op is not None else ""
    c = f' class="{cls}"' if cls else ""
    return f'<path{c} d="{d}" fill="{fill}"{o}/>'


def circ(cx, cy, r, fill, w=W, cls=None):
    c = f' class="{cls}"' if cls else ""
    return f'<circle{c} cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{INK}" stroke-width="{w}"/>'


def dot(cx, cy, r, fill, op=None):
    o = f' opacity="{op}"' if op is not None else ""
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{o}/>'


def ell(cx, cy, rx, ry, fill, w=W, cls=None):
    c = f' class="{cls}"' if cls else ""
    return f'<ellipse{c} cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{INK}" stroke-width="{w}"/>'


def flat_ell(cx, cy, rx, ry, fill, op=None, rot=0):
    o = f' opacity="{op}"' if op is not None else ""
    t = f' transform="rotate({rot} {cx} {cy})"' if rot else ""
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"{o}{t}/>'


def shine(cx, cy, rx=9, ry=5, rot=-35, op=.5):
    """The single white highlight every solid form gets, so they read as one set."""
    return flat_ell(cx, cy, rx, ry, "#fff", op, rot)


def part(cls, inner, ox=None, oy=None):
    style = f' style="transform-origin:{ox}px {oy}px"' if ox is not None else ""
    return f'<g class="{cls}"{style}>{inner}</g>'


def svg100(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{body}</svg>'


# ---------------------------------------------------------------- ingredients

def scoop():
    """A measuring cup heaped with flour."""
    return (sh("M27 38 L73 38 L66 86 A7 7 0 0 1 59 92 L41 92 A7 7 0 0 1 34 86 Z", "#ebe3d1")
            + flat("M62 38 L66 86 A7 7 0 0 1 59 92 L52 92 L58 38 Z", "#d3c9b2")
            + sh("M27 38 C33 18 67 18 73 38 Z", "#fffaf0")
            + shine(40, 30, 8, 4, -20, .8))


def egg():
    """Cracked into the bowl, not still in its shell — it reads faster."""
    return (sh("M16 62 C7 43 26 25 43 32 C55 17 85 25 85 46 C97 61 86 82 66 78 "
               "C52 91 25 83 16 62 Z", "#fffaf5")
            + circ(54, 52, 16, "#ffc83d")
            + shine(48, 46, 6, 4, -30, .7))


def pepperoni():
    return (circ(50, 50, 31, "#cc3b2c")
            + "".join(dot(x, y, r, "#96200f", .85) for x, y, r in
                      ((38, 40, 6), (61, 54, 5), (44, 63, 4.5), (63, 37, 3.5)))
            + shine(38, 33, 9, 5))


def cherry():
    return ("".join((f'<path d="M46 48 C52 30 64 19 76 15" fill="none" stroke="#4a7c2a" '
                     f'stroke-width="6" stroke-linecap="round"/>',))
            + sh("M63 24 C74 11 90 14 91 26 C79 36 66 34 63 24 Z", "#5da83c")
            + circ(45, 68, 22, "#d81b3c")
            + shine(36, 60, 8, 5))


def case_():
    """An empty cupcake case."""
    ridges = "".join(flat(f"M{38 + i * 8} 44 L{40 + i * 7} 86", "#00000000")
                     for i in range(0))  # ridges drawn as strokes below instead
    return (sh("M31 42 L69 42 L63 84 A5 5 0 0 1 58 89 L42 89 A5 5 0 0 1 37 84 Z", "#f0a0be")
            + "".join(f'<path d="M{39 + i * 7.5} 44 L{41 + i * 6.8} 87" stroke="#d47ba0" '
                      f'stroke-width="3" stroke-linecap="round"/>' for i in range(4))
            + ell(50, 42, 19, 5, "#f7b8ce")
            + ridges)


def bread():
    return (sh("M23 47 C23 26 77 26 77 47 L77 80 A6 6 0 0 1 71 86 L29 86 A6 6 0 0 1 23 80 Z", "#e8b877")
            + flat("M31 50 C31 36 69 36 69 50 L69 78 L31 78 Z", "#f7e4bd")
            + shine(40, 44, 8, 4, -18, .55))


def ham():
    return (sh("M18 38 L82 38 A15 15 0 0 1 82 70 L18 70 A15 15 0 0 1 18 38 Z", "#f0908f")
            + dot(38, 50, 6, "#fbc3c2") + dot(60, 58, 5, "#fbc3c2") + dot(70, 46, 3.5, "#fbc3c2")
            + shine(34, 45, 9, 4, -12, .45))


def strawberry():
    seeds = "".join(flat_ell(x, y, 2.2, 3, "#ffe9a8", .95, rot)
                    for x, y, rot in ((42, 52, 10), (57, 50, -10), (50, 63, 0),
                                      (36, 64, 15), (63, 63, -15), (50, 44, 0), (47, 76, 0)))
    return (sh("M50 91 C24 72 21 46 38 36 C45 31 55 31 62 36 C79 46 76 72 50 91 Z", "#e8304a")
            + seeds
            + sh("M50 38 L36 28 L44 36 L28 34 L40 41 L30 46 Z M50 38 L64 28 L56 36 L72 34 "
                 "L60 41 L70 46 Z", "#5da83c", w=2.6)
            + shine(38, 46, 7, 4, -40, .4))


def berry():
    """A blueberry, crown and all."""
    return (circ(50, 56, 26, "#5b3a8f")
            + flat("M50 34 L54 42 L63 42 L56 47 L59 56 L50 50 L41 56 L44 47 L37 42 L46 42 Z", "#3c2463")
            + shine(39, 46, 8, 5))


def cup():
    """A cup of smoothie, straw in."""
    return ('<path d="M58 34 L72 10" stroke="#e8503a" stroke-width="8" stroke-linecap="round"/>'
            + sh("M28 32 L72 32 L65 88 A7 7 0 0 1 58 94 L42 94 A7 7 0 0 1 35 88 Z", "#eaf4ff")
            + flat("M33 48 L67 48 L61 87 A6 6 0 0 1 55 92 L45 92 A6 6 0 0 1 39 87 Z", "#c77ce8")
            + ell(50, 32, 22, 6, "#f7fbff")
            + shine(40, 60, 5, 12, 0, .45))


# ------------------------------------------------------------ finished portions

def slice_():
    """A wedge of pizza, crust at the bottom."""
    return (sh("M50 12 L86 80 Q50 95 14 80 Z", "#e8c27a")
            + flat("M50 26 L77 77 Q50 89 23 77 Z", "#d24a32")
            + dot(50, 52, 6, "#a8331f") + dot(38, 68, 5, "#a8331f") + dot(62, 68, 5, "#a8331f")
            + shine(42, 36, 6, 9, 20, .3))


def cupcake():
    return (sh("M33 52 L67 52 L61 86 A5 5 0 0 1 56 90 L44 90 A5 5 0 0 1 39 86 Z", "#e8a0bf")
            + "".join(f'<path d="M{41 + i * 6.5} 54 L{43 + i * 6} 88" stroke="#c97f9e" '
                      f'stroke-width="2.6" stroke-linecap="round"/>' for i in range(4))
            + sh("M28 53 C26 36 38 24 50 24 C62 24 74 36 72 53 Z", "#fff2f7")
            + circ(50, 22, 7, "#d81b3c", w=3)
            + shine(38, 38, 6, 4, -30, .8))


def sandwich():
    return (sh("M14 74 L50 24 L86 74 Z", "#e8b877")
            + flat("M24 68 L50 32 L76 68 Z", "#f7e4bd")
            + sh("M27 62 L50 40 L73 62 Z", "#f0908f", w=3)
            + flat("M32 62 C38 55 44 62 50 56 C56 62 62 55 68 62 Z", "#6bbf47")
            + shine(40, 44, 6, 4, -45, .5))


def pancake():
    return ('<g>'
            + ell(50, 74, 33, 12, "#b8692a")
            + ell(50, 62, 33, 12, "#cf7d33")
            + ell(50, 50, 33, 12, "#e0913f")
            + flat("M34 44 C40 36 62 36 66 46 C58 52 40 52 34 44 Z", "#a85a22", .5)
            + sh("M41 34 L59 34 L59 44 L41 44 Z", "#ffe27a", w=3)
            + shine(38, 48, 8, 3, -8, .4)
            + '</g>')


# ---------------------------------------------------------------- spares

def tomato():
    return (circ(50, 57, 30, "#e03d2a")
            + sh("M50 30 L38 20 L46 28 L32 27 L43 34 Z M50 30 L62 20 L54 28 L68 27 L57 34 Z", "#4caf50", w=2.6)
            + shine(38, 44, 9, 5))


def cheese():
    return (sh("M16 70 L50 24 L84 70 Z", "#ffd43b")
            + dot(50, 57, 5.5, "#eaa900") + dot(62, 64, 4.5, "#eaa900") + dot(40, 64, 4, "#eaa900")
            + shine(47, 40, 5, 8, 0, .45))


def mushroom():
    return (sh("M20 54 A30 26 0 0 1 80 54 Z", "#c08a3e")
            + sh("M42 52 L58 52 L57 80 A8 8 0 0 1 43 80 Z", "#f2e6c9")
            + shine(36, 40, 9, 5))


def olive():
    return (ell(50, 53, 23, 27, "#46552f")
            + flat_ell(50, 53, 10, 13, "#d24a3a")
            + shine(40, 40, 6, 4))


def basil():
    return (sh("M50 18 C80 34 80 72 50 86 C20 72 20 34 50 18 Z", "#3fa34d")
            + '<path d="M50 22 V82" stroke="#2c7a37" stroke-width="4"/>'
            + "".join(f'<path d="M50 {34 + i * 14} L{66 - i * 2} {28 + i * 14}" stroke="#2c7a37" '
                      f'stroke-width="3" stroke-linecap="round"/>' for i in range(4))
            + "".join(f'<path d="M50 {34 + i * 14} L{34 + i * 2} {28 + i * 14}" stroke="#2c7a37" '
                      f'stroke-width="3" stroke-linecap="round"/>' for i in range(4)))


def butter():
    return (sh("M22 44 L78 44 L78 68 A5 5 0 0 1 73 73 L27 73 A5 5 0 0 1 22 68 Z", "#ffd75e")
            + flat("M22 44 L78 44 L78 53 L22 53 Z", "#fff0b8")
            + shine(36, 48, 8, 3, 0, .6))


def lettuce():
    """A ruffled leaf. The old one read as a green moustache."""
    return (sh("M50 88 C18 78 8 50 22 32 C30 22 42 26 46 34 C48 20 62 14 70 22 "
               "C80 18 92 28 88 40 C98 52 90 76 50 88 Z", "#5cb23c")
            + flat("M50 86 C24 76 18 52 28 38 C36 30 44 36 47 44 C50 32 62 26 68 34 "
                   "C78 32 86 40 83 50 C90 60 82 76 50 86 Z", "#7fd158", .85)
            + '<path d="M50 86 C48 64 46 48 40 36 M50 84 C56 66 62 52 72 40" fill="none" '
              'stroke="#3d8a26" stroke-width="3" stroke-linecap="round" opacity=".7"/>')


def sprinkle():
    """Three hundreds-and-thousands, not one pink bean."""
    out = ""
    for x, y, rot, col in ((32, 62, -25, "#ff5fa2"), (52, 40, 20, "#ffd23f"), (66, 66, -8, "#4fc3f7")):
        out += (f'<g transform="rotate({rot} {x} {y})">'
                + sh(f"M{x - 13} {y - 6} L{x + 13} {y - 6} A6 6 0 0 1 {x + 13} {y + 6} "
                     f"L{x - 13} {y + 6} A6 6 0 0 1 {x - 13} {y - 6} Z", col, w=3)
                + '</g>')
    return out


def banana():
    return (sh("M20 30 C28 76 72 84 84 54 C66 70 40 58 34 26 Z", "#ffd93b")
            + flat("M26 36 C34 68 62 74 76 56 C60 66 38 58 32 34 Z", "#ffe987", .8)
            + sh("M18 26 L24 34", "#8a6a1e", w=6))


# ---------------------------------------------------------------- utensils

def rollingpin():
    return svg100(
        '<g>'
        + sh("M8 44 L20 44 L20 56 L8 56 Z", "#c08a3e")
        + sh("M80 44 L92 44 L92 56 L80 56 Z", "#c08a3e")
        + sh("M20 36 L80 36 A14 14 0 0 1 80 64 L20 64 A14 14 0 0 1 20 36 Z", "#e8c185")
        + flat("M26 42 L74 42 L74 48 L26 48 Z", "#f7e0bb", .8)
        + '</g>')


def spoon():
    return svg100(
        '<g>'
        + sh("M44 10 A20 24 0 0 1 56 10 L54 46 A10 10 0 0 1 46 46 Z", "#d8dee6")
        + ell(50, 24, 18, 22, "#eef3f7")
        + sh("M46 44 L54 44 L53 90 A4 4 0 0 1 47 90 Z", "#d8dee6")
        + shine(42, 16, 6, 9, -20, .7)
        + '</g>')


def whisk():
    wires = "".join(f'<path d="M50 40 C{28 + i * 11} {52 + (i % 2) * 6} {30 + i * 11} 82 50 88" '
                    f'fill="none" stroke="#c3cdd8" stroke-width="4" stroke-linecap="round"/>'
                    for i in range(5))
    return svg100('<g>' + wires
                  + sh("M44 8 L56 8 L55 42 L45 42 Z", "#6b7784")
                  + flat("M46 12 L50 12 L49 40 L47 40 Z", "#9aa5b1", .8)
                  + '</g>')


def knife():
    return svg100(
        '<g>'
        + sh("M30 12 L46 12 L46 58 L38 66 L30 58 Z", "#dde4ec")
        + flat("M34 16 L38 16 L38 56 L34 56 Z", "#f4f8fb", .9)
        + sh("M32 58 L44 58 L43 90 A5 5 0 0 1 33 90 Z", "#6b4a32")
        + '</g>')


def spatula():
    return svg100(
        '<g>'
        + sh("M24 8 L76 8 A8 8 0 0 1 76 40 L24 40 A8 8 0 0 1 24 8 Z", "#8f9aa6")
        + "".join(f'<path d="M{34 + i * 12} 14 L{34 + i * 12} 34" stroke="{INK}" '
                  f'stroke-width="2.6" opacity=".45"/>' for i in range(4))
        + sh("M44 40 L56 40 L55 92 A5 5 0 0 1 45 92 Z", "#e8503a")
        + '</g>')


# ---------------------------------------------------------------- recipe icons

def icon_cafe():
    """The cafe badge — a mug, in place of the coffee emoji."""
    return svg100(
        sh("M18 30 L70 30 L66 74 A14 14 0 0 1 52 86 L36 86 A14 14 0 0 1 22 74 Z", "#fff")
        + flat("M26 38 L62 38 L59 72 A8 8 0 0 1 51 79 L37 79 A8 8 0 0 1 29 72 Z", "#c9772f")
        + sh("M70 40 A15 15 0 0 1 70 66", "#fff")
        + shine(32, 44, 5, 9, -12, .6))


def icon_lock():
    """Shown on a recipe she has not reached yet."""
    return svg100(
        sh("M34 46 L34 34 A16 16 0 0 1 66 34 L66 46", "#9aa5b1", w=9)
        + sh("M24 46 L76 46 A8 8 0 0 1 84 54 L84 82 A8 8 0 0 1 76 90 L24 90 "
             "A8 8 0 0 1 16 82 L16 54 A8 8 0 0 1 24 46 Z", "#c3cdd8")
        + circ(50, 68, 8, "#7c8894", w=3))


def icon_star():
    return svg100(
        sh("M50 8 L62 38 L94 40 L69 60 L78 92 L50 74 L22 92 L31 60 L6 40 L38 38 Z", "#ffc400")
        + flat("M50 18 L59 42 L84 43 L64 59 L50 50 Z", "#ffe27a", .7))


def icon_pizza():
    tops = "".join(circ(x, y, 7, "#cc3b2c", w=3) for x, y in
                   ((36, 38), (63, 36), (50, 56), (33, 62), (66, 62)))
    return svg100(circ(50, 52, 42, "#e8c27a") + flat_ell(50, 52, 34, 34, "#d24a32")
                  + tops + shine(32, 30, 10, 6))


def icon_cupcakes():
    return svg100(cupcake())


def icon_sandwich():
    return svg100(sandwich())


def icon_smoothie():
    return svg100(cup())


def icon_pancakes():
    return svg100(pancake())


ITEMS = {
    "scoop": scoop, "egg": egg, "pepperoni": pepperoni, "cherry": cherry, "case": case_,
    "bread": bread, "ham": ham, "strawberry": strawberry, "berry": berry, "cup": cup,
    "slice": slice_, "cupcake": cupcake, "sandwich": sandwich, "pancake": pancake,
    "tomato": tomato, "cheese": cheese, "mushroom": mushroom, "olive": olive, "basil": basil,
    "butter": butter, "lettuce": lettuce, "sprinkle": sprinkle, "banana": banana,
}

WHOLE = {  # already complete <svg> documents
    "rollingpin": rollingpin, "spoon": spoon, "whisk": whisk, "knife": knife, "spatula": spatula,
    "icon-pizza": icon_pizza, "icon-cupcakes": icon_cupcakes, "icon-sandwich": icon_sandwich,
    "icon-smoothie": icon_smoothie, "icon-pancakes": icon_pancakes,
    "icon-cafe": icon_cafe, "icon-lock": icon_lock, "icon-star": icon_star,
}


# ---------------------------------------------------------------- vessels
# 200x140, inlined into js/vessels.js so their parts can be animated.

def v_bowl():
    return (part("v-contents", "", 100, 96)
            + sh("M10 48 A90 80 0 0 0 190 48 Z", "#dfe7ee", WV)
            + flat("M26 62 A74 62 0 0 0 174 62 Z", "#cdd8e2", .55)
            + ell(100, 48, 90, 17, "#eef3f7", WV)
            + flat_ell(100, 48, 74, 11, "#b9c6d2")
            + flat_ell(58, 84, 16, 9, "#fff", .35, -30))


def v_dough():
    return (part("v-blob",
                 ell(100, 74, 84, 50, "#f0d9a8", WV)
                 + flat_ell(100, 70, 70, 38, "#f9ebcd")
                 + flat_ell(66, 54, 18, 9, "#fff", .45, -25),
                 100, 74))


def v_pizza():
    tops = "".join(circ(x, y, 10, "#cc3b2c", WV) for x, y in
                   ((72, 48), (126, 46), (100, 78), (66, 90), (134, 90)))
    return (circ(100, 70, 66, "#e8c27a", WV)
            + flat_ell(100, 70, 54, 54, "#d24a32")
            + part("v-tops", tops)
            + flat_ell(70, 36, 14, 8, "#fff", .3, -30))


def v_oven():
    return (sh("M12 8 L188 8 A14 14 0 0 1 188 132 L12 132 A14 14 0 0 1 12 8 Z", "#96a1ad", WV)
            + sh("M30 34 L170 34 A10 10 0 0 1 170 118 L30 118 A10 10 0 0 1 30 34 Z", "#33414f", WV)
            + part("v-glow", flat("M40 42 L160 42 A8 8 0 0 1 160 110 L40 110 A8 8 0 0 1 40 42 Z", "#ffb34d"), 100, 76)
            # A pizza on a tray, seen from a low angle. Drawn as flat ellipses: an
            # upright dome read as a red archway.
            + part("v-food",
                   sh("M54 94 L146 94 A6 6 0 0 1 146 106 L54 106 A6 6 0 0 1 54 94 Z", "#8f7a5e", WV)
                   + ell(100, 88, 42, 15, "#e8c27a", WV)
                   + flat_ell(100, 87, 33, 10, "#d24a32")
                   + "".join(dot(x, y, 4, "#a8331f")
                             for x, y in ((86, 84), (112, 85), (100, 92), (74, 90))),
                   100, 100)
            + part("v-heat",
                   "".join(f'<path d="M{56 + i * 30} 52 q6 -8 12 0 q6 8 12 0" fill="none" '
                           f'stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".5"/>'
                           for i in range(3)), 100, 52)
            + part("v-light", circ(176, 20, 7, "#5de07a", WV), 176, 20)
            + '<path d="M22 126 L178 126" stroke="#7d8894" stroke-width="5" stroke-linecap="round"/>')


def v_blender():
    return (sh("M56 6 L144 6 L132 100 A12 12 0 0 1 120 110 L80 110 A12 12 0 0 1 68 100 Z", "#dff0ff", WV)
            # The liquid lives INSIDE v-contents so the stylesheet can churn it while
            # the blender runs. An empty group here was the reason it never moved.
            + part("v-contents",
                   flat("M62 46 L138 46 L130 98 A10 10 0 0 1 120 106 L80 106 A10 10 0 0 1 70 98 Z", "#c77ce8", .95)
                   + flat("M68 52 L132 52 L130 62 L70 62 Z", "#dba6f0", .8),
                   100, 76)
            + flat("M64 12 L72 12 L66 96 L60 96 Z", "#fff", .4)
            + part("v-lid", sh("M52 0 L148 0 L146 14 L54 14 Z", "#8f9aa6", WV), 100, 8)
            + sh("M54 110 L146 110 A10 10 0 0 1 146 136 L54 136 A10 10 0 0 1 54 110 Z", "#6b7784", WV)
            + circ(100, 123, 8, "#e8503a", WV))


def v_plate():
    return (ell(100, 74, 92, 50, "#e3eaf0", WV)
            + flat_ell(100, 72, 70, 36, "#fbfdff")
            + flat_ell(62, 50, 18, 8, "#fff", .5, -25))


def v_tray():
    cups = "".join(circ(24.8 + 37.6 * i, 44 + 52 * j, 16, "#7c8894", WV)
                   for j in range(2) for i in range(5))
    return (sh("M6 18 L194 18 A12 12 0 0 1 194 122 L6 122 A12 12 0 0 1 6 18 Z", "#9aa5b1", WV)
            + cups)


def v_pan():
    return ('<path d="M168 76 L196 70" stroke="#3a2e2e" stroke-width="14" stroke-linecap="round"/>'
            + ell(94, 78, 84, 46, "#4a5560", WV)
            + flat_ell(94, 74, 70, 37, "#2f3840")
            + flat_ell(60, 56, 16, 7, "#fff", .18, -25))


VESSELS = {
    "bowl": v_bowl, "dough": v_dough, "pizza": v_pizza, "oven": v_oven,
    "blender": v_blender, "plate": v_plate, "tray": v_tray, "pan": v_pan,
}


def main():
    ART.mkdir(parents=True, exist_ok=True)
    for name, fn in ITEMS.items():
        (ART / f"{name}.svg").write_text(svg100(fn()), encoding="utf-8")
    for name, fn in WHOLE.items():
        (ART / f"{name}.svg").write_text(fn(), encoding="utf-8")
    print(f"  {len(ITEMS) + len(WHOLE)} files in assets/art/")

    built = {k: f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140">{fn()}</svg>'
             for k, fn in VESSELS.items()}
    body = "\n".join(f"  {json.dumps(k)}: {json.dumps(v)}," for k, v in built.items())
    VESSELS_JS.write_text(
        "// Vessels, appliances and their animatable parts.\n"
        "// AUTO-GENERATED by tools/build_art.py — do not hand-edit.\n"
        "//\n"
        "// Inlined rather than loaded as <img> because their insides move: contents\n"
        "// swirl, a door glows, dough spreads under the pin. Only one is ever on screen,\n"
        "// so the node count is affordable. Parts are tagged v-* and driven from\n"
        "// css/style.css. Everything that repeats is an <img> from assets/art/ instead.\n"
        "const VESSELS = {\n" + body + "\n};\n", encoding="utf-8")
    print(f"  {len(built)} vessels in js/vessels.js")


if __name__ == "__main__":
    main()
