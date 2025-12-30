/**
 * Cloudflare Worker: TTS Proxy for Tiro.is
 *
 * Proxies requests to tts.tiro.is with CORS headers added.
 * Deploy with: npx wrangler deploy
 *
 * Configure allowed origins in the ALLOWED_ORIGINS array.
 */

const TIRO_API = 'https://tts.tiro.is/v0/speech';

// Add your production domains here
const ALLOWED_ORIGINS = [
  'https://www.efnafraedi.app',
  'https://efnafraedi.app',
  'http://localhost:5173', // Development
  'http://127.0.0.1:5173',
];

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const origin = request.headers.get('Origin');

    // Validate origin
    if (!isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      // Forward request to Tiro.is
      const body = await request.text();

      const response = await fetch(TIRO_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(errorText, {
          status: response.status,
          headers: corsHeaders(origin),
        });
      }

      // Return audio with CORS headers
      const audioBlob = await response.arrayBuffer();

      return new Response(audioBlob, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          ...corsHeaders(origin),
        },
      });
    } catch (error) {
      return new Response(`Proxy error: ${error.message}`, {
        status: 500,
        headers: corsHeaders(origin),
      });
    }
  },
};

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

function handleCORS(request) {
  const origin = request.headers.get('Origin');

  if (!isAllowedOrigin(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
