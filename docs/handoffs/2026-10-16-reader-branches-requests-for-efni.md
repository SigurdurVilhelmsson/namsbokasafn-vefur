# Six content requests from the reader-branch review (vefur → efni)

**Written:** 2026-10-16 · **vefur:** `main` `3dbf50b`; reader v1.1 frozen at `dde768e` (tag
`reader-v1.1-port-source`) · **measured against efni `origin/main` `98a5fe2ff` and the ② whole-book
re-inject branch at `48dbbb7a2`**

> **Which trees.** `content/c2-whole-book-reinject` is a local branch in the efni checkout, not on
> origin. Its tip, `bed24f441`, has the same `05-publication/` as `48dbbb7a2`, and the chapter pages in
> vefur's local `static/content/efnafraedi-2e` (synced 2026-10-09) match it file for file. Both trees were read with
> `git archive <sha> books/efnafraedi-2e/05-publication/mt-preview`, never from efni's working tree.
> Where the two agree, one number is given. Measured 2026-10-16 with the commands shown; re-derive
> before relying on a number.

> **What this is.** Content facts found by vefur's review of the reader v1.1 / v1.2 branches
> (2026-10-15; it lands in vefur as `docs/plans/2026-10-15-reader-v1.1-v1.2-review*.md` in a separate
> PR, and the ids in brackets are its register's). They were measured today and do not depend on the
> review's recommendations, which [USER] has not yet ruled on. Each belongs in the renderer or in
> [USER]'s terminology review, so they are asked now, before the ② re-render. vefur adds no
> workaround for any of them, and nothing here changes the chemistry sync hold.

All commands run from an efni checkout root (or a `git archive` of one) with:

```sh
D=books/efnafraedi-2e/05-publication/mt-preview/chapters
export LC_ALL=C.UTF-8   # for grep -P
```

## H1 · Width and height on every content `<img>` [CODE-15]

**Ask:** emit `width` and `height` on every content `<img>`, SVG included, from the renderer.

**Today (both trees):**

```sh
cat $D/*/*.html | grep -o '<img[^>]*>' | wc -l               # 1148
cat $D/*/*.html | grep -o '<img[^>]*>' | grep -c ' width='   # 0
cat $D/*/*.html | grep -o '<img[^>]*>' | grep -c ' height='  # 0
```

**Why:** this re-confirms §2 of vefur's `docs/handoffs/2026-10-04-assistive-mathml-and-image-dimensions-for-efni.md`,
which efni's register logged on 2026-10-04 under "Logged, not fixed" ②. An image with no size takes no
space until it loads, so reader v1.1's paged mode must load every figure in a section before it can
split the pages (the review measured a median of about 1.9 MB per section, preview content).

**It does not reopen §C162** ([USER], 2026-09-19: keep print size for now). The values asked for are
the size each image already displays at, in CSS pixels: for a composed `_IS.svg`, its declared `pt`
size × 4/3 (117pt → 156). No figure changes size; the browser only reserves the box before the image
loads. A `pt` number written into `width` would shrink the figure.

**Done when:** both `grep -c` lines print the same number as the first.

## H2 · Chapter-introduction outlines out of `objectives` [PED-21, PED-07]

**Ask:**

1. Emit an introduction's chapter outline under its own page-data key (efni names it), not
   `objectives`, and stop rendering it under a "Námsmarkmið" heading.
2. Drop the PDF test module ("Eining til að prófa virkni ýmissa atriða til að sjá hvernig þau myndast
   í PDF-skjali") from chapter 1's outline.
3. Add a test that no chapter introduction carries page-data `objectives`.

**Where (at `98a5fe2ff`):** `tools/cnxml-render.js:962` sets `objectives` from the abstract for every
module, though `isIntro` is computed just after, at `:967`; `:1061-1064` renders the same list under
`<h2>Námsmarkmið</h2>`.

**Today:** 20 of 21 introductions carry page-data objectives, 111 items in all, of which **83 (②) / 75
(main)** equal a section title of their own chapter. `prófa virkni` occurs twice in
`01/1-0-introduction.html`, in both trees and on the live site today.

**Why:** vefur's Námsmarkmið panel shows page-data objectives as learning objectives to tick off, so
on introduction pages it offers the chapter's section titles, and on chapter 1 the test module's
title. A ported pre-question (reader v1.2's P1.2) would pose them as questions. Filtering them out in
vefur would be a workaround.

**Re-measure:** the H2 script at the end, and
`grep -o 'prófa virkni' $D/01/1-0-introduction.html | wc -l` (2).

**Done when:** the script prints `0 carry page-data objectives` and the grep prints 0.

## H3 · One form each for four things readers meet many times [PED-05, PED-07, PED-06]

**Ask** (which form wins is for the terminology review, not vefur):

- **One heading for the check-your-learning part that ends each worked example.** The 289 worked
  examples in numbered sections end in 16 different headings: 98 "Kannaðu þekkingu þína", 64
  "Skoðaðu þekkingu þína", 60 "Prófaðu þekkingu þína", 24 "Spyrðu þig", 13 "Prófaðu þig áfram", 7
  "Spyrndu þig", 6 "Sannreyndu þekkingu þína", 5 "Prófaðu þig" and eight more with 1–2 each, one of
  them "Kannaðu þekkingu þína." with a full stop. Both trees.
- **One abbreviation for the atomic mass unit.** After a digit, 13 files use "amu" and 5 use "ame";
  2 use both (§3.2 and the chapter 3 answer key). Both trees.
- **§9.5's two objectives in the form the others use.** "Tilgreindu grundvallarsetningar
  hreyfi-sameindakenningarinnar" and "Notaðu grundvallarsetningar þessarar kenningar til að útskýra
  gaslögmálin" are imperatives; the other 306 module objectives are supine ("Lýst …", "Nefnt …").
- **"Talist upp" in the objectives of §19.2 and §21.5.** The other objectives use the active supine,
  and four of them begin "Talið"; "Talið upp" is a suggestion only.

**Why:** flashcards, cues and a ported pre-question take whichever form the page uses, and a student
meets the check-your-learning heading 289 times.

**Re-measure:** the H3 script at the end, and

```sh
grep -lP '\d[ \x{00A0}]?amu\b' $D/*/*.html | wc -l          # 13
grep -lP '\d[ \x{00A0}]?ame\b' $D/*/*.html | wc -l          # 5
grep -lP '\d[ \x{00A0}]?amu\b' $D/*/*.html | xargs grep -lP '\d[ \x{00A0}]?ame\b'   # 2 files
grep -oE '"(Tilgreindu|Notaðu)[^"]*"' $D/09/9-5-*.html      # the two objectives
grep -c 'Talist upp' $D/19/19-2-*.html $D/21/21-5-*.html    # 2 each: page-data and the list
```

These count files, not occurrences: an occurrence count depends on whether the hidden MathML copy of
each formula is included (the methods tried gave 96, 129 and 177 for "amu").

## H4 · Icelandic for the footnote back-links; no Cyrillic letters [PED-05, CODE-11]

**Ask:**

1. An Icelandic `aria-label` for the footnote back-link. All 36 are English:
   `tools/lib/cnxml-elements.js:689` (at `98a5fe2ff`) emits `aria-label="Back to content"`. The
   wording is efni's.
2. A render-time check for Cyrillic letters that look Latin. There is one word today: "bóрата" in
   §18.3, whose last four letters (р а т а) are Cyrillic.

**Why:** a screen reader announces the English label on an Icelandic page; a word in mixed scripts
is missed by search and is copied as is into a student's flashcard.

**Re-measure (both trees):**

```sh
cat $D/*/*.html | grep -o 'Back to content' | wc -l          # 36
grep -oP '\S*[\x{0400}-\x{04FF}]\S*' $D/*/*.html             # one word, in 18-3-*.html
```

## H5 · The module body without a second `<main>`: design now, merge only after vefur says so [UI-30]

**Ask:** wrap the module body in an element that is not a landmark (efni names it), instead of
`<main>`, with efni's consumers, goldens and CSS contract updated. **Please do not merge it until vefur
confirms** (that confirmation is the review's request H7). vefur must teach its own reader to accept
both forms first.

**Today:** 251 of 251 pages carry their own `<main>` (`tools/cnxml-render.js:1079` at `98a5fe2ff`; the
file writes `<main>` in five more places, at `:3193`, `:3432`, `:3528`, `:3754` and `:4269`). The
reader page already has a `<main>`, so every section page has two main landmarks.

**Why vefur must go first:** reader v1.1's pager looks through the module's `<main>` to find the
blocks it pages (`src/lib/utils/paginate.ts:158-160` at `dde768e`). On vefur `main`, no script selects
the module's `<main>` today, and the one style rule that matches it is a print layout reset in
`src/app.css`, which matches the page's own `<main>` too. vefur will check every consumer again before
it sends H7.

**Re-measure:**

```sh
grep -l '<main[ >]' $D/*/*.html | wc -l   # 251
ls $D/*/*.html | wc -l                    # 251
```

## H6 · Is §1.5's accuracy/precision pair in the terminology review? [PED-05]

**Ask:** confirm that §1.5, and the drift between chapter text, summaries and `glossary.json`, are in
[USER]'s terminology review, with a regression gate that compares each term's rendering with the last
published one. If efni's `docs/terminology-consistency` work already covers it, a pointer is enough.

**Today, chapter 1:**

|                            | live site (2026-10-16)                | efni main `98a5fe2ff`             | ② `48dbbb7a2`                         |
| -------------------------- | ------------------------------------- | --------------------------------- | ------------------------------------- |
| §1.5 title                 | Óvissa í mælingum, hittni og nákvæmni | Mælióvissa, nákvæmni og genkvæmni | Óvissa í mælingum, hittni og nákvæmni |
| `<dfn>` for accuracy       | hittni                                | nákvæmni                          | nákvæmni                              |
| `<dfn>` for precision      | nákvæmni                              | réttvísi                          | réttvísi                              |
| `glossary.json`, accuracy  | hittni                                | hittni                            | nákvæmni                              |
| `glossary.json`, precision | nákvæmni                              | nákvæmni                          | verkleg nákvæmni                      |

The table gives the Icelandic word only: in all three, each `<dfn>` also carries its English gloss, as
in "hittni (e. accuracy)". The live pair is consistent. On efni main, "nákvæmni" is accuracy in the
`<dfn>` and precision in `glossary.json`; on ②, the title pairs "hittni og nákvæmni" as the live site
does while the `<dfn>` calls "nákvæmni" accuracy. On the page that teaches the difference between the
two words, one word stands for both.

**Re-measure (efni trees):**

```sh
grep -o '<h1[^>]*>[^<]*' $D/01/1-5-*.html
grep -ohE '<dfn[^>]*data-en="(accuracy|precision)"[^>]*>[^<]*' $D/01/*.html
python3 -c 'import json,sys; [print(t["english"], "→", t["term"]) for t in json.load(open(sys.argv[1], encoding="utf-8"))["terms"] if (t.get("english") or "").lower() in ("accuracy", "precision")]' books/efnafraedi-2e/05-publication/mt-preview/glossary.json
```

## Not asking

- No re-render for these alone; they can ride the ② re-render.
- The review's later requests (H7–H11) wait for vefur work or [USER]'s rulings and are not asked here.
- vefur's own share of PED-05, `lang="en"` on its `.term-en` gloss span, is vefur's to do.

## Re-measure scripts (Python 3, standard library only)

### H2

```sh
python3 - "$D" <<'PY'
import json, pathlib, re, sys
D = pathlib.Path(sys.argv[1])
def pd(p):
    m = re.search(r'<script[^>]*id="page-data"[^>]*>(.*?)</script>', p.read_text('utf-8'), re.S)
    return json.loads(m.group(1)) if m else {}
module = lambda p: re.match(r'\d+-[1-9]\d*-', p.name)
intros = sorted(p for p in D.glob('*/*.html') if re.match(r'\d+-0-', p.name))
carrying = [(p, pd(p).get('objectives') or []) for p in intros]
carrying = [(p, o) for p, o in carrying if o]
def titles(ch):
    return {pd(q).get('title', '').strip().casefold() for q in ch.glob('*.html') if module(q)}
equal = sum(o.strip().casefold() in titles(p.parent) for p, objs in carrying for o in objs)
print(len(intros), 'introductions;', len(carrying), 'carry page-data objectives;',
      sum(len(o) for _, o in carrying), 'items;', equal, 'equal a section title of their chapter')
PY
```

### H3

```sh
python3 - "$D" <<'PY'
import pathlib, re, sys
from collections import Counter
from html.parser import HTMLParser
class Examples(HTMLParser):
    """Last p.para-title of each top-level aside.example."""
    def __init__(self):
        super().__init__()
        self.asides, self.ex, self.inp, self.buf, self.last = [], None, False, '', Counter()
    def handle_starttag(self, tag, attrs):
        cls = (dict(attrs).get('class') or '').split()
        if tag == 'aside':
            top = 'example' in cls and self.ex is None
            self.asides.append(top)
            if top:
                self.ex = []
        elif tag == 'p' and 'para-title' in cls and self.ex is not None:
            self.inp, self.buf = True, ''
    def handle_endtag(self, tag):
        if tag == 'p' and self.inp:
            self.ex.append(' '.join(self.buf.split()))
            self.inp = False
        elif tag == 'aside' and self.asides and self.asides.pop():
            self.last[self.ex[-1] if self.ex else '(no para-title)'] += 1
            self.ex = None
    def handle_data(self, data):
        if self.inp:
            self.buf += data
p = Examples()
for f in sorted(pathlib.Path(sys.argv[1]).glob('*/*.html')):
    if re.match(r'\d+-[1-9]\d*-', f.name):  # numbered sections only
        p.feed(f.read_text('utf-8'))
print(sum(p.last.values()), 'worked examples;', len(p.last), 'distinct last headings')
for text, n in p.last.most_common():
    print(f'  {n:3d}  {text}')
PY
```
