var fs = require('fs');
var url = require('url');
var http = require('http');
var WebSocket = require('ws');
var mysql = require('mysql2');

// Kết nối đến MySQL trên Railway
var db = mysql.createConnection({
    host: 'junction.proxy.rlwy.net', // Hostname từ Railway
    port: 25046,                     // Port từ Railway
    user: 'root',                    // Username
    password: 'zpjJkyXxIEVEorajqAfAZxxOGVLOHDnZ', // Password
    database: 'railway'              // Tên database
});

db.connect(function(err) {
    if (err) {
        console.error('MySQL connection failed:', err.message);
        return;
    }
    console.log('Connected to MySQL on Railway');
});

// Tạo HTTP server
function requestHandler(request, response) {
    fs.readFile('./index.html', function(error, content) {
        if (error) {
            response.writeHead(500);
            response.end('Error loading index.html');
        } else {
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end(content);
        }
    });
}

var server = http.createServer(requestHandler);
var ws = new WebSocket.Server({ server });
var clients = [];

// Lưu trạng thái vào MySQL
function saveToDatabase(status) {
    var query = 'INSERT INTO status_log (time, status) VALUES (NOW(), ?)';
    db.query(query, [status], function(err, result) {
        if (err) {
            console.error('Error saving to database:', err.message);
        } else {
            console.log('Data saved, Insert ID:', result.insertId);
        }
    });
}

// Broadcast dữ liệu đến tất cả client
function broadcast(socket, data) {
    console.log('Broadcasting to clients:', clients.length);
    clients.forEach(client => {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

ws.on('connection', function(socket) {
    clients.push(socket);
    console.log('New client connected');

    socket.on('message', function(message) {
        console.log('Received:', message);
        saveToDatabase(message); // Lưu trạng thái vào database
        broadcast(socket, message); // Gửi đến các client khác
    });

    socket.on('close', function() {
        clients = clients.filter(client => client !== socket);
        console.log('Client disconnected');
    });
});

// Lắng nghe trên cổng 3000
server.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
});
