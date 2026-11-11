/**
 * The messages the service worker answers (messages.ts): the page's check that this worker
 * serves downloaded books (stores/offline.ts), and the update prompt's request to take over
 * (PWAUpdater.svelte, through workbox-window's messageSkipWaiting).
 */
import { describe, it, expect, vi } from 'vitest';
import { onWorkerMessage } from './messages';
import { OFFLINE_CAPS_MESSAGE } from './runtimeCaching';

const port = () => ({ postMessage: vi.fn() });
const worker = () => ({ skipWaiting: vi.fn().mockResolvedValue(undefined) });
const message = (data: unknown, ports: unknown[] = []) => ({ data, ports }) as unknown as MessageEvent;

describe('the downloaded-book check', () => {
	it('is answered on the port the page sent', () => {
		const reply = port();
		onWorkerMessage(message({ type: OFFLINE_CAPS_MESSAGE }, [reply]), worker());
		expect(reply.postMessage).toHaveBeenCalledWith({ offlineBook: 1 });
	});

	it('does not make the worker take over', () => {
		const sw = worker();
		onWorkerMessage(message({ type: OFFLINE_CAPS_MESSAGE }, [port()]), sw);
		expect(sw.skipWaiting).not.toHaveBeenCalled();
	});

	it('is ignored when no port came with it', () => {
		expect(() => onWorkerMessage(message({ type: OFFLINE_CAPS_MESSAGE }), worker())).not.toThrow();
	});
});

describe('the update prompt', () => {
	it('makes the waiting worker take over on SKIP_WAITING', () => {
		const sw = worker();
		onWorkerMessage(message({ type: 'SKIP_WAITING' }), sw);
		expect(sw.skipWaiting).toHaveBeenCalledOnce();
	});
});

describe('any other message', () => {
	it.each([[{ type: 'SOMETHING_ELSE' }], [null], [undefined], ['SKIP_WAITING']])('%j is ignored', (data) => {
		const sw = worker();
		const reply = port();
		onWorkerMessage(message(data, [reply]), sw);
		expect(sw.skipWaiting).not.toHaveBeenCalled();
		expect(reply.postMessage).not.toHaveBeenCalled();
	});
});
