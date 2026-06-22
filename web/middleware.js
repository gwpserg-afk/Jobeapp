// Vercel Routing Middleware — cookie-based auth gate for the private Jobé dashboard.
// Runs on the Edge before any page is served, on every route.
//
// Flow:
//   - Unauthenticated requests are redirected to /login.html (a styled page).
//   - POST /api/login checks the password and, if correct, sets an auth cookie.
//   - /api/logout clears the cookie.
//
// The password comes from an env var (NEVER hardcoded / committed):
//   DASHBOARD_PASSWORD – required; set in Vercel → Settings → Environment Variables
// Fail-closed: if it's not set, nobody gets in.

export const config = {
  matcher: '/(.*)',
};

const COOKIE = 'jobe_auth';
const SALT = 'jobe-dashboard-v1'; // not secret — just domain-separates the cookie token
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Hash the password into an opaque cookie token (the real password never lands in the cookie).
async function tokenFor(password) {
  const data = new TextEncoder().encode(password + SALT);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function redirect(location, cookie) {
  const headers = { Location: location };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(null, { status: 303, headers });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const PASS = process.env.DASHBOARD_PASSWORD;

  // Fail closed.
  if (!PASS) {
    return new Response('Dashboard not configured. Set DASHBOARD_PASSWORD in Vercel.', {
      status: 503,
    });
  }

  const expected = await tokenFor(PASS);

  // ----- Login submission -----
  if (path === '/api/login' && request.method === 'POST') {
    let password = '';
    try {
      const form = await request.formData();
      password = String(form.get('password') || '');
    } catch {
      password = '';
    }
    if (password === PASS) {
      const cookie = `${COOKIE}=${expected}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
      return redirect('/', cookie);
    }
    return redirect('/login.html?error=1');
  }

  // ----- Logout -----
  if (path === '/api/logout') {
    const cleared = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
    return redirect('/login.html', cleared);
  }

  // ----- Is the request authenticated? -----
  const cookies = request.headers.get('cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|; )${COOKIE}=([a-f0-9]+)`));
  const authed = match && match[1] === expected;

  // Assets the login page itself needs (allowed without auth).
  const isPublicAsset =
    path === '/login.html' || path === '/jobe-logo-3.png' || path === '/api/login';

  if (authed) {
    // Already signed in — don't show the login page, send them to the dashboard.
    if (path === '/login.html') return redirect('/');
    return; // continue to the static dashboard
  }

  // Not signed in.
  if (isPublicAsset) return; // let the login page + its assets load
  return redirect('/login.html');
}
