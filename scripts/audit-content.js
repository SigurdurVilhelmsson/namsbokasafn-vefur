#!/usr/bin/env node
/**
 * Audit static/content/**.html for known defect patterns.
 *
 * Output: machine-readable inventory to stdout (Markdown).
 * Exit code is always 0 — this is an inventory tool, not a validator.
 *
 * Usage: node scripts/audit-content.js [--book <slug>] [--check <name>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.join(__dirname, '..', 'static', 'content');

const args = process.argv.slice(2);
const bookFilter = args.includes('--book') ? args[args.indexOf('--book') + 1] : null;
const checkFilter = args.includes('--check') ? args[args.indexOf('--check') + 1] : null;

// ===== Defect checks =====

/**
 * Each check: { name, description, scan(html, filePath) -> Array<{evidence: string}> }
 */
const checks = [
  {
    name: 'bullet-equation-displacement',
    description: 'Equations rendered as standalone `<div class="equation">` immediately after `</ul>` when the preceding `<li>` items end with `<br/>` — equations should be inside their respective `<li>`.',
    scan(html) {
      const findings = [];
      // Find each `</ul>` that is immediately followed by an equation div. For each,
      // scan backward to find its matching `<ul>` opener and inspect only that UL's <li>s.
      const closeRe = /<\/ul>\s*<div[^>]*class="[^"]*\bequation\b/g;
      let m;
      while ((m = closeRe.exec(html)) !== null) {
        const ulEndIdx = m.index; // position of </ul>
        // Walk backwards to find the matching <ul> opener, respecting nesting.
        let ulStartIdx = -1;
        const openRe = /<ul\b[^>]*>/g;
        const innerCloseRe = /<\/ul>/g;
        const opens = [...html.slice(0, ulEndIdx).matchAll(openRe)];
        const closes = [...html.slice(0, ulEndIdx).matchAll(innerCloseRe)];
        // Walk opens/closes in reverse to balance
        let bal = 1;
        const events = [
          ...opens.map((o) => ({ pos: o.index, type: 'open' })),
          ...closes.map((c) => ({ pos: c.index, type: 'close' })),
        ].sort((a, b) => b.pos - a.pos);
        for (const ev of events) {
          if (ev.type === 'close') bal++;
          else {
            bal--;
            if (bal === 0) {
              ulStartIdx = ev.pos;
              break;
            }
          }
        }
        if (ulStartIdx < 0) continue;
        const ulText = html.slice(ulStartIdx, ulEndIdx + 5);
        const lis = [...ulText.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)];
        if (lis.length === 0) continue;
        const liEndsBr = lis.filter((li) => /<br\s*\/?\s*>\s*<\/li>$/.test(li[0].trim()));
        if (liEndsBr.length === lis.length) {
          findings.push({
            evidence: `${lis.length} <li> items, all ending with <br/>, followed by a <div class="equation"> — classic 21.2-shape bug.`,
          });
        }
      }
      return findings;
    },
  },
  {
    name: 'unresolved-cnx-placeholders',
    description: 'CNX module references that leaked through unresolved — either `[m68724](m68724)` literal markdown, or `<a href="mXXXXX">mXXXXX</a>` anchors pointing at module ids instead of real pages/figures.',
    scan(html) {
      const findings = [];
      const ids = new Set();
      // Markdown-style unresolved
      for (const m of html.matchAll(/\[(m\d{5})\]\(\1\)/g)) ids.add(m[1]);
      // <a href="mXXXXX">...</a> — href is just a module id, broken
      for (const m of html.matchAll(/<a\b[^>]*href="(m\d{5})"[^>]*>/g)) ids.add(m[1]);
      if (ids.size > 0) {
        findings.push({ evidence: `Unresolved module refs: ${[...ids].join(', ')}` });
      }
      return findings;
    },
  },
  {
    name: 'broken-internal-anchors',
    description: 'Internal `<a href="#anchor">` links whose target id is not present anywhere on the page. Excludes fragments that look like external routing (no `#` or fragments starting with a slash).',
    scan(html) {
      const findings = [];
      const hrefRe = /<a\b[^>]*href="#([^"]+)"/g;
      const anchors = [];
      let m;
      while ((m = hrefRe.exec(html)) !== null) anchors.push(m[1]);
      if (anchors.length === 0) return findings;
      const unique = [...new Set(anchors)];
      const missing = unique.filter((id) => {
        if (!id || id.startsWith('/')) return false;
        // Look for id="..." or name="..." matching this fragment
        const idRe = new RegExp(`(?:id|name)="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
        return !idRe.test(html);
      });
      if (missing.length > 0) {
        findings.push({ evidence: `${missing.length} missing anchor(s): ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ', …' : ''}` });
      }
      return findings;
    },
  },
  {
    name: 'img-missing-alt',
    description: 'Content `<img>` elements without alt attribute or with empty alt (not inside math-inline/mjx-container, which legitimately lack alt).',
    scan(html) {
      const findings = [];
      // strip mjx-container regions
      const stripped = html.replace(/<mjx-container[\s\S]*?<\/mjx-container>/g, '');
      const re = /<img\b([^>]*)>/g;
      let count = 0;
      let m;
      while ((m = re.exec(stripped)) !== null) {
        const attrs = m[1];
        const altMatch = /\balt="([^"]*)"/.exec(attrs);
        if (!altMatch || altMatch[1].trim() === '') count++;
      }
      if (count > 0) findings.push({ evidence: `${count} <img> without non-empty alt text` });
      return findings;
    },
  },
  {
    name: 'img-alt-still-english',
    description: 'Content `<img>` alt text still contains English (3+ consecutive ASCII-only letter words). Icelandic body has non-ASCII chars (áéíóúýþðæö), so long ASCII-only alt text is a translation miss.',
    scan(html) {
      const findings = [];
      const stripped = html.replace(/<mjx-container[\s\S]*?<\/mjx-container>/g, '');
      const re = /<img\b[^>]*\balt="([^"]+)"/g;
      let count = 0;
      let m;
      while ((m = re.exec(stripped)) !== null) {
        const alt = m[1];
        if (alt.length < 30) continue; // short alts are mostly fine (e.g. "CO2")
        // Icelandic-specific chars
        if (/[áéíóúýþðæöÁÉÍÓÚÝÞÐÆÖ]/.test(alt)) continue;
        // Needs at least 3 ASCII word-characters
        const words = alt.match(/[A-Za-z]{2,}/g) || [];
        if (words.length >= 3) count++;
      }
      if (count > 0) findings.push({ evidence: `${count} <img> with likely-English alt (≥30 chars, no Icelandic letters)` });
      return findings;
    },
  },
  {
    name: 'duplicate-example-numbers',
    description: 'Numbered example HEADINGS ("Dæmi N.M" appearing inside `<p class="example-label">` or `data-example-number`) that repeat on the same page. Cross-references and `<a>` tags are ignored.',
    scan(html) {
      const findings = [];
      const counts = new Map();
      // Match only inside example-label paragraphs
      for (const m of html.matchAll(/<p\s+class="example-label"[^>]*>\s*Dæmi\s+(\d+\.\d+)\b/g)) {
        counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
      }
      // Also match data-example-number attribute — this is the example container id
      for (const m of html.matchAll(/data-example-number="(\d+\.\d+)"/g)) {
        counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
      }
      // Deduplicate: each example has both a data-example-number and an example-label, so divide
      const actualCounts = new Map();
      for (const [k, v] of counts) actualCounts.set(k, Math.ceil(v / 2));
      const dupes = [...actualCounts.entries()].filter(([, n]) => n > 1);
      if (dupes.length > 0) {
        findings.push({
          evidence: `Duplicate example numbers: ${dupes.map(([num, n]) => `${num}×${n}`).join(', ')}`,
        });
      }
      return findings;
    },
  },
  {
    name: 'table-rendered-as-image',
    description: 'A `<figure>` whose caption mentions "Tafla" (table) but whose content is an image, not a real `<table>`.',
    scan(html) {
      const findings = [];
      const re = /<figure\b[^>]*>([\s\S]*?)<\/figure>/g;
      let count = 0;
      let m;
      while ((m = re.exec(html)) !== null) {
        const inner = m[1];
        const hasImg = /<img\b/.test(inner);
        const hasTable = /<table\b/.test(inner);
        const capMatch = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/.exec(inner);
        const caption = capMatch ? capMatch[1] : '';
        if (hasImg && !hasTable && /\bTafla\b/i.test(caption)) count++;
      }
      if (count > 0) findings.push({ evidence: `${count} figure(s) captioned "Tafla" rendered as image` });
      return findings;
    },
  },
  {
    name: 'stray-english-in-prose',
    description: 'Runs of ASCII-only words in `<p>` prose that contain ≥2 English stopwords (the, of, and, in, for, is, was, to, that, by, with, on, as, are, from, an, a, be, this, it). Ignores `(e. …)` glossary glosses and math spans. Requires Title-Case runs or English stopwords so Icelandic ASCII-only strings don\'t trigger.',
    scan(html) {
      const STOPWORDS = new Set([
        'the', 'of', 'and', 'in', 'for', 'is', 'was', 'to', 'that', 'by',
        'with', 'on', 'as', 'are', 'from', 'an', 'be', 'this', 'it', 'at',
        'which', 'or', 'not', 'but', 'have', 'has', 'had', 'been', 'were',
      ]);
      const findings = [];
      const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
      const examples = new Set();
      let m;
      while ((m = pRe.exec(html)) !== null) {
        let text = m[1];
        text = text.replace(/<mjx-container[\s\S]*?<\/mjx-container>/g, '');
        text = text.replace(/<span\s+class="math-inline"[\s\S]*?<\/span>/g, '');
        text = text.replace(/<[^>]+>/g, ' ');
        text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
        text = text.replace(/\(\s*e\.\s+[^)]*\)/g, ' ');

        // Candidate: run of 4+ ASCII alpha words (with allowed apostrophe) separated by spaces
        const run = /(?:\b[A-Za-z][A-Za-z']{1,}\b[\s\\-]+){3,}\b[A-Za-z][A-Za-z']{1,}\b/g;
        let rm;
        while ((rm = run.exec(text)) !== null) {
          const snippet = rm[0].trim();
          if (snippet.length < 20) continue;
          const words = snippet.toLowerCase().split(/[\s-]+/);
          const stopCount = words.filter((w) => STOPWORDS.has(w)).length;
          const titleCaseWords = snippet.split(/[\s-]+/).filter((w) => /^[A-Z][a-z]+$/.test(w));
          // Flag if: has 2+ stopwords, OR is a run of 3+ TitleCase proper nouns
          if (stopCount >= 2 || titleCaseWords.length >= 3) {
            examples.add(snippet.slice(0, 80));
          }
          if (examples.size >= 4) break;
        }
      }
      if (examples.size > 0) {
        findings.push({ evidence: [...examples].map((s) => `"${s}${s.length === 80 ? '…' : ''}"`).join('; ') });
      }
      return findings;
    },
  },
  {
    name: 'avogadro-exponent-dropped',
    description: 'Heuristic: Avogadro\'s number rendered as "6,022" immediately followed by "10" and digits without a "×" or multiplication sign in between.',
    scan(html) {
      const findings = [];
      // Strip math/mjx
      const stripped = html.replace(/<mjx-container[\s\S]*?<\/mjx-container>/g, '').replace(/<[^>]+>/g, ' ');
      const re = /6[,.]022\s+10\d{1,3}/g;
      const hits = stripped.match(re);
      if (hits && hits.length > 0) findings.push({ evidence: `${hits.length} hit(s): e.g. "${hits[0]}"` });
      return findings;
    },
  },
];

// ===== Runner =====

function listHtmlFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listHtmlFiles(full));
    else if (e.isFile() && e.name.endsWith('.html') && !e.name.includes('.backup.')) out.push(full);
  }
  return out;
}

function relPath(p) {
  return path.relative(CONTENT_ROOT, p);
}

function run() {
  const books = fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((b) => !bookFilter || b === bookFilter);

  const results = new Map(); // checkName -> Map<book, Array<{file, evidence}>>
  for (const check of checks) {
    if (checkFilter && check.name !== checkFilter) continue;
    results.set(check.name, new Map());
  }

  let totalFiles = 0;
  for (const book of books) {
    const files = listHtmlFiles(path.join(CONTENT_ROOT, book));
    totalFiles += files.length;
    for (const file of files) {
      const html = fs.readFileSync(file, 'utf8');
      for (const check of checks) {
        if (checkFilter && check.name !== checkFilter) continue;
        const findings = check.scan(html, file);
        if (findings.length > 0) {
          const perBook = results.get(check.name);
          if (!perBook.has(book)) perBook.set(book, []);
          for (const f of findings) perBook.get(book).push({ file: relPath(file), evidence: f.evidence });
        }
      }
    }
  }

  // ===== Markdown output =====
  const lines = [];
  lines.push(`# Content audit inventory`);
  lines.push('');
  lines.push(`- Scanned: ${books.length} book(s), ${totalFiles} HTML files`);
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push('');

  for (const check of checks) {
    if (checkFilter && check.name !== checkFilter) continue;
    const perBook = results.get(check.name);
    const total = [...perBook.values()].reduce((s, a) => s + a.length, 0);
    lines.push(`## ${check.name} — ${total} finding(s)`);
    lines.push('');
    lines.push(`> ${check.description}`);
    lines.push('');
    if (total === 0) {
      lines.push(`_No findings._`);
      lines.push('');
      continue;
    }
    for (const [book, entries] of perBook) {
      lines.push(`### ${book} (${entries.length})`);
      lines.push('');
      for (const e of entries) {
        lines.push(`- \`${e.file}\` — ${e.evidence}`);
      }
      lines.push('');
    }
  }

  process.stdout.write(lines.join('\n'));
}

run();
