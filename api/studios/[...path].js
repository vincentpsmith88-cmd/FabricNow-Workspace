import { Readable } from 'node:stream';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);
const SENSITIVE_REQUEST_HEADERS = new Set(['authorization', 'cookie', 'x-api-key', 'x-auth-token']);

export default async function handler(req, res) {
  const configuredOrigin = process.env.FABRIC_STUDIO_ORIGIN;
  if (!configuredOrigin) {
    return res.status(503).json({
      error: 'FabricNow Studio is not connected. Set FABRIC_STUDIO_ORIGIN in the workspace Vercel project.'
    });
  }

  let origin;
  try {
    origin = new URL(configuredOrigin);
    if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password ||
        origin.pathname !== '/' || origin.search || origin.hash) {
      throw new Error('Expected a plain HTTP(S) origin without a path.');
    }
  } catch (error) {
    console.error('Invalid FABRIC_STUDIO_ORIGIN:', error);
    return res.status(500).json({ error: 'The FabricNow Studio origin is incorrectly configured.' });
  }

  const incoming = new URL(req.url || '/', 'http://workspace.invalid');
  const apiPrefix = '/api/studios';
  if (incoming.pathname !== apiPrefix && !incoming.pathname.startsWith(`${apiPrefix}/`)) {
    return res.status(404).json({ error: 'Studio route not found.' });
  }

  const route = incoming.pathname.slice(apiPrefix.length);
  const segments = route.split('/').filter(Boolean);
  try {
    for (const segment of segments) {
      const decoded = decodeURIComponent(segment);
      if (decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')) {
        return res.status(400).json({ error: 'Invalid Studio path.' });
      }
    }
  } catch {
    return res.status(400).json({ error: 'Invalid Studio path encoding.' });
  }

  const target = new URL(`/studios${route}`, origin);
  target.search = incoming.search;
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value && !HOP_BY_HOP_HEADERS.has(name.toLowerCase()) &&
        !SENSITIVE_REQUEST_HEADERS.has(name.toLowerCase())) {
      headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
  }
  headers.delete('accept-encoding');

  try {
    const method = req.method || 'GET';
    const options = { method, headers, redirect: 'manual' };
    if (method !== 'GET' && method !== 'HEAD') {
      options.body = req;
      options.duplex = 'half';
    }
    const upstream = await fetch(target, options);
    res.statusCode = upstream.status;
    upstream.headers.forEach((value, name) => {
      const lowerName = name.toLowerCase();
      if (lowerName !== 'location' && lowerName !== 'set-cookie' &&
          !HOP_BY_HOP_HEADERS.has(lowerName)) res.setHeader(name, value);
    });
    const location = upstream.headers.get('location');
    if (location) {
      const redirect = new URL(location, target);
      res.setHeader('location', redirect.origin === origin.origin
        ? `${redirect.pathname}${redirect.search}${redirect.hash}`
        : location);
    }

    if (!upstream.body || method === 'HEAD') return res.end();
    return Readable.fromWeb(upstream.body).on('error', error => {
      console.error('FabricNow Studio response stream failed:', error);
      res.destroy(error);
    }).pipe(res);
  } catch (error) {
    console.error('FabricNow Studio proxy request failed:', error);
    if (!res.headersSent) {
      return res.status(502).json({ error: 'FabricNow Studio could not be reached.' });
    }
    return res.destroy(error);
  }
}
