"""Generate the pre-recorded voice-over clips for Number Kitchen using Microsoft
Edge's free neural text-to-speech (the `edge-tts` package).

Reads the recipes straight out of js/data.js and the per-primitive number limits out
of js/stages.js, so the clip list never drifts out of sync with the game. Writes the
mp3s into assets/voice/ and regenerates js/voice-manifest.js.

Numbers are baked into each prompt clip rather than stitched on at playback, so the
line sounds like a sentence instead of a robot reading a form. That means one clip
per (stage, number) pair — a few hundred in total, which is what --missing is for.

Usage:
    python tools/generate_voice.py                  # everything, from scratch
    python tools/generate_voice.py --missing        # only clips not already on disk
    python tools/generate_voice.py --voice en-GB-LibbyNeural --rate -5%

Run `python -m edge_tts --list-voices` to see other available voices.
"""
import argparse
import asyncio
import re
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "js" / "data.js"
STAGES_JS = ROOT / "js" / "stages.js"
VOICE_DIR = ROOT / "assets" / "voice"
MANIFEST_JS = ROOT / "js" / "voice-manifest.js"

WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
         "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
         "sixteen", "seventeen", "eighteen", "nineteen", "twenty"]

RECIPE_RE = re.compile(r"^\s*id:\s*'(\w+)',\s*name:\s*'([^']+)'")
JS_STR = r"((?:[^'\\]|\\.)*)"   # a single-quoted JS string body, escapes included
CAST_RE = re.compile(r"\{\s*id:\s*'(\w+)',\s*name:\s*'" + JS_STR + r"',\s*color:\s*'[^']*',\s*job:\s*'" + JS_STR + r"'")
STAGE_RE = re.compile(r"\{\s*id:\s*'(\w+)',\s*primitive:\s*'([\w-]+)'.*?say:\s*'" + JS_STR + r"'")
LIMIT_RE = re.compile(r"'([\w-]+)':\s*\{\s*min:\s*(\d+),\s*max:\s*(\d+)\s*\}")


def load_limits():
    """Per-primitive number ranges (the LIMITS table in js/stages.js)."""
    text = STAGES_JS.read_text(encoding="utf-8")
    block = text.split("const LIMITS = {", 1)[1].split("};", 1)[0]
    return {m[0]: (int(m[1]), int(m[2])) for m in LIMIT_RE.findall(block)}


def unescape(s):
    """Turn a JS string body back into plain text (\\' -> ')."""
    return re.sub(r"\\(.)", r"\1", s)


def load_cast():
    """The townsfolk (CAST in js/data.js), for the lines the café speaks."""
    text = DATA_JS.read_text(encoding="utf-8")
    block = text.split("const CAST = [", 1)[1].split("\n];", 1)[0]
    return [{"id": m[0], "name": unescape(m[1]), "job": unescape(m[2])}
            for m in CAST_RE.findall(block)]


def load_recipes():
    """Recipes and their stages, in order, straight out of js/data.js."""
    text = DATA_JS.read_text(encoding="utf-8")
    block = text.split("const RECIPES = [", 1)[1].split("\n];", 1)[0]
    recipes, cur = [], None
    for line in block.splitlines():
        m = RECIPE_RE.match(line)
        if m:
            cur = {"id": m.group(1), "name": m.group(2), "stages": []}
            recipes.append(cur)
            continue
        m = STAGE_RE.search(line)
        if m and cur:
            cur["stages"].append({"id": m.group(1), "primitive": m.group(2), "say": unescape(m.group(3))})
    if not recipes:
        print("warning: parsed no recipes from js/data.js", file=sys.stderr)
    return recipes


def build_lines():
    """Every line the game can speak, as {key: text}."""
    lines = {}
    limits = load_limits()
    recipes = load_recipes()

    # Bare numbers: the count-along every counting primitive uses.
    for n in range(0, 21):
        lines[f"n-{n}"] = WORDS[n]
        if n:
            lines[f"done-{n}"] = f"{WORDS[n]}! Well done!"

    # One clip per stage per number it can actually ask for.
    for r in recipes:
        lines[f"served-{r['id']}"] = f"{r['name']}! It's ready!"
        lines[f"dish-{r['id']}"] = r["name"]
        for st in r["stages"]:
            lo, hi = limits.get(st["primitive"], (1, 20))
            for n in range(lo, hi + 1):
                lines[f"{r['id']}-{st['id']}-{n}"] = st["say"].replace("{n}", WORDS[n])

    # A locked recipe says what's needed instead of doing nothing.
    for i, r in enumerate(recipes):
        if i:
            lines[f"locked-{r['id']}"] = f"Cook the {recipes[i - 1]['name']} first!"

    # Tapping someone in the café introduces them.
    for c in load_cast():
        lines[f"who-{c['id']}"] = f"{c['name']}, {c['job']}!"

    lines["welcome"] = "Welcome to Number Kitchen! Pick a recipe!"
    return lines


async def synth(key, text, voice, rate, missing_only):
    out = VOICE_DIR / f"{key}.mp3"
    if missing_only and out.exists() and out.stat().st_size > 0:
        return False
    await edge_tts.Communicate(text, voice, rate=rate).save(str(out))
    return True


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="en-GB-SoniaNeural")
    ap.add_argument("--rate", default="-5%")
    ap.add_argument("--missing", action="store_true", help="only generate clips not already on disk")
    ap.add_argument("--only", default="", help="comma-separated key prefixes, e.g. pizza,n-")
    args = ap.parse_args()

    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    lines = build_lines()
    if args.only:
        prefixes = tuple(p.strip() for p in args.only.split(",") if p.strip())
        lines = {k: v for k, v in lines.items() if k.startswith(prefixes)}

    made = 0
    for i, (key, text) in enumerate(sorted(lines.items()), 1):
        if await synth(key, text, args.voice, args.rate, args.missing):
            made += 1
        if i % 25 == 0:
            print(f"  {i}/{len(lines)}…", flush=True)

    # The manifest only ever lists clips that are really on disk, so a missing file
    # falls back to browser text-to-speech rather than playing silence.
    on_disk = {k: f"assets/voice/{k}.mp3" for k in sorted(lines) if (VOICE_DIR / f"{k}.mp3").exists()}
    body = "\n".join(f"  {k!r}: {v!r}," for k, v in on_disk.items()).replace("'", '"')
    MANIFEST_JS.write_text(
        "// key → mp3 lookup for the recorded voice lines.\n"
        "// AUTO-GENERATED by tools/generate_voice.py — do not hand-edit.\n"
        "window.VOICE_MANIFEST = {\n" + body + "\n};\n",
        encoding="utf-8")

    absent = [k for k in lines if k not in on_disk]
    print(f"{made} new clip(s); manifest lists {len(on_disk)} of {len(lines)}.")
    if absent:
        print(f"warning: {len(absent)} line(s) will fall back to browser TTS: "
              f"{', '.join(absent[:8])}{'…' if len(absent) > 8 else ''}", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(main())
