const config = require('../config');

function setAuthCookie(res, token) {
  res.cookie('kf_session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.secureCookies,
    path: '/',
    maxAge: 7 * 86400000,
  });
}
function setCsrfCookie(res, token) {
  res.cookie('kf_csrf', token, {
    httpOnly: false, // readable by JS so the SPA can echo it back
    sameSite: 'strict',
    secure: config.secureCookies,
    path: '/',
    maxAge: 7 * 86400000,
  });
}
function clearAuthCookie(res) {
  res.clearCookie('kf_session', { path: '/' });
  res.clearCookie('kf_csrf', { path: '/' });
}

module.exports = { setAuthCookie, setCsrfCookie, clearAuthCookie };
