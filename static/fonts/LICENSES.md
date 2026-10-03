# Bundled font licences

The font binaries in this repository are **third-party works**. They are not
covered by the repository's MIT licence (which scopes itself to "TypeScript,
JavaScript, CSS, and configuration files").

| Font                | Where                                     | Licence                                 | Upstream                                     |
| ------------------- | ----------------------------------------- | --------------------------------------- | -------------------------------------------- |
| Bricolage Grotesque | `static/fonts/BricolageGrotesque-*.woff2` | [OFL-1.1](OFL.txt)                      | https://github.com/ateliertriay/bricolage    |
| Literata            | `static/fonts/Literata-*.woff2`           | [OFL-1.1](OFL.txt)                      | https://github.com/googlefonts/literata      |
| JetBrains Mono      | `static/fonts/JetBrainsMono-*.woff2`      | [OFL-1.1](OFL.txt)                      | https://github.com/JetBrains/JetBrainsMono   |
| OpenDyslexic        | `static/fonts/OpenDyslexic-*.woff`        | [OFL-1.1](OFL.txt) — Reserved Font Name | https://github.com/antijingoist/opendyslexic |

Licence identifiers were verified against each upstream repository, not assumed.

> **Removed 2026-08-22:** KaTeX's 60 font files and `LICENSE-KaTeX.txt` lived under
> `static/assets/fonts/`. Nothing referenced them — this site renders maths as
> pre-rendered MathJax SVG, which needs no font files — yet they shipped in every build
> and occupied 40 entries of the service-worker precache. A browser probe over four
> pages (including a 46-equation section) recorded **0** requests for them against a
> control of 10 real font requests. Removing them ends the MIT obligation with them.
> They are in git history if a future KaTeX renderer needs them back.

## Obligations

- **OFL-1.1** requires that the licence text accompany the fonts wherever they
  are redistributed. That is why [`OFL.txt`](OFL.txt) sits next to the files and
  is served at `/fonts/OFL.txt` on the deployed site. Do not remove it, and do
  not add fonts here without adding their copyright line to it.
- **OpenDyslexic** carries the Reserved Font Name "OpenDyslexic" — see the note
  in [`OFL.txt`](OFL.txt) before modifying or re-subsetting it.

## Adding a font

1. Check the upstream licence (`gh api repos/<owner>/<repo> --jq .license.spdx_id`).
2. If OFL: append its copyright line to `OFL.txt` and add a row above.
3. If another licence: add its full text next to the files and link it here.
4. Never add a font whose licence you have not read.
