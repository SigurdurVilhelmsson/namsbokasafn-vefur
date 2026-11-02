/**
 * Where the selection popup goes (reader plan S7.1, register UI-28): centred on the selection,
 * clamped to the screen on both sides, above the selection unless there is no room.
 */
import { describe, expect, it } from 'vitest';
import { placePopup, POPUP_GAP, POPUP_MARGIN } from './popupPosition';

const phone = { width: 390, height: 844 };
const popup = { width: 250, height: 44 };
/** A selection 40 px wide whose centre is at x, on the line from top to top + 20 */
const at = (x: number, top = 400) => ({ left: x - 20, right: x + 20, top, bottom: top + 20 });

describe('placePopup', () => {
	it('centres the popup on the selection, above it, in open space', () => {
		expect(placePopup(at(195), popup, phone)).toEqual({
			left: 195 - 125,
			top: 400 - POPUP_GAP - 44,
			side: 'above'
		});
	});

	it('clamps the left side: a selection at the left edge keeps the popup on the screen', () => {
		expect(placePopup(at(30), popup, phone).left).toBe(POPUP_MARGIN);
	});

	it('clamps the right side', () => {
		expect(placePopup(at(370), popup, phone).left).toBe(390 - 250 - POPUP_MARGIN);
	});

	it('leaves a popup alone when it fits exactly at the margins', () => {
		expect(placePopup(at(POPUP_MARGIN + 125), popup, phone).left).toBe(POPUP_MARGIN);
		expect(placePopup(at(390 - POPUP_MARGIN - 125), popup, phone).left).toBe(390 - POPUP_MARGIN - 250);
	});

	it('centres a popup on the screen when it is wider than the room between the margins', () => {
		expect(placePopup(at(30), { width: 380, height: 44 }, phone).left).toBe(5);
	});

	it('pins a popup wider than the screen to its left edge', () => {
		expect(placePopup(at(300), { width: 500, height: 44 }, phone).left).toBe(0);
	});

	it('goes below the selection when there is no room above it', () => {
		const top = 30;
		expect(placePopup(at(195, top), popup, phone)).toEqual({
			left: 70,
			top: top + 20 + POPUP_GAP,
			side: 'below'
		});
	});

	it('stays above when the room above is exactly enough', () => {
		const top = POPUP_MARGIN + POPUP_GAP + 44;
		expect(placePopup(at(195, top), popup, phone).side).toBe('above');
		expect(placePopup(at(195, top - 1), popup, phone).side).toBe('below');
	});

	it('goes below when asked, and above when there is no room below', () => {
		expect(placePopup(at(195), popup, phone, 'below')).toEqual({ left: 70, top: 420 + POPUP_GAP, side: 'below' });
		const low = placePopup(at(195, 800), popup, phone, 'below');
		expect(low).toEqual({ left: 70, top: 800 - POPUP_GAP - 44, side: 'above' });
	});

	it('stays below when the room below is exactly enough', () => {
		const top = 844 - POPUP_MARGIN - 44 - POPUP_GAP - 20;
		expect(placePopup(at(195, top), popup, phone, 'below').side).toBe('below');
		expect(placePopup(at(195, top + 1), popup, phone, 'below').side).toBe('above');
	});

	it('when neither side fits, takes the side with more room and keeps the popup on the screen', () => {
		const tall = { width: 250, height: 500 };
		// 400 px above, 424 below: neither holds 500 + gap + margin
		const nearTop = placePopup({ left: 175, right: 215, top: 400, bottom: 420 }, tall, phone);
		expect(nearTop.side).toBe('below');
		expect(nearTop.top).toBe(844 - 500 - POPUP_MARGIN);
		// 430 px above, 394 below
		const nearBottom = placePopup({ left: 175, right: 215, top: 430, bottom: 450 }, tall, phone);
		expect(nearBottom.side).toBe('above');
		expect(nearBottom.top).toBe(POPUP_MARGIN);
	});

	it('pins a popup taller than the screen to its top', () => {
		expect(placePopup(at(195), { width: 250, height: 900 }, phone).top).toBe(0);
	});

	it('gives a usable place before the popup has been measured', () => {
		const p = placePopup(at(195), { width: 0, height: 0 }, phone);
		expect(Number.isFinite(p.left) && Number.isFinite(p.top)).toBe(true);
		expect(p.left).toBe(195);
	});
});
