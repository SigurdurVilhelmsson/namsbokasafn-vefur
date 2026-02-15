/**
 * Svelte action for equation interactivity (copy LaTeX, zoom modal)
 */

interface EquationState {
	zoomModal: HTMLDivElement | null;
	copyTimeout: ReturnType<typeof setTimeout> | null;
}

/**
 * Creates and shows the zoom modal for an equation
 */
function showZoomModal(equationWrapper: HTMLElement, state: EquationState): void {
	// Get the equation content
	const equationContent = equationWrapper.querySelector('.equation-content');
	if (!equationContent) return;

	// Create modal backdrop
	const modal = document.createElement('div');
	modal.className = 'equation-zoom-modal';
	modal.setAttribute('role', 'dialog');
	modal.setAttribute('aria-modal', 'true');
	modal.setAttribute('aria-label', 'Stækkuð jafna');

	// Create modal content
	const modalContent = document.createElement('div');
	modalContent.className = 'equation-zoom-content';

	// Clone the equation and scale it up
	const equationClone = equationContent.cloneNode(true) as HTMLElement;
	equationClone.className = 'equation-zoomed';

	// Get LaTeX for copy button
	const latex = equationWrapper.getAttribute('data-latex') || '';

	// Create action buttons
	const actions = document.createElement('div');
	actions.className = 'equation-zoom-actions';

	const copyBtn = document.createElement('button');
	copyBtn.className = 'equation-zoom-copy-btn';
	copyBtn.textContent = 'Afrita LaTeX';
	copyBtn.addEventListener('click', async () => {
		await copyLatex(latex, copyBtn);
	});

	const closeBtn = document.createElement('button');
	closeBtn.className = 'equation-zoom-close-btn';
	closeBtn.textContent = 'Loka';
	closeBtn.addEventListener('click', () => {
		closeZoomModal(state);
	});

	actions.appendChild(copyBtn);
	actions.appendChild(closeBtn);

	modalContent.appendChild(equationClone);
	modalContent.appendChild(actions);
	modal.appendChild(modalContent);

	// Close on backdrop click
	modal.addEventListener('click', (e) => {
		if (e.target === modal) {
			closeZoomModal(state);
		}
	});

	// Close on Escape key
	const handleEscape = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			closeZoomModal(state);
			document.removeEventListener('keydown', handleEscape);
		}
	};
	document.addEventListener('keydown', handleEscape);

	document.body.appendChild(modal);
	state.zoomModal = modal;

	// Focus the close button for accessibility
	closeBtn.focus();
}

/**
 * Closes the zoom modal
 */
function closeZoomModal(state: EquationState): void {
	if (state.zoomModal) {
		state.zoomModal.remove();
		state.zoomModal = null;
	}
}

/**
 * Copies text to clipboard and shows feedback
 */
async function copyToClipboard(text: string, button: HTMLButtonElement, successText = '✓ Afritað'): Promise<void> {
	if (!text) return;

	try {
		await navigator.clipboard.writeText(text);
		const originalText = button.textContent;
		button.textContent = successText;
		setTimeout(() => {
			button.textContent = originalText;
		}, 2000);
	} catch {
		// Fallback for older browsers
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.position = 'fixed';
		textArea.style.left = '-9999px';
		document.body.appendChild(textArea);
		textArea.select();
		document.execCommand('copy');
		document.body.removeChild(textArea);

		const originalText = button.textContent;
		button.textContent = successText;
		setTimeout(() => {
			button.textContent = originalText;
		}, 2000);
	}
}

/**
 * Copies LaTeX to clipboard
 */
async function copyLatex(latex: string, button: HTMLButtonElement): Promise<void> {
	await copyToClipboard(latex, button);
}

/**
 * Copies equation permalink to clipboard
 */
async function copyCitation(wrapper: HTMLElement, button: HTMLButtonElement): Promise<void> {
	const id = wrapper.id || wrapper.closest('[id]')?.id || '';
	const url = id ? `${window.location.origin}${window.location.pathname}#${id}` : window.location.href;
	await copyToClipboard(url, button, '✓ Afritað');
}

/**
 * Enhances a .equation div with wrapper class, content wrapper, and action buttons
 */
function enhanceEquation(eq: HTMLElement): void {
	// Skip if already enhanced
	if (eq.classList.contains('equation-wrapper')) return;

	eq.classList.add('equation-wrapper');
	eq.setAttribute('tabindex', '0');

	// Get LaTeX from the mathjax-display span
	const mathSpan = eq.querySelector('.mathjax-display');
	const latex = mathSpan?.getAttribute('data-latex') || '';

	// Store latex on the wrapper for the zoom modal
	if (latex) {
		eq.setAttribute('data-latex', latex);
	}

	// Wrap existing children in .equation-content
	const contentWrapper = document.createElement('div');
	contentWrapper.className = 'equation-content';
	while (eq.firstChild) {
		contentWrapper.appendChild(eq.firstChild);
	}
	eq.appendChild(contentWrapper);

	// Create action buttons
	const actions = document.createElement('div');
	actions.className = 'equation-actions';

	if (latex) {
		const copyBtn = document.createElement('button');
		copyBtn.className = 'equation-copy-btn';
		copyBtn.setAttribute('data-action', 'copy-latex');
		copyBtn.setAttribute('aria-label', 'Afrita LaTeX');
		copyBtn.textContent = 'LaTeX';
		actions.appendChild(copyBtn);
	}

	const citeBtn = document.createElement('button');
	citeBtn.className = 'equation-copy-btn';
	citeBtn.setAttribute('data-action', 'copy-citation');
	citeBtn.setAttribute('aria-label', 'Afrita tengil');
	citeBtn.textContent = '🔗';
	actions.appendChild(citeBtn);

	const zoomBtn = document.createElement('button');
	zoomBtn.className = 'equation-zoom-btn';
	zoomBtn.setAttribute('data-action', 'zoom-equation');
	zoomBtn.setAttribute('aria-label', 'Stækka jöfnu');
	zoomBtn.textContent = '⊕';
	actions.appendChild(zoomBtn);

	eq.appendChild(actions);
}

/**
 * Svelte action for equation interactions
 * Attach to a container element to enable copy/zoom on all equations within
 */
export function equations(node: HTMLElement) {
	const state: EquationState = {
		zoomModal: null,
		copyTimeout: null
	};

	// Enhance all equation divs with interactive buttons
	node.querySelectorAll<HTMLElement>('.equation').forEach(enhanceEquation);

	function handleClick(event: Event) {
		const target = event.target as HTMLElement;

		// Handle copy LaTeX button
		if (target.matches('[data-action="copy-latex"]')) {
			const wrapper = target.closest('.equation-wrapper');
			if (wrapper) {
				const latex = wrapper.getAttribute('data-latex') || '';
				copyLatex(latex, target as HTMLButtonElement);
			}
			return;
		}

		// Handle copy citation button
		if (target.matches('[data-action="copy-citation"]')) {
			const wrapper = target.closest('.equation-wrapper') as HTMLElement;
			if (wrapper) {
				copyCitation(wrapper, target as HTMLButtonElement);
			}
			return;
		}

		// Handle zoom button
		if (target.matches('[data-action="zoom-equation"]')) {
			const wrapper = target.closest('.equation-wrapper') as HTMLElement;
			if (wrapper) {
				showZoomModal(wrapper, state);
			}
			return;
		}
	}

	node.addEventListener('click', handleClick);

	return {
		destroy() {
			node.removeEventListener('click', handleClick);
			closeZoomModal(state);
			if (state.copyTimeout) {
				clearTimeout(state.copyTimeout);
			}
		}
	};
}
