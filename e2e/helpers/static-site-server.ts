/**
 * A small HTTP server for a built site (`build/`), answering the way the live
 * nginx does, so service-worker tests see a deploy rather than `vite preview`:
 *
 * - a path ending in `/` (or naming a directory) serves its `index.html`;
 * - a missing file under `/_app/immutable/` is a 404 (nginx's `^~ /_app/` block);
 * - any other missing path gets `/200.html` with status 200 (`try_files … /200.html`);
 * - `/_app/immutable/` is cached for a year, everything else revalidates.
 *
 * `swap(root)` deploys another build at the same origin. Earlier roots stay
 * readable for `/_app/immutable/` only, as the deploy's `P /_app/immutable/**`
 * rule keeps old hashed assets on the server. `override(path, body)` answers one
 * path with fixed bytes (a changed sw.js, a trimmed file list).
 */
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import type { AddressInfo } from 'node:net';

const TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.webmanifest': 'application/manifest+json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml',
	'.pdf': 'application/pdf'
};

export interface StaticSiteServer {
	origin: string;
	swap(root: string): void;
	override(path: string, body: string | Buffer | null, type?: string): void;
	close(): Promise<void>;
}

function fileIn(root: string, path: string): string | null {
	const full = normalize(join(root, path));
	if (!full.startsWith(normalize(root))) return null;
	if (!existsSync(full)) return null;
	if (statSync(full).isDirectory()) {
		const index = join(full, 'index.html');
		return existsSync(index) ? index : null;
	}
	return full;
}

export async function startStaticSite(root: string): Promise<StaticSiteServer> {
	const roots = [root];
	const overrides = new Map<string, { body: Buffer; type: string }>();

	const server: Server = createServer((req, res) => {
		const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
		const immutable = path.startsWith('/_app/immutable/');
		const send = (status: number, body: Buffer, type: string) => {
			res.writeHead(status, {
				'Content-Type': type,
				'Cache-Control': immutable && status === 200 ? 'public, max-age=31536000, immutable' : 'no-cache'
			});
			res.end(req.method === 'HEAD' ? undefined : body);
		};

		const fixed = overrides.get(path);
		if (fixed) return send(200, fixed.body, fixed.type);

		const current = roots[roots.length - 1];
		const found = fileIn(current, path) ?? (immutable ? roots.map((r) => fileIn(r, path)).find(Boolean) : null);
		if (found) return send(200, readFileSync(found), TYPES[extname(found)] ?? 'application/octet-stream');
		if (immutable) return send(404, Buffer.from('Not Found'), 'text/plain; charset=utf-8');
		send(200, readFileSync(join(current, '200.html')), TYPES['.html']);
	});

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address() as AddressInfo;
	return {
		origin: `http://127.0.0.1:${port}`,
		swap(next) {
			roots.push(next);
		},
		override(path, body, type = 'text/javascript; charset=utf-8') {
			if (body === null) overrides.delete(path);
			else overrides.set(path, { body: Buffer.isBuffer(body) ? body : Buffer.from(body), type });
		},
		close: () => new Promise((resolve) => server.close(() => resolve()))
	};
}
