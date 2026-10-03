#!/usr/bin/env node

/**
 * Generate sitemap.xml from toc.json
 *
 * Reads the table of contents for each book and generates a sitemap
 * with all known routes. Run after syncing content or adding new routes.
 * The URL list comes from scripts/lib/sitemap.js, which leaves out retired
 * books.
 *
 * Usage: node scripts/generate-sitemap.js
 */

import { writeFileSync } from 'fs';
import { BASE_URL, sitemapUrls } from './lib/sitemap.js';

const CONTENT_DIR = 'static/content';
const OUTPUT_FILE = 'static/sitemap.xml';

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
  const today = new Date().toISOString().split('T')[0];

  let urls;
  try {
    urls = sitemapUrls(CONTENT_DIR);
  } catch {
    console.error(`Content directory not found: ${CONTENT_DIR}`);
    process.exit(1);
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
