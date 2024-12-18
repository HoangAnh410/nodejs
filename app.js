// Import các module cần thiết
var fs = require('fs'); // Đọc và ghi file
var url = require('url'); // Xử lý URL
var http = require('http'); // Tạo HTTP server
var WebSocket = require('ws'); // WebSocket để giao tiếp thời gian thực
var mysql = require('mysql2'); // MySQL driver để kết nối cơ sở dữ liệu

// Kết nối đến MySQL trên Railway
var db = mysql.createConnection({
    host: 'junction.proxy.rlwy.net', // Hostname được cung cấp bởi Railway
    port: 25046,                     // Port được cung cấp bởi Railway
    user: 'root',                    // Tên người dùng MySQL
    password: 'zpjJkyXxIEVEorajqAfAZxxOGVLOHDnZ', // Mật khẩu MySQL
    database: 'railway'              // Tên cơ sở dữ liệu
});

// Xử lý kết nối cơ sở dữ liệu
db.connect(function(err) {
    if (err) {
        console.error('MySQL connection failed:', err.message); // Thông báo lỗi kết nối
        return;
    }
    console.log('Connected to MySQL on Railway'); // Kết nối thành công
});

// Tạo HTTP server
function requestHandler(request, response) {
    // Đọc file HTML để phản hồi cho client
    fs.readFile('./index.html', function(error, content) {
        if (error) {
            // Gửi mã lỗi nếu không thể tải file
            response.writeHead(500);
            response.end('Error loading index.html');
        } else {
            // Gửi nội dung file HTML với mã phản hồi 200
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end(content);
        }
    });
}

// Khởi tạo HTTP server
var server = http.createServer(requestHandler);

// Tạo WebSocket server gắn vào HTTP server
var ws = new WebSocket.Server({ server });
var clients = []; // Mảng lưu trữ các client kết nối

// Hàm lưu trạng thái vào cơ sở dữ liệu MySQL
function saveToDatabase(status) {
    var query = 'INSERT INTO status_log (time, status) VALUES (NOW(), ?)'; // Câu lệnh SQL
    db.query(query, [status], function(err, result) {
        if (err) {
            console.error('Error saving to database:', err.message); // Thông báo lỗi
        } else {
            console.log('Data saved, Insert ID:', result.insertId); // Thông báo thành công
        }
    });
}

// Hàm gửi dữ liệu đến tất cả các client khác (ngoại trừ client gửi)
function broadcast(socket, data) {
    console.log('Broadcasting to clients:', clients.length); // Hiển thị số lượng client
    clients.forEach(client => {
        // Kiểm tra kết nối trước khi gửi
        if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(data); // Gửi dữ liệu
        }
    });
}

// Sự kiện khi có client kết nối WebSocket
ws.on('connection', function(socket) {
    clients.push(socket); // Lưu client vào mảng
    console.log('New client connected'); // Thông báo kết nối mới

    // Xử lý tin nhắn từ client
    socket.on('message', function(message) {
        console.log('Received:', message); // Hiển thị tin nhắn
        saveToDatabase(message); // Lưu tin nhắn vào cơ sở dữ liệu
        broadcast(socket, message); // Gửi tin nhắn đến các client khác
    });

    // Xử lý khi client ngắt kết nối
    socket.on('close', function() {
        clients = clients.filter(client => client !== socket); // Loại bỏ client khỏi mảng
        console.log('Client disconnected'); // Thông báo ngắt kết nối
    });
});

// Server bắt đầu lắng nghe trên cổng 3000
server.listen(3000, () => {
    console.log('Server listening on http://localhost:3000'); // Hiển thị URL server
});
