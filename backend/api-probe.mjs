const base = 'http://127.0.0.1:4000';
const guestId = 'probe-guest-0001';

async function call(label, path, options = {}) {
  try {
    const res = await fetch(`${base}${path}`, {
      redirect: 'manual',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 160); }
    console.log(label, res.status, JSON.stringify(body).slice(0, 400), res.headers.get('location') ? `LOCATION=${res.headers.get('location')}` : '');
    return { res, body };
  } catch (err) {
    console.log(label, 'NETWORK_ERROR', err.message);
    return { res: null, body: null };
  }
}

await call('HEALTH', '/api/health');
const login = await call('LOGIN', '/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'demo@linkora.io', password: 'Demo@1234' }),
});
const token = login.body?.token;
const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

const linksRes = await call('LIST', '/api/links', { headers: authHeaders });
const owned = linksRes.body?.links?.[0];
console.log('OWNED_LINK', owned ? { id: owned.id, slug: owned.slug, rescueCount: owned.rescueCount, style: owned.qrStyleConfig } : null);

const guest = await call('GUEST_CREATE', '/api/links/guest', {
  method: 'POST',
  headers: { 'X-Guest-Id': guestId },
  body: JSON.stringify({ originalUrl: 'https://example.com/probe-original' }),
});
const guestLink = guest.body?.link;
console.log('GUEST_LINK', guestLink ? { id: guestLink.id, slug: guestLink.slug } : null);

if (guestLink) {
  await call('GUEST_PATCH_LINK', `/api/links/${guestLink.id}`, {
    method: 'PATCH',
    headers: { 'X-Guest-Id': guestId },
    body: JSON.stringify({ originalUrl: 'https://example.com/probe-rescued' }),
  });
  await call('GUEST_PUT_LINK', `/api/links/${guestLink.id}`, {
    method: 'PUT',
    headers: { 'X-Guest-Id': guestId },
    body: JSON.stringify({ originalUrl: 'https://example.com/probe-rescued' }),
  });
  await call('GUEST_QR_SVG', `/api/qr/${guestLink.id}?format=svg`, {
    headers: { 'X-Guest-Id': guestId },
  });
}

if (owned) {
  const style = {
    dotStyle: 'dots',
    cornerStyle: 'extra-rounded',
    foregroundColor: '#123456',
    backgroundColor: '#ffffff',
    accentColor: '#abcdef',
    frameMode: 'center-logo',
    ctaText: 'PROBE',
    logoDataUrl: null,
  };
  await call('AUTH_PATCH_QR_STYLE', `/api/qr/${owned.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ qrStyleConfig: style }),
  });
  const check = await call('AUTH_GET_LINK', `/api/links/${owned.id}`, { headers: authHeaders });
  console.log('STYLE_PERSISTED', JSON.stringify(check.body?.link?.qrStyleConfig));

  await call('AUTH_PATCH_LINK_RESCUE', `/api/links/${owned.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ originalUrl: 'https://example.com/probe-owned-rescued', status: 'ACTIVE', expiresAt: null }),
  });
  const after = await call('AUTH_GET_LINK_AFTER', `/api/links/${owned.id}`, { headers: authHeaders });
  console.log('RESCUE_COUNT', after.body?.link?.rescueCount);
  await call('REDIRECT_SLUG', `/${owned.slug}`);
  await call('REDIRECT_R_SLUG', `/r/${owned.slug}`);
}
