import service from './service.js';

const port = Number(process.env.PORT || 4000);
const corsHeaders = request => {
  const origin = request.headers.get('origin');
  const isLocalhostOrigin = origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  return isLocalhostOrigin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
      }
    : {};
};

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const headers = corsHeaders(request);

    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers,
      });

    if (request.method === 'POST' && url.pathname === '/olympicWinners') {
      const body = await request.json();
      return Response.json(await service.getData(body), { headers });
    }

    return new Response('Not found', { status: 404, headers });
  },
});

console.log(`Started on http://localhost:${port}`);
