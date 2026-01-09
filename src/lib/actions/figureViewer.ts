/**
 * Svelte action for image lightbox functionality
 * Enhances all images in markdown content with zoom/lightbox capability
 */

interface FigureViewerState {
	lightbox: HTMLDivElement | null;
	currentImage: HTMLImageElement | null;
	zoom: number;
	pan: { x: number; y: number };
	isDragging: boolean;
	dragStart: { x: number; y: number };
}

/**
 * Creates and shows the lightbox for an image
 */
function showLightbox(img: HTMLImageElement, state: FigureViewerState): void {
	// Get image info
	const src = img.src;
	const alt = img.alt || '';
	const figcaption = img.closest('figure')?.querySelector('figcaption')?.textContent || '';

	// Reset state
	state.zoom = 1;
	state.pan = { x: 0, y: 0 };
	state.isDragging = false;
	state.currentImage = img;

	// Create lightbox
	const lightbox = document.createElement('div');
	lightbox.className = 'figure-lightbox';
	lightbox.setAttribute('role', 'dialog');
	lightbox.setAttribute('aria-modal', 'true');
	lightbox.setAttribute('aria-label', `Mynd: ${alt}`);

	lightbox.innerHTML = `
		<div class="figure-lightbox-toolbar">
			<div class="figure-lightbox-controls">
				<button class="figure-lightbox-btn" data-action="zoom-out" aria-label="Minnka" title="Minnka (-)">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
					</svg>
				</button>
				<span class="figure-lightbox-zoom-level">100%</span>
				<button class="figure-lightbox-btn" data-action="zoom-in" aria-label="Staekka" title="Staekka (+)">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
					</svg>
				</button>
				<button class="figure-lightbox-btn" data-action="reset" aria-label="Endurstilla" title="Endurstilla (0)">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</button>
				<span class="figure-lightbox-divider"></span>
				<button class="figure-lightbox-btn" data-action="download" aria-label="Saekja" title="Saekja">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
				</button>
				<span class="figure-lightbox-divider"></span>
				<button class="figure-lightbox-btn" data-action="close" aria-label="Loka" title="Loka (Esc)">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
		<div class="figure-lightbox-container">
			<img class="figure-lightbox-image" src="${src}" alt="${alt}" draggable="false" />
		</div>
		${figcaption || alt ? `<div class="figure-lightbox-caption">${figcaption || alt}</div>` : ''}
	`;

	// Add to DOM
	document.body.appendChild(lightbox);
	document.body.style.overflow = 'hidden';
	state.lightbox = lightbox;

	// Get elements
	const lightboxImage = lightbox.querySelector('.figure-lightbox-image') as HTMLImageElement;
	const zoomLevel = lightbox.querySelector('.figure-lightbox-zoom-level') as HTMLSpanElement;
	const container = lightbox.querySelector('.figure-lightbox-container') as HTMLDivElement;

	// Update zoom display
	function updateZoomDisplay() {
		zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
		lightboxImage.style.transform = `scale(${state.zoom}) translate(${state.pan.x / state.zoom}px, ${state.pan.y / state.zoom}px)`;
		container.style.cursor = state.zoom > 1 ? (state.isDragging ? 'grabbing' : 'grab') : 'default';
	}

	// Zoom handlers
	function zoomIn() {
		state.zoom = Math.min(state.zoom + 0.25, 4);
		updateZoomDisplay();
	}

	function zoomOut() {
		state.zoom = Math.max(state.zoom - 0.25, 0.5);
		if (state.zoom === 1) {
			state.pan = { x: 0, y: 0 };
		}
		updateZoomDisplay();
	}

	function resetZoom() {
		state.zoom = 1;
		state.pan = { x: 0, y: 0 };
		updateZoomDisplay();
	}

	function download() {
		const link = document.createElement('a');
		link.href = src;
		link.download = alt || 'image';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Event handlers
	function handleClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const action = target.closest('[data-action]')?.getAttribute('data-action');

		switch (action) {
			case 'zoom-in':
				zoomIn();
				break;
			case 'zoom-out':
				zoomOut();
				break;
			case 'reset':
				resetZoom();
				break;
			case 'download':
				download();
				break;
			case 'close':
				closeLightbox(state);
				break;
		}

		// Close on backdrop click
		if (target === lightbox || target === container) {
			closeLightbox(state);
		}
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.1 : 0.1;
		state.zoom = Math.max(0.5, Math.min(4, state.zoom + delta));
		if (state.zoom === 1) {
			state.pan = { x: 0, y: 0 };
		}
		updateZoomDisplay();
	}

	function handleMouseDown(e: MouseEvent) {
		if (state.zoom > 1 && e.target === lightboxImage) {
			state.isDragging = true;
			state.dragStart = { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y };
			updateZoomDisplay();
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (state.isDragging) {
			state.pan = {
				x: e.clientX - state.dragStart.x,
				y: e.clientY - state.dragStart.y
			};
			updateZoomDisplay();
		}
	}

	function handleMouseUp() {
		state.isDragging = false;
		updateZoomDisplay();
	}

	function handleKeyDown(e: KeyboardEvent) {
		switch (e.key) {
			case 'Escape':
				closeLightbox(state);
				break;
			case '+':
			case '=':
				zoomIn();
				break;
			case '-':
				zoomOut();
				break;
			case '0':
				resetZoom();
				break;
		}
	}

	// Attach event listeners
	lightbox.addEventListener('click', handleClick);
	container.addEventListener('wheel', handleWheel, { passive: false });
	container.addEventListener('mousedown', handleMouseDown);
	container.addEventListener('mousemove', handleMouseMove);
	container.addEventListener('mouseup', handleMouseUp);
	container.addEventListener('mouseleave', handleMouseUp);
	document.addEventListener('keydown', handleKeyDown);

	// Store cleanup function
	(lightbox as HTMLDivElement & { cleanup?: () => void }).cleanup = () => {
		lightbox.removeEventListener('click', handleClick);
		container.removeEventListener('wheel', handleWheel);
		container.removeEventListener('mousedown', handleMouseDown);
		container.removeEventListener('mousemove', handleMouseMove);
		container.removeEventListener('mouseup', handleMouseUp);
		container.removeEventListener('mouseleave', handleMouseUp);
		document.removeEventListener('keydown', handleKeyDown);
	};
}

/**
 * Closes the lightbox
 */
function closeLightbox(state: FigureViewerState): void {
	if (state.lightbox) {
		const cleanup = (state.lightbox as HTMLDivElement & { cleanup?: () => void }).cleanup;
		if (cleanup) cleanup();
		state.lightbox.remove();
		state.lightbox = null;
		document.body.style.overflow = '';
	}
}

/**
 * Svelte action for figure viewer
 * Attach to a container element to enable lightbox on all images within
 */
export function figureViewer(node: HTMLElement) {
	const state: FigureViewerState = {
		lightbox: null,
		currentImage: null,
		zoom: 1,
		pan: { x: 0, y: 0 },
		isDragging: false,
		dragStart: { x: 0, y: 0 }
	};

	function handleClick(event: Event) {
		const target = event.target as HTMLElement;

		// Check if clicked on an image
		if (target.tagName === 'IMG') {
			const img = target as HTMLImageElement;
			// Don't open lightbox for small icons or decorative images
			if (img.width > 100 && img.height > 100) {
				event.preventDefault();
				showLightbox(img, state);
			}
		}
	}

	// Add cursor style to images
	const images = node.querySelectorAll('img');
	images.forEach((img) => {
		if (img.width > 100 || img.height > 100) {
			img.style.cursor = 'zoom-in';
		}
	});

	node.addEventListener('click', handleClick);

	return {
		destroy() {
			node.removeEventListener('click', handleClick);
			closeLightbox(state);
		}
	};
}
