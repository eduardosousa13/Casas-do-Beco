import assert from 'node:assert/strict';
import {test} from 'node:test';
import {securityHeaders,pageCsp} from '../server/app';

test('HTML pages allow only their own inline scripts and every response asks for HTTPS',()=>{
 const html='<script>a()</script><script type="application/ld+json">{"x":1}</script><script type="module" src="/m.js"></script>';
 const csp=pageCsp(html);
 assert.equal(csp.match(/sha256-/g)?.length,1);
 assert.match(csp,/script-src 'self' 'sha256-[A-Za-z0-9+/=]+';/);
 assert.match(csp,/frame-ancestors 'none'/);assert.doesNotMatch(csp,/unsafe-eval|fonts\.g/);
 assert.match(pageCsp('',true),/fonts\.gstatic\.com/);
 assert.equal(securityHeaders('/').get('strict-transport-security'),'max-age=31536000');
 assert.equal(securityHeaders('/admin').get('referrer-policy'),'no-referrer');
});
