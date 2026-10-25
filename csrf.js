// Double-submit CSRF protection for state-changing, authenticated requests.
// The token is issued by the server in a readable cookie and must be echoed
// back in the X-CSRF-Token header. Combined with SameSite=strict cookies.
function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const header = req.headers['x-csrf-token'];
  const cookie = req.cookies && req.cookies['kf_csrf'];
  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }
  next();
}

module.exports = { csrfProtect };
