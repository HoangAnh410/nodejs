// Import các module cần thiết
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const mysql = require('mysql2');

// Kết nối MySQL
const db = mysql.createConnection({
    host: 'junction.proxy.rlwy.net', // Thông tin host từ Railway
    port: 25046,                     // Port từ Railway
    user: 'root',                    // Tên người dùng MySQL
    password: 'zpjJkyXxIEVEorajqAfAZxxOGVLOHDnZ', // Mật khẩu
    database: 'railway'              // Tên cơ sở dữ liệu
});

// Kết nối và kiểm tra MySQL
db.connect(err => {
    if (err) {
        console.error('Không thể kết nối MySQL:', err.message);
        return;
    }
    console.log('Đã kết nối MySQL trên Railway');
});

// Hàm gửi file HTML đến client
function requestHandler(request, response) {
    fs.readFile('./index.html', (error, content) => {
        if (error) {
            response.writeHead(500);
            response.end('Không thể tải file index.html');
        } else {
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end(content);
        }
    });
}

// Tạo HTTP server
const server = http.createServer(requestHandler);

// Tạo WebSocket server
const ws = new WebSocket.Server({ server });
const clients = []; // Danh sách client kết nối

// Hàm lưu trạng thái vào bảng MySQL
function saveToDatabase(status) {
    const query = 'INSERT INTO your_table_name (status, time) VALUES (?, NOW())';
    db.query(query, [status], (err, result) => {
        if (err) {
            console.error('Lỗi lưu dữ liệu vào MySQL:', err.message);
        } else {
            console.log('Dữ liệu đã lưu thành công, ID:', result.insertId);
        }
    });
}

// Phát dữ liệu đến tất cả các client khác
function broadcast(socket, data) {
    clients.forEach(client => {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// Xử lý kết nối WebSocket
ws.on('connection', socket => {
    clients.push(socket);
    console.log('Client mới đã kết nối');

    // Nhận tin nhắn từ client
    socket.on('message', message => {
        console.log('Tin nhắn nhận được:', message);
        saveToDatabase(message); // Lưu tin nhắn vào MySQL
        broadcast(socket, message); // Gửi tin nhắn đến các client khác
    });

    // Xử lý khi client ngắt kết nối
    socket.on('close', () => {
        clients.splice(clients.indexOf(socket), 1);
        console.log('Client đã ngắt kết nối');
    });
});

// Lắng nghe trên cổng 3000
server.listen(3000, () => {
    console.log('Server đang chạy tại http://localhost:3000');
});
