import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3104';
for (const path of ['/', '/sobre-nos', '/onde-estamos', '/contactos', '/casas/nascente', '/casas/poente', '/reserva/resultado', '/reserva/cancelada', '/src/assets/images/logo.png', '/interior.webm']) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  await response.arrayBuffer();
  console.log('OK', path);
}
assert.equal((await fetch(base + '/nao-existe-auditoria')).status, 404);
const rooms = await (await fetch(base + '/api/pms/rooms?house=poente')).json();
assert.ok(rooms.rooms.length);
const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const stay = { roomId: rooms.rooms[0].id, checkIn: '2027-06-10', checkOut: '2027-06-12', adults: 2, children: 0 };
const response = await post('/api/pms/quote', { stay });
assert.equal(response.status, 200);
const { quote } = await response.json();
assert.equal(quote.accommodationCents, 19000);
assert.equal(quote.bookingsEnabled, false);
assert.equal((await post('/api/pms/quote', { stay: { ...stay, checkOut: stay.checkIn } })).status, 400);
assert.equal((await post('/api/pms/stripe-webhook', {})).status, 400);
assert.equal((await fetch(base + '/api/pms/status?id=invalid')).status, 400);
assert.equal((await post('/api/pms/checkout', { requestKey:crypto.randomUUID(), stay, guest: {name:'Test Guest',email:'test@example.com',locale:'pt'}, expectedQuote:quote, policyVersion:quote.policy.version, termsAccepted:true, privacyAcknowledged:true }, {origin:process.env.TEST_ORIGIN_URL || base})).status, 503);
assert.equal((await post('/api/contact', {})).status, 400);
console.log('OK quote, invalid dates, unsigned webhook, status validation, disabled checkout, invalid contact');
const admin = await fetch(base + '/admin', { redirect: 'manual' });
assert.equal(admin.status, 302);
assert.equal(admin.headers.get('location'), '/admin/login');
assert.equal(admin.headers.get('cache-control'), 'no-store');
assert.equal((await fetch(base + '/admin/login')).status, 200);
for(const path of ['/admin/recover','/admin/reset-password']) {
  const response=await fetch(base+path);assert.equal(response.status,200);
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');
}
assert.equal((await fetch(base + '/api/admin/configuration')).status, 410);
assert.equal((await post('/api/admin/configuration', {}, { origin: 'https://attacker.example' })).status, 410);
assert.equal((await fetch(base + '/api/admin/operations?view=summary')).status,401);
assert.equal((await post('/api/admin/operations', {}, {origin:'https://attacker.example'})).status,403);
for (const path of ['/admin/history','/admin/sessions','/admin/calendar','/admin/reservations','/admin/finance']) {
  const response = await fetch(base + path, {redirect:'manual'});
  assert.equal(response.status,302); assert.equal(response.headers.get('location'),'/admin/login');
}
for (const path of ['/api/admin/history','/api/admin/sessions']) {
  const response = await fetch(base + path);
  assert.equal(response.status,401); assert.equal(response.headers.get('cache-control'),'no-store');
}
assert.equal((await post('/api/admin/sessions', {id:'test'}, {origin:'https://attacker.example'})).status,403);
console.log('OK admin redirect, login, anonymous API rejection, foreign Origin rejection');
