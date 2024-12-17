var fs = require('fs');
var url = require('url');
var http = require('http');
var WebSocket = require('ws');
var mysql = require('mysql2');

// Kết nối đến MySQL
var db = mysql.createConnection({
    host: 'junction.proxy.rlwy.net:25046',   // Thay bằng host của Railway
    user: 'root',       // Username MySQL
    password: 'zpjJkyXxIEVEorajqAfAZxxOGVLOHDnZ',   // Password MySQL
    database: 'railway',    // Tên database
});

db.connect(function(err) {
    if (err) throw err;
    console.log('MySQL connected...');
});

// Function gửi file HTML
function requestHandler(request, response) {
    fs.readFile('./index.html', function(error, content) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(content);
    });
}

// Tạo HTTP server
var server = http.createServer(requestHandler);
var ws = new WebSocket.Server({ server });
var clients = [];

// Lưu trạng thái vào database
function saveToDatabase(status) {
    var query = 'INSERT INTO status_log (time, status) VALUES (NOW(), ?)';
    db.query(query, [status], function(err, result) {
        if (err) {
            console.error('Error inserting into database:', err);
        } else {
            console.log('Saved to database, id:', result.insertId);
        }
    });
}

// Broadcast dữ liệu đến tất cả client
function broadcast(socket, data) {
    console.log(clients.length);
    for (var i = 0; i < clients.length; i++) {
        if (clients[i] != socket) {
            clients[i].send(data);
        }
    }
}

ws.on('connection', function(socket, req) {
    clients.push(socket);
    socket.on('message', function(message) {
        console.log('received: %s', message);
        broadcast(socket, message);
    });
    socket.on('close', function() {
        var index = clients.indexOf(socket);
        clients.splice(index, 1);
        console.log('disconnected');
    });
});
server.listen(3000);
console.log('Server listening on port 3000');
