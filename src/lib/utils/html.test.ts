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

	// The search index is built from raw published HTML, so an English term only
	// reaches it as text. The inline "(e. …)" gloss is text and survives; data-en
	// is an attribute and is discarded with its tag unless it is hoisted first.
	// efni retiring the inline gloss (spec §4.7) is what makes this load-bearing.
	describe('data-en hoisting (search index)', () => {
		it('puts the English term in the text, alongside the Icelandic', () => {
			const text = htmlToPlainText(
				'<p><dfn id="term-00001" class="term" data-en="formula mass">formúlumassa</dfn> er hugtak.</p>'
			);
			expect(text).toContain('formula mass');
			expect(text).toContain('formúlumassa');
		});

		// Control: the same element WITHOUT data-en must not gain English, or the
		// assertion above would pass on any input and prove nothing.
		it('adds nothing when the attribute is absent', () => {
			const text = htmlToPlainText(
				'<p><dfn id="term-00001" class="term">formúlumassa</dfn> er hugtak.</p>'
			);
			expect(text).not.toContain('formula mass');
			expect(text).toBe('formúlumassa er hugtak.');
		});

		it('still carries an inline gloss, so a mixed corpus indexes either form', () => {
			const text = htmlToPlainText(
				'<p><dfn class="term">mól (e. mole)</dfn> og <dfn class="term" data-en="dilution">þynning</dfn>.</p>'
			);
			expect(text).toContain('mole');
			expect(text).toContain('dilution');
		});

		it('decodes entities in the attribute value', () => {
			const text = htmlToPlainText(
				'<dfn class="term" data-en="Avogadro&#39;s number">Avogadrosartala</dfn>'
			);
			expect(text).toContain("Avogadro's number");
		});

		// data-en is case-preserving; the index is matched fuzzily, so the value
		// is carried through verbatim rather than normalised here.
		it('preserves the attribute case', () => {
			expect(htmlToPlainText('<dfn class="term" data-en="Alkyl halides">alkýlhalíð</dfn>')).toContain(
				'Alkyl halides'
			);
		});

		it('does not resurrect text from a stripped math block', () => {
			const text = htmlToPlainText(
				'<span class="math-inline"><math assistive-mathml="true" data-en="should not appear"><mi>x</mi></math></span> eftir'
			);
			expect(text).not.toContain('should not appear');
			expect(text).toBe('eftir');
		});
	});
});
