import json
import os
import datetime
import urllib.request
import urllib.parse
import urllib.error
import re
import sys
import time
import html as htmllib

# Windows consoles default to cp1252, and article titles contain non-ASCII
# characters (Galápagos, Beyoncé). Force UTF-8 so printing never crashes.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


def _load_env_file(path):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key not in os.environ:
                os.environ[key] = value

_root = os.path.join(os.path.dirname(__file__), "..", "..")
_load_env_file(os.path.join(_root, ".env"))
_load_env_file(os.path.join(_root, ".env.local"))

if "SUPABASE_URL" not in os.environ and "VITE_SUPABASE_URL" in os.environ:
    os.environ["SUPABASE_URL"] = os.environ["VITE_SUPABASE_URL"]

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY  = os.environ["SUPABASE_SERVICE_KEY"]
OPENAI_KEY   = os.environ.get("OPENAI_API_KEY", "")
DAYS_AHEAD   = int(os.environ.get("DAYS_AHEAD", "45"))
DRY_RUN      = os.environ.get("DRY_RUN", "").lower() in ("1", "true", "yes")
# Optional: a JSON file of [{"start_article": ..., "end_article": ...}] to use
# instead of calling OpenAI. Candidates still go through the full validator.
PAIRS_FILE   = os.environ.get("PAIRS_FILE", "")

# Articles already used somewhere in this run. A batch that reuses the same
# target twice in one month reads as lazy, so each article is allowed once.
RUN_ARTICLES = set()

SUPABASE_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

WIKI_API    = "https://en.wikipedia.org/w/api.php"
USER_AGENT  = "WikiRace-PuzzleGenerator/2.0 (https://github.com/Hinriks/WikiRace)"
MAX_RETRIES = 3

# A start article needs enough clickable links to give the player options.
MIN_START_LINKS = 25
# An end article needs enough incoming links that it is findable at all.
MIN_END_INLINKS = 25
# How many pages of incoming links to pull when confirming a route.
MAX_INLINK_PAGES = 4

# Mirrors FORBIDDEN_PREFIXES in src/components/ArticleView.tsx - these links
# are made inert in-game, so they must not count as a route.
FORBIDDEN_PREFIXES = (
    "File:", "Wikipedia:", "Help:", "Category:", "Talk:",
    "User:", "Special:", "Portal:", "Template:", "Draft:",
    "MediaWiki:", "Module:", "Book:", "TimedText:", "MOS:",
)

# Mirrors REMOVED_SECTION_IDS in src/components/ArticleView.tsx - everything
# from the first of these headings onward is stripped before the player sees it.
REMOVED_SECTION_IDS = (
    "External_links", "References", "Notes", "Bibliography",
    "Further_reading", "Footnotes", "Citations",
)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def supabase_get(path):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=SUPABASE_HEADERS,
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def wiki_get(params):
    """GET the MediaWiki API with a params dict. Retries on transient errors."""
    query = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{WIKI_API}?{query}")
    req.add_header("User-Agent", USER_AGENT)

    last_err = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            last_err = e
            time.sleep(1 + attempt)
    raise last_err


# ---------------------------------------------------------------------------
# Stage 1 - title validation (exists / canonical / not a disambiguation page)
# ---------------------------------------------------------------------------

def wiki_check_titles(titles):
    """
    Check up to 50 Wikipedia titles at once.
    Returns a dict of lower-cased title -> {"status": ..., "canonical": ...}
      status: "ok" | "redirect" | "disambiguation" | "missing"
    """
    data = wiki_get({
        "action": "query",
        "prop": "info|pageprops",
        "redirects": 1,
        "format": "json",
        "origin": "*",
        "titles": "|".join(titles),
    })

    query = data.get("query", {})

    redirect_map = {r["from"].lower(): r["to"] for r in query.get("redirects", [])}
    normalise_map = {n["from"].lower(): n["to"] for n in query.get("normalized", [])}

    by_canonical = {}
    for page in query.get("pages", {}).values():
        canonical = page.get("title", "")
        if "missing" in page:
            by_canonical[canonical.lower()] = {"status": "missing", "canonical": None}
        elif "pageprops" in page and "disambiguation" in page["pageprops"]:
            by_canonical[canonical.lower()] = {"status": "disambiguation", "canonical": canonical}
        else:
            by_canonical[canonical.lower()] = {"status": "ok", "canonical": canonical}

    output = {}
    for title in titles:
        key = title.lower()
        if key in redirect_map:
            target = redirect_map[key]
            target_info = by_canonical.get(target.lower(), {"status": "ok", "canonical": target})
            if target_info["status"] == "disambiguation":
                output[key] = {"status": "disambiguation", "canonical": target}
            elif target_info["status"] == "missing":
                output[key] = {"status": "missing", "canonical": None}
            else:
                output[key] = {"status": "redirect", "canonical": target}
        else:
            norm_key = normalise_map.get(key, key)
            output[key] = by_canonical.get(norm_key.lower(), {"status": "missing", "canonical": None})

    return output


