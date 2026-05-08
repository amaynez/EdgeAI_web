import { POST } from './src/app/api/lead/retry/route.ts';

const req = new Request('http://localhost/api/lead/retry', {
  method: 'POST',
  body: JSON.stringify(null),
});

const res = await POST(req);
console.log(res.status);
console.log(await res.json());
