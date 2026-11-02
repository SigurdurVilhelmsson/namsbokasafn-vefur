/**
 * Where a popup anchored to a text selection goes (reader plan S7.1, register UI-28).
 *
 * Centred on the selection and clamped to the screen on both sides: before S7.1 the selection
 * popup clamped only its right side, so a selection near the left edge pushed it off the screen.
 * It sits above the selection, or below when asked, and takes the other side when its own has
 * no room. All values are viewport pixels, as from getBoundingClientRect.
 */

/** Space between the selection and the popup */
export const POPUP_GAP = 8;
/** Space kept between the popup and the screen edges */
export const POPUP_MARGIN = 8;

export interface PopupAnchor {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export interface PopupSize {
	width: number;
	height: number;
}

export type PopupSide = 'above' | 'below';

export interface PopupPlacement {
	left: number;
	top: number;
	side: PopupSide;
}

/** Keep a span of `size` inside [0, room] with `margin` on each side; centre it if it can't fit */
function clampSpan(start: number, size: number, room: number): number {
	if (size > room - 2 * POPUP_MARGIN) return Math.max(0, (room - size) / 2);
	return Math.min(Math.max(start, POPUP_MARGIN), room - size - POPUP_MARGIN);
}

/**
 * Place a popup of `size` by the selection box `anchor` inside `viewport`.
 *
 * @param prefer the side to try first; the other is used when the preferred one has no room,
 *   and when neither has room, the side with more room, clamped to the screen
 */
export function placePopup(
	anchor: PopupAnchor,
	size: PopupSize,
	viewport: PopupSize,
	prefer: PopupSide = 'above'
): PopupPlacement {
	const centre = (anchor.left + anchor.right) / 2;
	const left = clampSpan(centre - size.width / 2, size.width, viewport.width);

	const aboveTop = anchor.top - POPUP_GAP - size.height;
	const belowTop = anchor.bottom + POPUP_GAP;
	const fits: Record<PopupSide, boolean> = {
		above: aboveTop >= POPUP_MARGIN,
		below: belowTop + size.height <= viewport.height - POPUP_MARGIN
	};
	const topFor = (side: PopupSide) => (side === 'above' ? aboveTop : belowTop);

	if (fits[prefer]) return { left, top: topFor(prefer), side: prefer };

	// Otherwise the side with more room, clamped to the screen. When the other side fits, it is
	// always the roomier one, and the clamp leaves a place that fits where it is.
	const side: PopupSide = anchor.top >= viewport.height - anchor.bottom ? 'above' : 'below';
	return { left, top: clampSpan(topFor(side), size.height, viewport.height), side };
}
