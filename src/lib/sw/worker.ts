/**
 * The service worker. @vite-pwa/sveltekit's `buildSW` strategy (vite.config.ts) bundles this
 * file with the workbox modules it imports and writes it to build/sw.js, with the precache
 * manifest injected where `self.__WB_MANIFEST` stands.
 *
 * It does what kit 2's generated worker did, in the same order: answer the page's messages,
 * precache the app shell, drop older precaches, register the routes. No clientsClaim and no
 * skipWaiting at install: a new worker waits until the reader presses "Uppfæra"
 * (registerType 'prompt', messages.ts).
 *
 * Not SvelteKit's own service worker (src/service-worker.ts), which kit would build and
 * register itself.
 */
import { cleanupOutdatedCaches, precacheAndRoute } from '@vite-pwa/workbox-swkit/precaching';
import { registerRoute } from '@vite-pwa/workbox-swkit/routing';
import { onWorkerMessage } from './messages';
import { bookRoutes } from './routes';

// The worker's global scope, typed here so the app's DOM types need no webworker lib.
declare const self: {
	__WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
	skipWaiting: () => Promise<void>;
	addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
};

self.addEventListener('message', (event) => onWorkerMessage(event, self));
precacheAndRoute(self.__WB_MANIFEST, {});
cleanupOutdatedCaches();
for (const route of bookRoutes()) registerRoute(route.match, route.strategy, route.method);
