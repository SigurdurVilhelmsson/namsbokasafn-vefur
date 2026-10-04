# Two markup facts vefur now works around (vefur → efni)

**Written:** 2026-10-04 · **vefur:** branch `fix/phone-reader-overlays` (`d6ce301`, `e177e39`) and
`feature/reader-v1.1` (`484e5a3`, `c661046`) · **measured against efni `main` `08014ad4b`**

> **Corrected 2026-10-04.** This note first cited `85b656948`, which is not efni `main`: it was an
> unpushed local commit on the branch the efni checkout had out (`content/c140-c49-recompose-pass`).
> The efni session caught it. The counts were re-measured at `08014ad4b` straight from git's object
> store (`git show 08014ad4b:<file>` over the 251 chemistry `mt-preview` files), and all four match.
> `05-publication/` does not differ between the two commits.

> Measured on 2026-10-04 with the commands shown. Re-derive before relying on a number. Nothing here
> asks for a re-render now: both are worked around in vefur, and neither is urgent. This note is so
> the root causes have an owner and the workarounds have a named exit.

## 1. The assistive MathML copy has no containing block

`tools/lib/mathjax-render.js` (style string around line 40) gives every
`<math class="assistive-mathml">` an inline visually-hidden style:
`position:absolute;width:1px;height:1px;…;overflow:hidden;clip:rect(0,0,0,0)`.

Nothing above it is positioned, so the browser places it against the page itself. It escapes every
overflow container: a sideways-scrolling table or display equation stops containing it, and it sets
the **page's** width. Measured in the vefur reader at a 375px phone width: 5.3 was 795px wide, 3.1
646px and 1.4 515px. Under mobile emulation the layout viewport grew to match, and the paged reader
then budgeted its pages against the inflated height.

Counting unit = `<math class="assistive-mathml">` start tags in chemistry `mt-preview`:

```
D=books/efnafraedi-2e/05-publication/mt-preview/chapters
cat $D/*/*.html | grep -o '<math class="assistive-mathml"' | wc -l                      → 5369
cat $D/*/*.html | grep -o '<math class="assistive-mathml"[^>]*>' | grep -c 'position:absolute'  → 5369
```

Their parents (jsdom over vefur's synced copy): `span.math-inline` 3,756, `span.mathjax-display` 1,546,
a bare `<td>` 67.

**vefur's workaround** (`src/app.css`, MATHJAX STYLES): `position: relative` on `.math-inline`,
`.mathjax-display` and `td:has(> math.assistive-mathml)`. Measured alternatives that do **not** help:
`clip-path: inset(50%)` and `contain: strict` on the `<math>` itself.

**Possible efni-side fix:** make the wrapper the containing block where it is emitted
(`position:relative` on the `.math-inline` / `.mathjax-display` wrapper, and wrap the bare-`<td>`
case), or drop `position:absolute` for an in-flow hiding technique. If efni does this, tell vefur;
the app.css rule can stay as harmless belt-and-braces or go.

## 2. Content images carry no width or height

Counting unit = `<img` tags in chemistry `mt-preview`:

```
cat $D/*/*.html | grep -o '<img[^>]*>' | wc -l                    → 1148
cat $D/*/*.html | grep -o '<img[^>]*>' | grep -c ' width='        → 0
cat $D/*/*.html | grep -o '<img[^>]*>' | grep -c ' height='       → 0
```

They are emitted `loading="lazy"` (`tools/cnxml-render.js`, `tools/lib/cnxml-elements.js`) with no
intrinsic size, so an image that has not loaded takes up no space. For a scrolling reader that is
only layout shift. For reader v1.1's paged mode it decides the page splits: an unloaded figure
measured ~0px, pages were cut around it, and when it loaded they were re-cut under the reader. The
page total changed mid-page ("Síða 4 af 5" → "4 af 7"), and a cross-reference landed on its figure,
then lost it ~100ms later.

**vefur's workaround** (`PagedReaderControls.svelte`, `loadImages()`): in paged mode, make every
content image eager and wait up to 1.5s for them before the first split. Its costs are why this note
exists:

- **Data:** a phone now downloads every image in a section up front. Section 20.1 has 42.
- **Residue:** on slow 3G, images that miss the 1.5s wait still re-split. A `#sub-N-p-M` link can
  then open a different page than on a fast connection, because the page index depends on which
  images had loaded.

**Possible efni-side fix:** emit `width` and `height` (the image's intrinsic pixel size) on content
`<img>`. The browser then reserves the right box before loading, with the existing CSS
`max-width:100%; height:auto` scaling it. vefur could measure the first split as final and go back to
lazy loading. This is the exit for the workaround above.

## Not asking

No re-render is needed for either item, and the chemistry sync hold (2026-09-28) is unaffected.
