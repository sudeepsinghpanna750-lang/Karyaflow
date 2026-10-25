// Tiny fetch wrapper with cookie auth + CSRF double-submit.
const API = {
  csrf: null,
  async init() {
    try {
      const r = await fetch('/api/auth/csrf', { credentials: 'include' });
      const j = await r.json();
      this.csrf = j.csrfToken;
    } catch (e) { /* offline */ }
  },
  async req(path, opts = {}) {
    opts.credentials = 'include';
    opts.headers = Object.assign({}, opts.headers, { 'Content-Type': 'application/json' });
    if (this.csrf) opts.headers['X-CSRF-Token'] = this.csrf;
    const res = await fetch('/api' + path, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (data && data.csrfToken) this.csrf = data.csrfToken; // keep fresh after login
    return { status: res.status, data };
  },
  get(p) { return this.req(p, { method: 'GET' }); },
  post(p, body) { return this.req(p, { method: 'POST', body: JSON.stringify(body || {}) }); },
  put(p, body) { return this.req(p, { method: 'PUT', body: JSON.stringify(body || {}) }); },
  del(p) { return this.req(p, { method: 'DELETE' }); },
};

function moneyFormat(usd) {
  return '$' + Number(usd).toFixed(usd % 1 === 0 ? 0 : 2);
}
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function planBadge(plan, expires) {
  const map = { free: ['Free', '#64748b'], normal: ['Normal', '#a78bfa'], standard: ['Standard', '#22d3ee'], premium: ['Premium', '#34d399'] };
  const [label, color] = map[plan] || map.free;
  let extra = '';
  if ((plan === 'standard' || plan === 'premium') && expires) {
    const d = new Date(Number(expires));
    if (d.getTime() > Date.now()) extra = ' · until ' + d.toLocaleDateString();
  }
  return `<span class="pill"><span class="dot" style="background:${color}"></span>${label}${extra}</span>`;
}
