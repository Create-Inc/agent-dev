
  import http from 'node:http';
  const s = http.createServer((req, res) => res.end('ok'));
  s.listen(9873, () => console.log('listening on http://localhost:9873'));
