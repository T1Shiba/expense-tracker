// Thay cái link bên dưới bằng link Render của huynh đài
// (Link mà bấm vào ra {"message": "Expense Tracker API..."} ấy)
// LƯU Ý: Không có dấu gạch chéo / ở cuối
const API_BASE_URL = "https://expense-api-ynu4.onrender.com"; 

function getHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
    };
}