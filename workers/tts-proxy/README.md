# TTS Proxy Worker

Cloudflare Worker that proxies requests to Tiro.is TTS API with CORS headers.

## Why is this needed?

The Tiro.is TTS API (`tts.tiro.is`) doesn't include CORS headers in responses,
so browsers block requests from web applications. This worker acts as a proxy
that adds the necessary CORS headers.

## Deployment

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Deploy the worker:
   ```bash
   cd workers/tts-proxy
   npx wrangler deploy
   ```

4. Note the worker URL (e.g., `https://tts-proxy.<your-subdomain>.workers.dev`)

5. Set the environment variable for your app build:
   ```bash
   VITE_TTS_PROXY_URL=https://tts-proxy.<your-subdomain>.workers.dev npm run build
   ```

## Configuration

Edit `worker.js` to update the `ALLOWED_ORIGINS` array with your production domains.

## Local Development

For local development, the TTS service will fall back to calling the Tiro.is API
directly. This works in development because you can use browser extensions or
disable CORS for testing, but won't work in production.

To test with the proxy locally:
1. Deploy the worker first
2. Create a `.env.local` file:
   ```
   VITE_TTS_PROXY_URL=https://tts-proxy.<your-subdomain>.workers.dev
   ```
3. Run `npm run dev`
