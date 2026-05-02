
    import http from 'node:http';
    const s = http.createServer((req, res) => res.end('ok'));
    s.listen(9871, () => console.log('child on 9871'));
  