/**
 * figureViewer's public entry point (plan step S9.4, PED-03): in paged mode an in-text 'Mynd'
 * link opens the lightbox over the current page instead of turning to the figure's page.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { figureViewer, openFigure } from './figureViewer';

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');

function figure(): { root: HTMLElement; img: HTMLImageElement; link: HTMLAnchorElement } {
	const root = document.body.appendChild(document.createElement('div'));
	root.innerHTML =
		'<p><a href="#fig">Mynd 1.2</a></p>' +
		'<figure id="fig"><img src="/x.png" alt="Gullgerðarmenn"><figcaption>Mynd 1.2 Gullgerð.</figcaption></figure>';
	return { root, img: root.querySelector('img')!, link: root.querySelector('a')! };
}

afterEach(() => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
	document.body.innerHTML = '';
});

describe('openFigure', () => {
	it('opens the lightbox on the image, with its caption', () => {
		const { img } = figure();
		openFigure(img);
		expect(dialog()?.querySelector('img')?.getAttribute('src')).toMatch(/\/x\.png$/);
		expect(dialog()?.textContent).toContain('Mynd 1.2 Gullgerð.');
	});

	it("opened from a link, puts focus on 'Loka', and Escape gives it back to the link", () => {
		const { img, link } = figure();
		link.focus();
		openFigure(img, link);
		expect(document.activeElement?.getAttribute('aria-label')).toBe('Loka');
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(dialog()).toBeNull();
		expect(document.activeElement).toBe(link);
	});

	it("uses the lightbox of the figureViewer around the image, which its destroy closes", () => {
		const { root, img } = figure();
		const action = figureViewer(root);
		openFigure(img);
		expect(dialog()).not.toBeNull();
		action.destroy();
		expect(dialog()).toBeNull();
	});
});
