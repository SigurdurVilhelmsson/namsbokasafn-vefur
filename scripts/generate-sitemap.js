#!/usr/bin/env node

/**
 * Generate sitemap.xml from toc.json
 *
 * Reads the table of contents for each book and generates a sitemap
 * with all known routes. Run after syncing content or adding new routes.
 *
 * Usage: node scripts/generate-sitemap.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://namsbokasafn.is';
const CONTENT_DIR = 'static/content';
const OUTPUT_FILE = 'static/sitemap.xml';

/** Static pages that don't depend on content */
const STATIC_PAGES = [
  '/',
  '/feedback',
  '/for-teachers'
];

/** Per-book tool pages (relative to /{bookSlug}) */
const BOOK_PAGES = [
  '',           // book home
  '/ordabok',
  '/minniskort',
  '/lotukerfi',
  '/prof',
  '/greining',
  '/markmid',
  '/bokamerki',
  '/atridiordasskra',
  '/nam',
  '/yfirlit'
];

/**
 * Priority mapping for different page types
 */
function getPriority(url) {
  if (url === `${BASE_URL}/`) return '1.0';
  if (url.match(/\/kafli\/\d+\/\d+-\d+/)) return '0.8';  // numbered sections (main content)
  if (url.match(/\/kafli\/\d+$/)) return '0.7';            // chapter pages
  if (url.match(/\/(ordabok|lotukerfi|prof)$/)) return '0.6'; // key tools
  if (url.match(/\/kafli\/\d+\/\d+-(exercises|summary|key-)/)) return '0.5'; // reference material
  return '0.5';
}

/**
 * Change frequency mapping
 */
function getChangeFreq(url) {
  if (url === `${BASE_URL}/`) return 'weekly';
  if (url.match(/\/kafli\//)) return 'monthly';
  return 'monthly';
}

function generateSitemap() {
  const urls = [];
  const today = new Date().toISOString().split('T')[0];

  // Add static pages
  for (const page of STATIC_PAGES) {
    urls.push(`${BASE_URL}${page}`);
  }

  // Find all books with toc.json
  let books;
  try {
    books = readdirSync(CONTENT_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    console.error(`Content directory not found: ${CONTENT_DIR}`);
    process.exit(1);
  }

  for (const bookSlug of books) {
    const tocPath = join(CONTENT_DIR, bookSlug, 'toc.json');
    let toc;
    try {
      toc = JSON.parse(readFileSync(tocPath, 'utf-8'));
    } catch {
      console.warn(`Skipping ${bookSlug}: no toc.json found`);
      continue;
    }

    // Add book-level pages
    for (const page of BOOK_PAGES) {
      urls.push(`${BASE_URL}/${bookSlug}${page}`);
    }

    // Add chapter and section pages
    for (const chapter of toc.chapters || []) {
      const chapterSlug = String(chapter.number).padStart(2, '0');
      urls.push(`${BASE_URL}/${bookSlug}/kafli/${chapterSlug}`);

      for (const section of chapter.sections || []) {
        const sectionSlug = section.file.replace('.html', '');
        urls.push(`${BASE_URL}/${bookSlug}/kafli/${chapterSlug}/${sectionSlug}`);
      }

      // Answer key page
      urls.push(`${BASE_URL}/${bookSlug}/svarlykill/${chapter.number}`);
    }
  }

  // Build XML
  const xmlUrls = urls.map(url => {
    const priority = getPriority(url);
    const changefreq = getChangeFreq(url);
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>
`;

  writeFileSync(OUTPUT_FILE, xml, 'utf-8');
  console.log(`Generated ${OUTPUT_FILE} with ${urls.length} URLs`);
}

generateSitemap();