def validate_and_fix_titles(pairs):
    """
    Rewrite every title to its canonical form and drop pairs that point at a
    disambiguation page or an article that does not exist.

    This is the check that matters most: GameScreen compares the canonical
    title returned by the parse API against end_article, so storing a redirect
    as the target makes the puzzle mathematically unwinnable.

    Returns (valid_pairs, dropped_count).
    """
    all_titles = list({p["start_article"] for p in pairs} | {p["end_article"] for p in pairs})

    wiki_results = {}
    for i in range(0, len(all_titles), 50):
        batch = all_titles[i : i + 50]
        wiki_results.update(wiki_check_titles(batch))
        if i + 50 < len(all_titles):
            time.sleep(0.4)

    valid = []
    dropped = 0

    for pair in pairs:
        fixed = dict(pair)
        ok = True

        for field in ("start_article", "end_article"):
            title = fixed[field]
            info = wiki_results.get(title.lower(), {"status": "missing", "canonical": None})
            status = info["status"]

            if status == "ok":
                continue
            elif status == "redirect":
                print(f"    [FIX]  '{title}' -> '{info['canonical']}' (was a redirect)")
                fixed[field] = info["canonical"]
            else:
                print(f"    [DROP] '{title}' is a {status} page")
                ok = False
                break

        if ok:
            valid.append(fixed)
        else:
            dropped += 1

    return valid, dropped


# ---------------------------------------------------------------------------
# Stage 2 - solvability (can a player actually click their way there?)
# ---------------------------------------------------------------------------

def ingame_links(title):
    """
    Return the set of article titles a player can actually click on `title`.

    Fetches the article exactly the way useWikiArticle.ts does, then applies
    the same trimming ArticleView.tsx does: cut everything from the first
    References/External links heading onward, and drop namespaced links.
    Using the rendered HTML rather than prop=links matters - links that only
    appear in stripped sections are not clickable in-game.
    """
    data = wiki_get({
        "action": "parse",
        "page": title,
        "format": "json",
        "origin": "*",
        "prop": "text",
        "disableeditsection": 1,
        "redirects": 1,
    })

    if "error" in data:
        return set()

    html = data["parse"]["text"]["*"]

    # Truncate at the first stripped section heading
    cut = len(html)
    for section_id in REMOVED_SECTION_IDS:
        match = re.search(r'id="' + re.escape(section_id) + r'"', html)
        if match and match.start() < cut:
            cut = match.start()
    html = html[:cut]

    links = set()
    for href in re.findall(r'href="/wiki/([^"#]+)"', html):
        try:
            decoded = urllib.parse.unquote(href)
        except Exception:
            decoded = href
        raw = htmllib.unescape(decoded).replace("_", " ")
        if raw.startswith(FORBIDDEN_PREFIXES):
            continue
        links.add(raw)
    return links


