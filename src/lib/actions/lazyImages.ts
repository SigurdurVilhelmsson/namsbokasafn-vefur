/**
 * Svelte action that adds loading="lazy" to all img elements within a container.
 * Skips images that already have a loading attribute set.
 */
export function lazyImages(node: HTMLElement) {
	const images = node.querySelectorAll<HTMLImageElement>('img:not([loading])');
	images.forEach((img) => {
		img.setAttribute('loading', 'lazy');
	});
}
