import http from 'node:http';

const s = http.createServer((req, res) => res.end('ok'));
s.listen(9678, () => {
  console.log('child listening on 9678, pid', process.pid);
});
