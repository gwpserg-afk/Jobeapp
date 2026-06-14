// Local dev server for the Jobé dashboard.
// Serves the static files AND a /api/tunnel endpoint that reads the live Expo
// ngrok tunnel server-side, so the QR auto-updates without any manual pasting.
//   Run:  bun serve.js
import { serve, file } from "bun";

const ROOT = import.meta.dir;
const PORT = 4321;

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Live Expo tunnel URL (same-origin, so the browser can fetch it with no CORS issue)
    if (url.pathname === "/api/tunnel") {
      try {
        const r = await fetch("http://127.0.0.1:4040/api/tunnels");
        const data = await r.json();
        const https = (data.tunnels || []).map((t) => t.public_url).find((u) => u && u.startsWith("https"));
        return Response.json({ url: https ? https.replace(/^https/, "exp") : null });
      } catch {
        return Response.json({ url: null });
      }
    }

    // Static files
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const f = file(ROOT + decodeURIComponent(path));
    if (await f.exists()) return new Response(f);
    return new Response("Not found", { status: 404 });
  },
});

console.log("Jobé dashboard → http://127.0.0.1:" + PORT);
