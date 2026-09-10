import http from 'node:http';

const videos = [
    { id: 'v1', title: 'Introduction' },
    { id: 'v2', title: 'Introduction2' },
];

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/video') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(videos));
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
});

server.listen(7888, () => {
    console.log('Server running on http://localhost:7888');
});