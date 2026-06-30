import { describe, it, expect } from 'vitest';
import { htmlToPlainText, escapeHtml } from './html';

describe('escapeHtml', () => {
	it('escapes the five HTML-significant characters', () => {
		expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
			'&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;'
		);
	});
});

describe('htmlToPlainText', () => {
	// Inline math: wrapped in <span class="math-inline"> (NOT class="mathjax…"),
	// so the block-wrapper strip does not catch it. The assistive <math> sibling
	// must still be removed wholesale or its tokens leak into the index.
	const INLINE =
		'<span class="math-inline" data-latex="x=2">' +
		'<mjx-container class="MathJax" jax="SVG"><svg></svg></mjx-container>' +
		'<math class="assistive-mathml" xmlns="http://www.w3.org/1998/Math/MathML">' +
		'<mi>x</mi><mo>=</mo><mn>2</mn></math></span>';

	it('does not leak inline assistive-MathML tokens into indexable text', () => {
		const text = htmlToPlainText(`<p>Vatn ${INLINE} er efni.</p>`);
		expect(text).toContain('Vatn');
		expect(text).toContain('efni');
		expect(text).not.toMatch(/\bx\b/); // MathML variable must not appear
		expect(text).not.toContain('2'); // MathML number must not appear
	});

	it('still strips the block mathjax-display wrapper (no regression)', () => {
		const BLOCK =
			'<span class="mathjax-display" data-latex="E=mc^2">' +
			'<mjx-container><svg></svg></mjx-container>' +
			'<math class="assistive-mathml"><mi>E</mi></math></span>';
		expect(htmlToPlainText(`<p>Orka ${BLOCK} formúla.</p>`)).not.toContain('E');
	});

	// Real efni shape (a11y-2 re-render): assistive class is the first attribute,
	// followed by xmlns / display / style. Guards against attribute-order brittleness.
	it('strips the real efni-rendered inline assistive MathML shape', () => {
		const REAL =
			'<span class="math-inline" data-latex="{{{\\text{F}}_{{\\text{net}}}}}">' +
			'<mjx-container class="MathJax" jax="SVG" overflow="overflow"><svg></svg></mjx-container>' +
			'<math class="assistive-mathml" xmlns="http://www.w3.org/1998/Math/MathML" ' +
			'style="position:absolute;width:1px;height:1px;clip:rect(0,0,0,0);">' +
			'<mi>F</mi></math></span>';
		const text = htmlToPlainText(`<p>Krafturinn ${REAL} er núll.</p>`);
		expect(text).toBe('Krafturinn er núll.');
	});

	it('keeps ordinary prose intact', () => {
		expect(htmlToPlainText('<p>Bara <em>texti</em> hér.</p>')).toBe('Bara texti hér.');
	});
});
