// Kiểm tra đăng nhập
const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "login.html";
}

// Hàm gọi API chung
async function fetchAPI(endpoint, method = "GET", body = null) {
    const options = {
        method,
        headers: getHeaders()
    };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (res.status === 401) {
        handleLogout(); // Token hết hạn thì đá ra ngoài
        return null;
    }
    return res.json();
}

// --- CÁC HÀM LOAD DỮ LIỆU ---

async function loadDashboard() {
    // 1. Lấy danh sách Ví
    const wallets = await fetchAPI("/accounts/");
    const walletSelect = document.getElementById("trans-wallet");
    walletSelect.innerHTML = "";
    let totalBalance = 0;
    
    wallets.forEach(w => {
        totalBalance += w.balance;
        walletSelect.innerHTML += `<option value="${w.id}">${w.name} (${w.balance.toLocaleString()} đ)</option>`;
    });
    document.getElementById("total-balance").innerText = `${totalBalance.toLocaleString()} đ`;

    // 2. Lấy danh sách Danh mục
    const categories = await fetchAPI("/categories/");
    const catSelect = document.getElementById("trans-category");
    catSelect.innerHTML = "";
    categories.forEach(c => {
        catSelect.innerHTML += `<option value="${c.id}">${c.name} (${c.type})</option>`;
    });

    // 3. Lấy Báo cáo tháng này
    const report = await fetchAPI("/reports/monthly");
    document.getElementById("month-income").innerText = `+${report.total_income.toLocaleString()} đ`;
    document.getElementById("month-expense").innerText = `-${report.total_expense.toLocaleString()} đ`;
    
    // Vẽ biểu đồ
    drawChart(report.expense_by_category);

    // 4. Lấy lịch sử giao dịch (Tạm lấy transaction của ví đầu tiên nếu có)
    // Để đơn giản, ta lấy tất cả transaction của user (cần API get all transactions)
    // Ở đây ta tạm để trống hoặc load sau.
}

// --- VẼ BIỂU ĐỒ ---
let myChart = null;
function drawChart(dataObj) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const labels = Object.keys(dataObj);
    const data = Object.values(dataObj);

    if (myChart) myChart.destroy(); // Xóa biểu đồ cũ nếu có

    myChart = new Chart(ctx, {
        type: 'doughnut', // Biểu đồ tròn khuyết
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4CAF50', '#9C27B0'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// --- CÁC HÀM THÊM DỮ LIỆU ---

async function addWallet() {
    const name = document.getElementById("wallet-name").value;
    const balance = document.getElementById("wallet-balance").value;
    const type = document.getElementById("wallet-type").value;

    await fetchAPI("/accounts/", "POST", { name, balance: parseFloat(balance), type });
    closeModal("wallet-modal");
    loadDashboard(); // Tải lại dữ liệu
}

async function addCategory() {
    const name = document.getElementById("cat-name").value;
    const type = document.getElementById("cat-type").value;

    await fetchAPI("/categories/", "POST", { name, type });
    closeModal("category-modal");
    loadDashboard();
}

async function addTransaction() {
    const amount = document.getElementById("trans-amount").value;
    const note = document.getElementById("trans-note").value;
    const type = document.getElementById("trans-type").value;
    const account_id = document.getElementById("trans-wallet").value;
    const category_id = document.getElementById("trans-category").value;

    await fetchAPI("/transactions/", "POST", {
        amount: parseFloat(amount),
        note,
        type,
        account_id,
        category_id
    });
    closeModal("transaction-modal");
    loadDashboard();
    alert("Thêm giao dịch thành công!");
}

// --- TIỆN ÍCH ---
function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

function openModal(id) { document.getElementById(id).style.display = "block"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

// Khởi chạy khi load trang
loadDashboard();