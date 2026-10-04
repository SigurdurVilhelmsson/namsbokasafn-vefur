// Imported by the generated service worker (vite.config.ts, workbox.importScripts).
// Answers the page's capability check: this worker serves downloaded books from
// offline-book:<slug> (src/lib/sw/runtimeCaching.ts). A worker from before that
// change does not answer, so the page asks the reader to update before a download
// that the old worker could never serve offline.
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'NB_OFFLINE_BOOK_CAPS' && event.ports[0]) {
		event.ports[0].postMessage({ offlineBook: 1 });
	}
});
