/**
 * The messages the service worker answers (worker.ts adds this as its `message` listener).
 *
 * - OFFLINE_CAPS_MESSAGE: the page asks the ACTIVE worker whether it serves downloaded books
 *   from offline-book:<slug> before it starts a download (stores/offline.ts). A worker from
 *   before that change does not answer, so the page asks the reader to update first.
 * - SKIP_WAITING: the update prompt ("Uppfæra", PWAUpdater.svelte) asks the waiting worker to
 *   take over (workbox-window's messageSkipWaiting).
 */
import { OFFLINE_CAPS_MESSAGE } from './runtimeCaching';

export function onWorkerMessage(
	event: Pick<MessageEvent, 'data' | 'ports'>,
	worker: { skipWaiting: () => Promise<void> }
): void {
	const type = (event.data as { type?: unknown } | null | undefined)?.type;
	if (type === OFFLINE_CAPS_MESSAGE) event.ports[0]?.postMessage({ offlineBook: 1 });
	else if (type === 'SKIP_WAITING') void worker.skipWaiting();
}
