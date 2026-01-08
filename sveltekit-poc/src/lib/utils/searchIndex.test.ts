/**
 * Tests for search index utilities, focusing on XSS prevention
 */
import { describe, it, expect } from 'vitest';
import { escapeHtml, highlightQuery } from './searchIndex';

describe('escapeHtml', () => {
	it('should escape HTML entities', () => {
		expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
		expect(escapeHtml('&')).toBe('&amp;');
		expect(escapeHtml('"')).toBe('&quot;');
		expect(escapeHtml("'")).toBe('&#39;');
	});

	it('should escape all dangerous characters in a string', () => {
		const input = '<script>alert("XSS")</script>';
		const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
		expect(escapeHtml(input)).toBe(expected);
	});

	it('should handle normal text without escaping', () => {
		expect(escapeHtml('Hello World')).toBe('Hello World');
		expect(escapeHtml('Icelandic: Þórður Ásta')).toBe('Icelandic: Þórður Ásta');
	});

	it('should handle empty string', () => {
		expect(escapeHtml('')).toBe('');
	});

	it('should escape event handler injection attempts', () => {
		const input = '<img src=x onerror=alert(1)>';
		expect(escapeHtml(input)).not.toContain('<img');
		expect(escapeHtml(input)).toBe('&lt;img src=x onerror=alert(1)&gt;');
	});
});

describe('highlightQuery', () => {
	it('should highlight matching text', () => {
		const result = highlightQuery('Hello World', 'World');
		expect(result).toContain('<mark');
		expect(result).toContain('World');
		expect(result).toContain('</mark>');
	});

	it('should be case-insensitive', () => {
		const result = highlightQuery('Hello WORLD', 'world');
		expect(result).toContain('<mark');
		expect(result).toContain('WORLD');
	});

	it('should escape HTML in the text', () => {
		const result = highlightQuery('<script>alert("test")</script>', 'test');
		expect(result).not.toContain('<script>');
		expect(result).toContain('&lt;script&gt;');
		expect(result).toContain('<mark');
	});

	it('should escape HTML in the query', () => {
		const result = highlightQuery('Some text', '<script>');
		// The query should be escaped, so it won't match anything dangerous
		expect(result).not.toContain('<script>');
		expect(result).toBe('Some text');
	});

	it('should handle XSS attempts in query', () => {
		const text = 'This is a test of XSS prevention';
		const maliciousQuery = '<img src=x onerror=alert(1)>';

		const result = highlightQuery(text, maliciousQuery);

		// Should not contain unescaped HTML
		expect(result).not.toContain('<img');
		// Should return escaped text without highlights (no match)
		expect(result).toBe('This is a test of XSS prevention');
	});

	it('should handle XSS attempts in text', () => {
		const maliciousText = 'Click <a href="javascript:alert(1)">here</a>';
		const query = 'Click';

		const result = highlightQuery(maliciousText, query);

		// The anchor tag should be escaped
		expect(result).not.toContain('<a href=');
		expect(result).toContain('&lt;a href=');
		// But Click should still be highlighted
		expect(result).toContain('<mark');
		expect(result).toContain('Click');
	});

	it('should return escaped text when query is empty', () => {
		const result = highlightQuery('<script>', '');
		expect(result).toBe('&lt;script&gt;');
	});

	it('should return escaped text when query is whitespace only', () => {
		const result = highlightQuery('<script>', '   ');
		expect(result).toBe('&lt;script&gt;');
	});

	it('should handle special regex characters in query', () => {
		const text = 'Price is $100.00 (discounted)';
		const query = '$100.00';

		const result = highlightQuery(text, query);
		expect(result).toContain('<mark');
	});

	it('should highlight multiple occurrences', () => {
		const result = highlightQuery('test test test', 'test');
		const markCount = (result.match(/<mark/g) || []).length;
		expect(markCount).toBe(3);
	});

	it('should preserve ampersands correctly', () => {
		const result = highlightQuery('Tom & Jerry', 'Tom');
		expect(result).toContain('&amp;');
		expect(result).toContain('<mark');
	});
});
