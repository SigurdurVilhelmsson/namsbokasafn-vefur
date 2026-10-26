import { describe, it, expect } from 'vitest';
import { sanitiseSnapshotHtml, snapshotFragment, snapshotOf, storedAnswerText } from './practiceSnapshot';

const html = (markup: string) => {
	const box = document.createElement('div');
	box.innerHTML = markup;
	return [...box.childNodes];
};

describe('snapshotOf', () => {
	it('keeps sup, sub and MathML, and drops the MathJax SVG, the hiding style and every class and id', () => {
		const snap = snapshotOf(
			html(
				'<p id="x" class="y">10<sup>22</sup> H<sub>2</sub>O ' +
					'<span class="math-inline" data-latex="a"><mjx-container><svg><path d="M0"></path></svg></mjx-container>' +
					'<math class="assistive-mathml" style="position:absolute;clip:rect(0,0,0,0)"><mfrac><mi>a</mi><mi>b</mi></mfrac></math></span></p>'
			)
		);
		expect(snap.html).toBe('<p>10<sup>22</sup> H<sub>2</sub>O <math><mfrac><mi>a</mi><mi>b</mi></mfrac></math></p>');
		expect(snap.text).toBe('1022 H2O ab');
	});

	it('does not change the page nodes it copies', () => {
		const nodes = html('<p class="keep"><b class="bionic-bold">Hv</b>að?</p>');
		snapshotOf(nodes);
		expect((nodes[0] as Element).outerHTML).toBe('<p class="keep"><b class="bionic-bold">Hv</b>að?</p>');
	});

	it('keeps the MathML attributes that change how maths reads, and drops the rest', () => {
		const snap = snapshotOf(
			html('<math display="block" xmlns="http://www.w3.org/1998/Math/MathML" data-x="1"><mspace width="0.2em" onclick="x()"></mspace><mo stretchy="false">[</mo></math>')
		);
		expect(snap.html).toBe('<math display="block"><mspace width="0.2em"></mspace><mo stretchy="false">[</mo></math>');
	});
});

describe('sanitiseSnapshotHtml (a stored snapshot can be edited in localStorage)', () => {
	it.each([
		['a script', '<p>a</p><script>alert(1)</script>', '<p>a</p>'],
		['an event handler', '<p onclick="alert(1)">a</p>', '<p>a</p>'],
		['an image from another site', '<img src="https://evil.example/x.png" alt="x">', '<img alt="x">'],
		['a protocol-relative image', '<img src="//evil.example/x.png">', '<img>'],
		['a javascript: image', '<img src="javascript:alert(1)" onerror="alert(1)">', '<img>'],
		['an SVG with a handler', '<svg onload="alert(1)"><circle></circle></svg><p>a</p>', '<p>a</p>'],
		['a style element and attribute', '<style>p{}</style><p style="color:red">a</p>', '<p>a</p>'],
		['an iframe', '<iframe src="/x"></iframe><p>a</p>', '<p>a</p>'],
		['a link, unwrapped', '<p><a href="javascript:alert(1)">a</a></p>', '<p>a</p>'],
		['an HTML comment', '<p>a<!-- x --></p>', '<p>a</p>']
	])('removes %s', (_, input, expected) => {
		expect(sanitiseSnapshotHtml(input)).toBe(expected);
	});

	it('keeps a same-site image with its alt text', () => {
		const input = '<img src="/content/b/chapters/04/images/media/x.jpg" alt="Mynd">';
		expect(sanitiseSnapshotHtml(input)).toBe(input);
	});

	it('keeps a table with its spans', () => {
		const input = '<table><tbody><tr><th colspan="2">A</th></tr><tr><td>1</td><td rowspan="1">2</td></tr></tbody></table>';
		expect(sanitiseSnapshotHtml(input)).toBe(input);
	});

	it('gives the same result when run twice', () => {
		const input = '<p class="x">10<sup>22</sup><a href="#y">z</a><math style="s"><msup><mn>10</mn><mn>3</mn></msup></math></p>';
		const once = sanitiseSnapshotHtml(input);
		expect(sanitiseSnapshotHtml(once)).toBe(once);
	});

	it('returns nodes, MathML in the MathML namespace, for the review views to append', () => {
		const fragment = snapshotFragment('<p><math><mi>x</mi></math></p>');
		expect(fragment.querySelector('math')?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
	});
});

describe('storedAnswerText', () => {
	it("drops the 'Svar:' heading a record stored before S3.1 carries, and nothing else", () => {
		expect(storedAnswerText('Svar: 48,3%')).toBe('48,3%');
		expect(storedAnswerText('  Svar:\n 48,3%')).toBe('48,3%');
		expect(storedAnswerText('48,3%')).toBe('48,3%');
		expect(storedAnswerText(undefined)).toBe('');
	});
});
