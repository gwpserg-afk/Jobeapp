// Vercel Routing Middleware — cookie-based auth gate for the private Jobé dashboard.
// Runs on the Edge before any page is served, on every route.
//
// Flow:
//   - Unauthenticated requests are redirected to /login.html (a styled page).
//   - POST /api/login checks username + password and, if correct, sets an auth cookie.
//   - /api/logout clears the cookies.
//
// Credentials come from env vars (NEVER hardcoded / committed):
//   DASHBOARD_USER     – optional, defaults to "admin"
//   DASHBOARD_PASSWORD – the admin password (set in Vercel → Settings → Environment Variables)
//   DASHBOARD_USERS    – optional, extra logins for partners. Format:
//                        "alice:pass1, bob:pass2"  (comma- or newline-separated)
//
// Fail-closed: if no credentials are configured, nobody gets in.

export const config = {
  matcher: '/(.*)',
};

const COOKIE = 'jobe_auth';
const USER_COOKIE = 'jobe_user';
const SALT = 'jobe-dashboard-v1'; // not secret — just domain-separates the cookie token
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Build the list of valid {user, pass} credentials from env.
function getCredentials() {
  const creds = [];
  const adminPass = process.env.DASHBOARD_PASSWORD;
  if (adminPass) {
    creds.push({ user: (process.env.DASHBOARD_USER || 'admin').toLowerCase(), pass: adminPass });
  }
  const extra = process.env.DASHBOARD_USERS;
  if (extra) {
    for (const pair of extra.split(/[,\n]/)) {
      const t = pair.trim();
      if (!t) continue;
      const i = t.indexOf(':');
      if (i > 0) creds.push({ user: t.slice(0, i).trim().toLowerCase(), pass: t.slice(i + 1).trim() });
    }
  }
  return creds;
}

// Opaque per-credential cookie token (raw password never lands in the cookie).
async function tokenFor(user, pass) {
  const data = new TextEncoder().encode(`${user}:${pass}:${SALT}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const creds = getCredentials();

  // Fail closed.
  if (creds.length === 0) {
    return new Response('Dashboard not configured. Set DASHBOARD_PASSWORD in Vercel.', {
      status: 503,
    });
  }

  // ----- Login submission -----
  if (path === '/api/login' && request.method === 'POST') {
    let username = '';
    let password = '';
    try {
      const form = await request.formData();
      username = String(form.get('username') || '').trim().toLowerCase();
      password = String(form.get('password') || '');
    } catch {
      /* ignore */
    }
    const match = creds.find((c) => c.user === username && c.pass === password);
    if (match) {
      const token = await tokenFor(match.user, match.pass);
      const headers = new Headers({ Location: '/' });
      headers.append(
        'Set-Cookie',
        `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`
      );
      // Readable cookie so the dashboard can greet the user / show per-partner views later.
      headers.append(
        'Set-Cookie',
        `${USER_COOKIE}=${encodeURIComponent(match.user)}; Path=/; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`
      );
      return new Response(null, { status: 303, headers });
    }
    return new Response(null, { status: 303, headers: { Location: '/login.html?error=1' } });
  }

  // ----- Logout -----
  if (path === '/api/logout') {
    const headers = new Headers({ Location: '/login.html' });
    headers.append('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    headers.append('Set-Cookie', `${USER_COOKIE}=; Path=/; Secure; SameSite=Lax; Max-Age=0`);
    return new Response(null, { status: 303, headers });
  }

  // ----- Is the request authenticated? -----
  const cookies = request.headers.get('cookie') || '';
  const m = cookies.match(new RegExp(`(?:^|; )${COOKIE}=([a-f0-9]+)`));
  let authed = false;
  if (m) {
    for (const c of creds) {
      if ((await tokenFor(c.user, c.pass)) === m[1]) {
        authed = true;
        break;
      }
    }
  }

  // Assets the login page itself needs (allowed without auth).
  const isPublicAsset =
    path === '/login.html' || path === '/jobe-logo-3.png' || path === '/api/login';

  if (authed) {
    if (path === '/login.html') return new Response(null, { status: 303, headers: { Location: '/' } });
    return; // continue to the static dashboard
  }

  if (isPublicAsset) return; // let the login page + its assets load
  return new Response(null, { status: 303, headers: { Location: '/login.html' } });
}