def incoming_links(title, max_pages=MAX_INLINK_PAGES):
    """
    Return the set of mainspace article titles that link to `title`, following
    redirects one level (an article linking to 'Sahara Desert' reaches 'Sahara').
    """
    found = set()
    redirects = set()
    cont = None

    for _ in range(max_pages):
        params = {
            "action": "query",
            "prop": "linkshere",
            "titles": title,
            "lhnamespace": 0,
            "lhlimit": 500,
            "format": "json",
            "origin": "*",
        }
        if cont:
            params["lhcontinue"] = cont

        data = wiki_get(params)
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            for entry in page.get("linkshere", []):
                if "redirect" in entry:
                    redirects.add(entry["title"])
                else:
                    found.add(entry["title"])

        cont = data.get("continue", {}).get("lhcontinue")
        if not cont:
            break
        time.sleep(0.2)

    # Expand a handful of redirects so their inbound links count too
    for redirect_title in list(redirects)[:10]:
        data = wiki_get({
            "action": "query",
            "prop": "linkshere",
            "titles": redirect_title,
            "lhnamespace": 0,
            "lhlimit": 500,
            "format": "json",
            "origin": "*",
        })
        for page in data.get("query", {}).get("pages", {}).values():
            for entry in page.get("linkshere", []):
                found.add(entry["title"])
        time.sleep(0.2)

    found |= redirects
    return found


def validate_solvability(pairs):
    """
    Confirm each pair is actually playable. Rejects:
      - start articles with too few clickable links (dead end)
      - end articles almost nothing links to (orphan, unreachable in practice)
      - pairs where the end is linked directly from the start (1 click, trivial)

    Where it can, it proves a concrete 2-click route by intersecting the
    start's clickable links with the end's inbound links. When no short route
    is proven it falls back to the connectivity thresholds rather than
    rejecting, since the API caps how much of the link graph we can see.

    Returns (valid_pairs, dropped_count).
    """
    valid = []
    dropped = 0

    for pair in pairs:
        start = pair["start_article"]
        end = pair["end_article"]

        try:
            out_links = ingame_links(start)
        except Exception as e:
            print(f"    [DROP] could not load '{start}': {e}")
            dropped += 1
            continue

        if len(out_links) < MIN_START_LINKS:
            print(f"    [DROP] '{start}' has only {len(out_links)} clickable links (dead end)")
            dropped += 1
            continue

        lowered = {link.lower() for link in out_links}
        if end.lower() in lowered:
            print(f"    [DROP] '{start}' links straight to '{end}' (1 click, too easy)")
            dropped += 1
            continue

        time.sleep(0.2)

        try:
            in_links = incoming_links(end)
        except Exception as e:
            print(f"    [DROP] could not load inbound links for '{end}': {e}")
            dropped += 1
            continue

        if len(in_links) < MIN_END_INLINKS:
            print(f"    [DROP] '{end}' has only {len(in_links)} inbound links (orphan)")
            dropped += 1
            continue

        bridges = lowered & {link.lower() for link in in_links}
        if bridges:
            example = sorted(bridges)[0]
            print(f"    [OK]   {start} -> {end}  (route via '{example}', 2 clicks)")
        else:
            print(f"    [OK]   {start} -> {end}  ({len(out_links)} out / {len(in_links)} in, 3+ clicks)")

        valid.append(pair)
        time.sleep(0.2)

    return valid, dropped


def full_validate(pairs):
    """Run both validation stages. Returns (valid_pairs, dropped_count)."""
    print(f"  Stage 1: checking {len(pairs)} pair(s) for redirects and disambiguation pages...")
    pairs, dropped_titles = validate_and_fix_titles(pairs)
    print(f"  Stage 1 result: {len(pairs)} kept, {dropped_titles} dropped")

    if not pairs:
        return [], dropped_titles

    print(f"  Stage 2: confirming {len(pairs)} pair(s) are navigable...")
    pairs, dropped_routes = validate_solvability(pairs)
    print(f"  Stage 2 result: {len(pairs)} kept, {dropped_routes} dropped")

    return pairs, dropped_titles + dropped_routes


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

def accept_pair(pair, used_set, quiet=False):
    """
    Decide whether a candidate pair survives dedupe. Rejects pairs already in
    the database (either direction), self-pairs, and any pair reusing an
    article that has already appeared in this run.
    """
    if not isinstance(pair, dict):
        return False
    if "start_article" not in pair or "end_article" not in pair:
        return False

    start = pair["start_article"]
    end = pair["end_article"]
    key = (start.lower(), end.lower())
    reverse = (key[1], key[0])

    if key[0] == key[1]:
        return False
    if key in used_set or reverse in used_set:
        if not quiet:
            print("    [SKIP] already used: " + start + " -> " + end)
        return False
    if key[0] in RUN_ARTICLES or key[1] in RUN_ARTICLES:
        if not quiet:
            print("    [SKIP] repeats an article in this batch: " + start + " -> " + end)
        return False

    used_set.add(key)
    used_set.add(reverse)
    RUN_ARTICLES.add(key[0])
    RUN_ARTICLES.add(key[1])
    return True


