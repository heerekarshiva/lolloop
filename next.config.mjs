const sb = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : '*.supabase.co';
const csp = `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval'"} https://pagead2.googlesyndication.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://${sb} wss://${sb} https://*.google-analytics.com; frame-src https://googleads.g.doubleclick.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`;
export default { poweredByHeader: false, async headers() { return [{ source: '/(.*)', headers: [
  { key: 'Content-Security-Policy', value: csp.replace(/\s+/g, ' ') }, { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }] }]; } };
