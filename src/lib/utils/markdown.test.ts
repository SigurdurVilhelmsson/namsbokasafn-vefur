/**
 * Tests for markdown processing utilities
 */

import { describe, it, expect } from 'vitest';
import { processMarkdown, processMarkdownSync } from './markdown';

describe('markdown utils', () => {
	describe('basic markdown', () => {
		it('should process plain text', async () => {
			const html = await processMarkdown('Hello world');
			expect(html).toContain('Hello world');
		});

		it('should process bold text', async () => {
			const html = await processMarkdown('**bold text**');
			expect(html).toContain('<strong>bold text</strong>');
		});

		it('should process italic text', async () => {
			const html = await processMarkdown('*italic text*');
			expect(html).toContain('<em>italic text</em>');
		});

		it('should process links', async () => {
			const html = await processMarkdown('[link](https://example.com)');
			expect(html).toContain('<a href="https://example.com">link</a>');
		});

		it('should process unordered lists', async () => {
			const html = await processMarkdown('- item 1\n- item 2');
			expect(html).toContain('<ul>');
			expect(html).toContain('<li>item 1</li>');
			expect(html).toContain('<li>item 2</li>');
		});

		it('should process ordered lists', async () => {
			const html = await processMarkdown('1. first\n2. second');
			expect(html).toContain('<ol>');
			expect(html).toContain('<li>first</li>');
		});

		it('should process code blocks', async () => {
			const html = await processMarkdown('```js\nconst x = 1;\n```');
			expect(html).toContain('<code');
			expect(html).toContain('const x = 1;');
		});

		it('should process inline code', async () => {
			const html = await processMarkdown('Use `console.log()`');
			expect(html).toContain('<code>console.log()</code>');
		});
	});

	describe('GFM extensions', () => {
		it('should process tables', async () => {
			const md = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;
			const html = await processMarkdown(md);
			expect(html).toContain('<table>');
			expect(html).toContain('<th>Header 1</th>');
			expect(html).toContain('<td>Cell 1</td>');
		});

		it('should process strikethrough', async () => {
			const html = await processMarkdown('~~deleted~~');
			expect(html).toContain('<del>deleted</del>');
		});

		it('should process task lists', async () => {
			const html = await processMarkdown('- [x] done\n- [ ] todo');
			expect(html).toContain('type="checkbox"');
		});
	});

	describe('heading shifting', () => {
		it('should shift h1 to h2', async () => {
			const html = await processMarkdown('# Heading 1');
			expect(html).toMatch(/<h2[^>]*>/); // h2 with optional attributes (like id)
			expect(html).not.toMatch(/<h1[^>]*>/);
		});

		it('should shift h2 to h3', async () => {
			const html = await processMarkdown('## Heading 2');
			expect(html).toMatch(/<h3[^>]*>/);
		});

		it('should shift h3 to h4', async () => {
			const html = await processMarkdown('### Heading 3');
			expect(html).toMatch(/<h4[^>]*>/);
		});

		it('should cap h6 at h6', async () => {
			const html = await processMarkdown('###### Heading 6');
			expect(html).toMatch(/<h6[^>]*>/);
		});

		it('should add id attributes to headings', async () => {
			const html = await processMarkdown('# My Heading');
			expect(html).toContain('id="my-heading"');
		});
	});

	describe('math (MathJax)', () => {
		it('should process inline math', async () => {
			const html = await processMarkdown('The formula $E = mc^2$ is famous.');
			expect(html).toContain('MathJax');
		});

		it('should process display math', async () => {
			const html = await processMarkdown('$$\nE = mc^2\n$$');
			expect(html).toContain('MathJax');
		});

		it('should add accessibility attributes to math', async () => {
			const html = await processMarkdown('$x^2$');
			expect(html).toContain('role="math"');
			expect(html).toContain('aria-label');
		});

		it('should wrap block equations with equation-wrapper', async () => {
			const html = await processMarkdown('$$E = mc^2$$');
			expect(html).toContain('equation-wrapper');
			expect(html).toContain('equation-content');
		});

		it('should include copy and zoom buttons for block equations', async () => {
			const html = await processMarkdown('$$x = 5$$');
			expect(html).toContain('equation-copy-btn');
			expect(html).toContain('equation-zoom-btn');
		});
	});

	describe('custom directives', () => {
		describe('practice-problem directive', () => {
			it('should process practice-problem container', async () => {
				const md = `
:::practice-problem{id="p1"}
What is 2 + 2?
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('practice-problem-container');
				expect(html).toContain('data-problem-id="p1"');
			});

			it('should process answer container', async () => {
				const md = `
:::answer
4
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('practice-answer-container');
			});

			it('should process explanation container', async () => {
				const md = `
:::explanation
Because 2 + 2 equals 4.
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('practice-explanation-container');
			});

			it('should process hint container', async () => {
				const md = `
:::hint
Think about addition.
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('practice-hint-container');
			});
		});

		describe('content block directives', () => {
			it('should process note directive', async () => {
				const md = `
:::note
This is important.
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('content-block');
				expect(html).toContain('note');
			});

			it('should process warning directive', async () => {
				const md = `
:::warning
Be careful!
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('warning');
			});

			it('should process example directive', async () => {
				const md = `
:::example
Here is an example.
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('example');
			});

			it('should process definition directive with term', async () => {
				const md = `
:::definition{term="Atóm"}
The smallest unit of matter.
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('definition');
				// Term should appear in the title, not as a data attribute (data attributes are cleaned up)
				expect(html).toContain('Atóm');
			});

			it('should process key-concept directive', async () => {
				const md = `
:::key-concept
Matter is made of atoms.
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('key-concept');
			});

			it('should process checkpoint directive', async () => {
				const md = `
:::checkpoint
Can you explain this?
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('checkpoint');
			});

			it('should process common-misconception directive', async () => {
				const md = `
:::common-misconception
This is often misunderstood.
:::
`;
				const html = await processMarkdown(md);
				expect(html).toContain('common-misconception');
			});
		});
	});

	describe('cross-references', () => {
		it('should transform section references', async () => {
			const html = await processMarkdown('See [ref:sec:1.1] for more.');
			expect(html).toContain('cross-reference');
			expect(html).toContain('data-ref-type="sec"');
			expect(html).toContain('data-ref-id="1.1"');
			expect(html).toContain('href="#ref:sec:1.1"');
		});

		it('should transform equation references', async () => {
			// Use numeric ID to avoid remark-directive parsing :E1 as a directive
			const html = await processMarkdown('Using [ref:eq:1.1] we get...');
			expect(html).toContain('data-ref-type="eq"');
			expect(html).toContain('data-ref-id="1.1"');
		});

		it('should transform figure references', async () => {
			const html = await processMarkdown('As shown in [ref:fig:2.3]');
			expect(html).toContain('data-ref-type="fig"');
			expect(html).toContain('data-ref-id="2.3"');
		});

		it('should transform table references', async () => {
			const html = await processMarkdown('See [ref:tbl:1]');
			expect(html).toContain('data-ref-type="tbl"');
			expect(html).toContain('data-ref-id="1"');
		});

		it('should transform definition references', async () => {
			// Use numeric ID to avoid remark-directive parsing :atom as a directive
			const html = await processMarkdown('Recall [ref:def:1]');
			expect(html).toContain('data-ref-type="def"');
			expect(html).toContain('data-ref-id="1"');
		});

		it('should handle multiple references in same paragraph', async () => {
			const html = await processMarkdown('See [ref:eq:1] and [ref:fig:2]');
			expect(html).toContain('data-ref-id="1"');
			expect(html).toContain('data-ref-id="2"');
		});

		it('should preserve text around references', async () => {
			const html = await processMarkdown('Before [ref:sec:1] after');
			expect(html).toContain('Before');
			expect(html).toContain('after');
		});
	});

	describe('sync processing', () => {
		it('should process markdown synchronously', () => {
			const html = processMarkdownSync('**bold**');
			expect(html).toContain('<strong>bold</strong>');
		});

		it('should handle directives synchronously', () => {
			const html = processMarkdownSync(':::note\nTest\n:::');
			expect(html).toContain('note');
		});

		it('should handle math synchronously', () => {
			const html = processMarkdownSync('$x^2$');
			expect(html).toContain('MathJax');
		});
	});

	describe('complex content', () => {
		it('should process nested content in directives', async () => {
			const md = `
:::note
This has **bold** and *italic* and $math$.
:::
`;
			const html = await processMarkdown(md);
			expect(html).toContain('note');
			expect(html).toContain('<strong>bold</strong>');
			expect(html).toContain('<em>italic</em>');
			expect(html).toContain('MathJax');
		});

		it('should process practice problem with all parts', async () => {
			const md = `
:::practice-problem{id="test-1"}
Calculate $2 + 2$.

:::hint
It's basic addition.
:::

:::answer
$4$
:::

:::explanation
$2 + 2 = 4$ by definition of addition.
:::
:::
`;
			const html = await processMarkdown(md);
			expect(html).toContain('practice-problem-container');
			expect(html).toContain('practice-hint-container');
			expect(html).toContain('practice-answer-container');
			expect(html).toContain('practice-explanation-container');
		});

		it('should handle mixed content with headings, math, and directives', async () => {
			const md = `
# Introduction

The equation $E = mc^2$ is famous.

:::note
Einstein discovered this.
:::

See [ref:eq:1] for details.
`;
			const html = await processMarkdown(md);
			expect(html).toMatch(/<h2[^>]*>/); // h1 shifted to h2 (with id attribute)
			expect(html).toContain('MathJax');
			expect(html).toContain('note');
			expect(html).toContain('cross-reference');
		});
	});

	describe('figure captions', () => {
		it('should wrap image + caption into figure element', async () => {
			const md = `![Alt text](./images/test.jpg)

Mynd 1.3 This is the caption text.`;

			const html = await processMarkdown(md);
			expect(html).toContain('<figure>');
			expect(html).toContain('<figcaption>');
			expect(html).toContain('<strong class="figure-label">Mynd 1.3</strong>');
			expect(html).toContain('This is the caption text.');
		});

		it('should handle extra blank lines between image and caption', async () => {
			const md = `![Alt text](./images/test.jpg)


Mynd 1.3 This is the caption text.`;

			const html = await processMarkdown(md);
			expect(html).toContain('<figure>');
			expect(html).toContain('<figcaption>');
		});

		it('should not wrap image without Mynd caption', async () => {
			const md = `![Alt text](./images/test.jpg)

Just a regular paragraph.`;

			const html = await processMarkdown(md);
			expect(html).not.toContain('<figure>');
			expect(html).toContain('<p><img');
		});

		it('should handle multi-line captions', async () => {
			const md = `![Alt text](./images/test.jpg)

Mynd 1.3 First line of caption
continued on second line.`;

			const html = await processMarkdown(md);
			expect(html).toContain('<figure>');
			expect(html).toContain('<figcaption>');
		});

		it('should handle subscripts in captions', async () => {
			const md = `![Alt text](./images/test.jpg)

Mynd 2.17 Caption with S~8~ and H~2~O subscripts.`;

			const html = await processMarkdown(md);
			expect(html).toContain('<figure>');
			expect(html).toContain('<figcaption>');
			expect(html).toContain('<sub>8</sub>');
			expect(html).toContain('<sub>2</sub>');
			expect(html).not.toContain('<del>');
		});
	});

	describe('edge cases', () => {
		it('should handle empty input', async () => {
			const html = await processMarkdown('');
			expect(html).toBe('');
		});

		it('should handle whitespace only', async () => {
			const html = await processMarkdown('   \n\n   ');
			expect(html.trim()).toBe('');
		});

		it('should handle unknown directives gracefully', async () => {
			const md = ':::unknown\nContent\n:::';
			const html = await processMarkdown(md);
			// Should not crash, content should still be present
			expect(html).toContain('Content');
		});

		it('should handle malformed math gracefully', async () => {
			// Missing closing delimiter
			const html = await processMarkdown('$x^2');
			// Should not crash
			expect(html).toBeDefined();
		});

		it('should handle special characters', async () => {
			const html = await processMarkdown('& < > "');
			// rehype-stringify uses hex entities
			expect(html).toContain('&#x26;'); // &
			expect(html).toContain('&#x3C;'); // <
			expect(html).toContain('>'); // > is not escaped in text content
		});
	});
});