def call_openai(count, used_pairs, used_set):
    """Ask OpenAI for `count` new unique puzzle pairs."""
    used_list_lines = "\n".join(
        f"  - {p['start']} / {p['end']}" for p in used_pairs
    ) or "  (none yet)"

    prompt = (
        "You are generating puzzle pairs for WikiRace, a daily game where players "
        "navigate from a start Wikipedia article to an end article by clicking links.\n\n"
        f"Generate exactly {count} new puzzle pairs.\n\n"
        "RULES:\n"
        "1. Both articles must be real English Wikipedia articles that actually exist.\n"
        "2. Use the EXACT canonical Wikipedia article title. Not a redirect, not an alias.\n"
        "   The game compares the target against the canonical title, so a redirect makes\n"
        "   the puzzle impossible to win. Examples of what NOT to do:\n"
        "     'The Great Wall of China' -> use 'Great Wall of China'\n"
        "     'The Renaissance'         -> use 'Renaissance'\n"
        "     'Sahara Desert'           -> use 'Sahara'\n"
        "     'Shakespeare'             -> use 'William Shakespeare'\n"
        "     'Beethoven'               -> use 'Ludwig van Beethoven'\n"
        "     'Amazon Rainforest'       -> use 'Amazon rainforest'\n"
        "   Note Wikipedia's sentence case: only the first word and proper nouns are\n"
        "   capitalised, and a leading 'The' is almost never part of the title.\n"
        "3. Do NOT use disambiguation pages. 'Cinema', 'Cowboys', 'H2O', 'Mercury' and\n"
        "   'Time travel' style hub pages are not real articles - pick the specific one.\n"
        "4. Do NOT use plural forms where Wikipedia uses the singular ('Cowboy', not 'Cowboys').\n"
        "5. The pair must NOT appear in the already-used list below (either direction).\n"
        "   Also use each article at most ONCE across the whole batch - no article\n"
        "   should show up as the start or the end of two different pairs.\n"
        "6. Pairs should be varied: mix famous people, places, historical events, "
        "scientific concepts, pop culture, nature, etc.\n"
        "7. The start and end should NOT be obviously closely related "
        "(e.g. do not pair France with Paris), and the start must not link directly "
        "to the end. Aim for roughly 3 to 5 clicks of separation.\n"
        "8. Avoid very obscure articles that most people would not recognise. The start "
        "should be a well-developed article with many outgoing links.\n\n"
        "ALREADY USED PAIRS (do not repeat these):\n"
        f"{used_list_lines}\n\n"
        f"Respond with ONLY a JSON array of exactly {count} objects. "
        'Each object must have exactly two keys: "start_article" and "end_article". '
        "No markdown, no explanation, just the raw JSON array.\n\n"
        'Example: [{"start_article": "Pizza", "end_article": "Ancient Egypt"}, ...]'
    )

    body = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.9,
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {OPENAI_KEY}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req) as r:
            resp = json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"OpenAI error {e.code}: {e.read().decode()}", file=sys.stderr)
        return []

    raw = resp["choices"][0]["message"]["content"].strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        pairs = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"Failed to parse OpenAI response: {e}", file=sys.stderr)
        return []

    if not isinstance(pairs, list):
        return []

    clean = []
    for pair in pairs:
        if accept_pair(pair, used_set, quiet=True):
            clean.append(pair)

    return clean


def load_from_file(count, used_set):
    """Read candidate pairs from PAIRS_FILE, applying the same dedupe rules."""
    with open(PAIRS_FILE, encoding="utf-8") as f:
        raw = json.load(f)

    clean = []
    for pair in raw:
        if accept_pair(pair, used_set):
            clean.append(pair)

    return clean


