/**
 * jsdom has no Element.prototype.animate, which Svelte's transitions and animations call when
 * a mounted component shows or hides an element with them (plan step S4.2, CODE-21). The
 * stub finishes at once, so a test sees the end state without waiting for a frame.
 */
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
	Element.prototype.animate = function animate() {
		const animation = {
			currentTime: 0,
			playState: 'finished',
			finished: Promise.resolve(),
			onfinish: null as ((this: unknown, ev: Event) => unknown) | null,
			oncancel: null as ((this: unknown, ev: Event) => unknown) | null,
			cancel() {},
			finish() {},
			pause() {},
			play() {},
			reverse() {},
			addEventListener() {},
			removeEventListener() {}
		};
		queueMicrotask(() => animation.onfinish?.call(animation, new Event('finish')));
		return animation as unknown as Animation;
	};
}
