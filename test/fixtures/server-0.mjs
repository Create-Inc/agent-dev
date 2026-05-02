
  import http from 'node:http';
  const s = http.createServer((req, res) => res.end('ok'));
  s.listen(0, () => console.log('listening on http://localhost:0'));
