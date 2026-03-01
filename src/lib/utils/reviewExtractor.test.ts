import { describe, it, expect } from 'vitest';
import { extractReviewBlocks } from './reviewExtractor';

const sampleHtml = `
<article class="cnx-module">
<main>
  <div class="learning-objectives">
    <h2>Námsmarkmið</h2>
    <ul><li>Skilgreina atóm</li><li>Lýsa efnafræði</li></ul>
  </div>
  <div class="content-block key-concept">
    <div class="content-block-title">Lykilhugtak</div>
    <div class="content-block-content"><p>Atóm er smæsta eining efnis.</p></div>
  </div>
  <div class="content-block definition">
    <div class="content-block-title">Skilgreining</div>
    <div class="content-block-content"><p><strong>Sameind</strong>: tveggja eða fleiri atóma.</p></div>
  </div>
  <div class="content-block checkpoint">
    <div class="content-block-title">Eftirlitsatriði</div>
    <div class="content-block-content"><p>Hvaða eindir mynda atóm?</p></div>
  </div>
  <div class="content-block note">
    <div class="content-block-content"><p>This note should NOT be extracted.</p></div>
  </div>
</main>
</article>`;

describe('extractReviewBlocks', () => {
	it('should extract the four target block types', () => {
		const blocks = extractReviewBlocks(sampleHtml);
		expect(blocks).toHaveLength(4);
	});

	it('should identify block types correctly', () => {
		const blocks = extractReviewBlocks(sampleHtml);
		const types = blocks.map((b) => b.type);
		expect(types).toEqual(['learning-objectives', 'key-concept', 'definition', 'checkpoint']);
	});

	it('should preserve HTML content of each block', () => {
		const blocks = extractReviewBlocks(sampleHtml);
		const keyConcept = blocks.find((b) => b.type === 'key-concept')!;
		expect(keyConcept.html).toContain('Atóm er smæsta eining efnis');
	});

	it('should not extract note blocks', () => {
		const blocks = extractReviewBlocks(sampleHtml);
		const types = blocks.map((b) => b.type);
		expect(types).not.toContain('note');
	});

	it('should return empty array for HTML with no matching blocks', () => {
		const blocks = extractReviewBlocks('<article><main><p>Just text</p></main></article>');
		expect(blocks).toEqual([]);
	});

	it('should return empty array for empty string', () => {
		const blocks = extractReviewBlocks('');
		expect(blocks).toEqual([]);
	});
});