def get_candidates(count, used_pairs, used_set):
    """Source candidate pairs from PAIRS_FILE if set, otherwise from OpenAI."""
    if PAIRS_FILE:
        print()
        print("Reading candidate pairs from " + PAIRS_FILE + "...")
        return load_from_file(count, used_set)
    if not OPENAI_KEY:
        print("No OPENAI_API_KEY and no PAIRS_FILE set - nothing to do.", file=sys.stderr)
        return []
    print()
    print("Asking OpenAI for " + str(count) + " pairs...")
    return call_openai(count, used_pairs, used_set)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # 1. Find the last date already scheduled
    rows = supabase_get("daily_puzzles?select=date&order=date.desc&limit=1")
    if rows:
        last_date = datetime.date.fromisoformat(rows[0]["date"])
    else:
        last_date = datetime.date.today() - datetime.timedelta(days=1)

    start_date = last_date + datetime.timedelta(days=1)
    end_date   = start_date + datetime.timedelta(days=DAYS_AHEAD - 1)
    count      = DAYS_AHEAD

    print(f"Generating {count} puzzles: {start_date} to {end_date}")
    if DRY_RUN:
        print("DRY RUN - nothing will be written to Supabase")

    # 2. Fetch existing pairs for deduplication
    one_year_ago = (datetime.date.today() - datetime.timedelta(days=365)).isoformat()
    used_rows = supabase_get(
        f"daily_puzzles?select=start_article,end_article"
        f"&date=gte.{one_year_ago}&order=date.desc&limit=1000"
    )
    used_pairs = [
        {"start": r["start_article"], "end": r["end_article"]}
        for r in used_rows
    ]
    print(f"Found {len(used_pairs)} existing pairs to avoid")

    used_set = set()
    for p in used_pairs:
        used_set.add((p["start"].lower(), p["end"].lower()))
        used_set.add((p["end"].lower(), p["start"].lower()))

    # 3. Generate and validate, topping up until we have a full batch
    candidates = get_candidates(count, used_pairs, used_set)

    if not candidates:
        print("No pairs generated - exiting.", file=sys.stderr)
        sys.exit(1)

    print(f"\nValidating {len(candidates)} pairs against Wikipedia...")
    valid_pairs, dropped = full_validate(candidates)

    retry = 0
    while len(valid_pairs) < count and retry < MAX_RETRIES:
        retry += 1
        needed = count - len(valid_pairs)
        print(f"\nRetry {retry}/{MAX_RETRIES}: generating {needed} replacement pair(s)...")
        if PAIRS_FILE:
            print("  PAIRS_FILE exhausted - no more candidates to try.")
            break
        replacements = call_openai(needed, used_pairs, used_set)
        if not replacements:
            print("  No replacements generated.")
            break
        new_valid, _ = full_validate(replacements)
        valid_pairs.extend(new_valid)
        print(f"  Batch now at {len(valid_pairs)}/{count}")

    valid_pairs = valid_pairs[:count]

    if len(valid_pairs) < count:
        print(
            f"\nWarning: only {len(valid_pairs)} of {count} slots filled after "
            f"{MAX_RETRIES} retries - inserting what we have."
        )

    if not valid_pairs:
        print("No valid pairs to insert - exiting.", file=sys.stderr)
        sys.exit(1)

    # 4. Assign dates
    puzzles = []
    for i, pair in enumerate(valid_pairs):
        d = start_date + datetime.timedelta(days=i)
        puzzles.append({
            "date": d.isoformat(),
            "start_article": pair["start_article"],
            "end_article": pair["end_article"],
        })

    if DRY_RUN:
        print(f"\nDRY RUN - would insert {len(puzzles)} puzzles:")
        for p in puzzles:
            print(f"  {p['date']}: {p['start_article']} -> {p['end_article']}")
        sys.exit(0)

    # 5. Insert into Supabase
    body = json.dumps(puzzles).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/daily_puzzles",
        data=body,
        method="POST",
        headers={
            **SUPABASE_HEADERS,
            "Prefer": "resolution=ignore-duplicates",
        },
    )

    try:
        with urllib.request.urlopen(req) as r:
            print(f"\nInserted {len(puzzles)} puzzles ({start_date} to {puzzles[-1]['date']})")
            for p in puzzles:
                print(f"  {p['date']}: {p['start_article']} -> {p['end_article']}")
    except urllib.error.HTTPError as e:
        print(f"Supabase insert error {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
