import http from 'node:http';
const s = http.createServer((req, res) => {
  if (req.url === '/error') {
    console.error('ERROR request failed');
    console.error('  at handleRequest');
    console.error('  at Server.emit');
    res.writeHead(500);
    res.end('fail');
  } else {
    console.log('OK ' + req.url);
    res.end('ok');
  }
});
s.listen(9567, () => console.log('listening on 9567'));
