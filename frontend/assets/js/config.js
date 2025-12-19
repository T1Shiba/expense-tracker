const API_BASE_URL = "https://expense-api-ynu4.onrender.com"; 

function getHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
    };
}

const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + " ₫";
};