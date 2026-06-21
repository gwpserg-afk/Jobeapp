// Vercel Routing Middleware — Basic Auth gate for the private Jobé dashboard.
// Runs on the Edge before any page is served, on every route.
//
// Credentials come from environment variables (NEVER hardcoded / committed):
//   DASHBOARD_USER     – optional, defaults to "admin"
//   DASHBOARD_PASSWORD – required; set in Vercel → Settings → Environment Variables
//
// Fail-closed: if DASHBOARD_PASSWORD is not set, nobody gets in.

export const config = {
  matcher: '/(.*)', // protect every route
};

export default function middleware(request) {
  const USER = process.env.DASHBOARD_USER || 'admin';
  const PASS = process.env.DASHBOARD_PASSWORD;

  const deny = (msg) =>
    new Response(msg, {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Jobé Dashboard", charset="UTF-8"',
      },
    });

  // No password configured → stay locked (fail closed).
  if (!PASS) return deny('Dashboard not configured. Set DASHBOARD_PASSWORD in Vercel.');

  const header = request.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try {
      decoded = atob(encoded);
    } catch {
      decoded = '';
    }
    const i = decoded.indexOf(':');
    if (i !== -1 && decoded.slice(0, i) === USER && decoded.slice(i + 1) === PASS) {
      return; // authenticated → continue to the static dashboard
    }
  }

  return deny('Authentication required.');
}
