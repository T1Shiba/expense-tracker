// assets/js/dashboard.js
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const username = localStorage.getItem("username") || "User";
document.getElementById("user-name").innerText = username;

async function fetchAPI(endpoint, method = "GET", body = null) {
    const options = { method, headers: getHeaders() };
    if (body) options.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (res.status === 401) { handleLogout(); return null; }
        return await res.json();
    } catch (err) { return null; }
}

const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + " ₫";
function setupDateFilter() {
    const dateInput = document.getElementById('month-filter');
    if (!dateInput.value) {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        dateInput.value = `${now.getFullYear()}-${month}`;
    }
    return dateInput.value.split('-');
}

let allCategories = [];

// XỬ LÝ CHỌN LOẠI GIAO DỊCH
function setTransactionType(type) {
    document.getElementById('trans-type').value = type;
    const btnExp = document.getElementById('btn-expense');
    const btnInc = document.getElementById('btn-income');
    const btnTrans = document.getElementById('btn-transfer');

    // Reset style
    btnExp.className = 'type-btn';
    btnInc.className = 'type-btn';
    btnTrans.className = 'type-btn';

    // Ẩn hiện các ô input
    const groupDest = document.getElementById('group-dest-wallet');
    const groupCat = document.getElementById('group-category');
    const labelSource = document.getElementById('label-source-wallet');

    if (type === 'expense') {
        btnExp.classList.add('active-exp');
        groupDest.classList.add('hidden');
        groupCat.classList.remove('hidden');
        labelSource.innerText = "Ví thanh toán";
    } else if (type === 'income') {
        btnInc.classList.add('active-inc');
        groupDest.classList.add('hidden');
        groupCat.classList.remove('hidden');
        labelSource.innerText = "Ví nhận tiền";
    } else {
        // Chuyển khoản
        btnTrans.classList.add('active-transfer');
        groupDest.classList.remove('hidden');
        groupCat.classList.add('hidden');
        labelSource.innerText = "Từ ví";
    }

    // Lọc danh mục
    if (type !== 'transfer') {
        const catSelect = document.getElementById("trans-category");
        catSelect.innerHTML = "";
        const filtered = allCategories.filter(c => c.type === type);
        filtered.forEach(c => {
            catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }
}

// XỬ LÝ CHỌN LOẠI VÍ
function toggleBankSelect() {
    const type = document.getElementById('wallet-type').value;
    const bankGroup = document.getElementById('group-bank-list');
    if (type === 'bank') {
        bankGroup.classList.remove('hidden');
        loadBankList();
    } else {
        bankGroup.classList.add('hidden');
    }
}

async function loadBankList() {
    const banks = await fetchAPI("/accounts/banks-list");
    const bankSelect = document.getElementById("wallet-bank-list");
    bankSelect.innerHTML = "";
    if (banks) banks.forEach(b => bankSelect.innerHTML += `<option value="${b}">${b}</option>`);
}

// LOAD DASHBOARD
async function loadDashboard() {
    const [year, month] = setupDateFilter();
    
    const [wallets, categories, report, transactions] = await Promise.all([
        fetchAPI("/accounts/"),
        fetchAPI("/categories/"),
        fetchAPI(`/reports/monthly?month=${month}&year=${year}`),
        fetchAPI("/transactions/")
    ]);

    if(wallets) {
        // Fill dropdown ví
        const walletOptions = wallets.map(w => {
            const bankInfo = w.bank_name ? ` - ${w.bank_name}` : '';
            return `<option value="${w.id}">${w.name}${bankInfo} (${formatMoney(w.balance)})</option>`;
        }).join('');
        document.getElementById("trans-wallet").innerHTML = walletOptions;
        document.getElementById("trans-dest-wallet").innerHTML = walletOptions;

        // Tính tổng
        let total = 0, cash = 0, bank = 0;
        wallets.forEach(w => {
            total += w.balance;
            if(w.type === 'cash') cash += w.balance; else bank += w.balance;
        });
        document.getElementById("total-balance").innerText = formatMoney(total);
        document.getElementById("cash-balance").innerText = formatMoney(cash);
        document.getElementById("bank-balance").innerText = formatMoney(bank);
    }

    if(categories) {
        allCategories = categories;
        setTransactionType('expense'); 
    }

    if(report) {
        document.getElementById("month-income").innerText = `+${formatMoney(report.total_income)}`;
        document.getElementById("month-expense").innerText = `-${formatMoney(report.total_expense)}`;
        drawChart(report.expense_by_category);
    }

    if(transactions) renderTransactions(transactions, month, year);
}

function renderTransactions(transactions, m, y) {
    const list = document.getElementById("transaction-list");
    list.innerHTML = "";
    const filtered = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() + 1 == m && d.getFullYear() == y;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8;">Chưa có giao dịch</div>';
        return;
    }

    filtered.forEach(t => {
        let icon, colorClass, sign, typeLabel;
        if (t.type === 'expense') {
            icon = 'fa-arrow-trend-down'; colorClass = 'exp'; sign = '-'; typeLabel = 'Chi tiêu';
        } else if (t.type === 'income') {
            icon = 'fa-arrow-trend-up'; colorClass = 'inc'; sign = '+'; typeLabel = 'Thu nhập';
        } else {
            icon = 'fa-right-left'; colorClass = 'text-main'; sign = ''; typeLabel = 'Chuyển tiền';
        }
        const date = new Date(t.date).toLocaleDateString('vi-VN');

        list.innerHTML += `
            <li class="trans-item">
                <div class="trans-left">
                    <div class="trans-icon-sm"><i class="fa-solid ${icon}" style="color: ${t.type==='expense'?'#f43f5e':(t.type==='income'?'#10b981':'#6366f1')}"></i></div>
                    <div class="trans-details">
                        <h4>${t.note || typeLabel}</h4>
                        <span>${date} • ${typeLabel}</span>
                    </div>
                </div>
                <div class="trans-right">
                    <span class="trans-money ${colorClass}">${sign} ${formatMoney(t.amount)}</span>
                    <button class="btn-delete" onclick="deleteTransaction(${t.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </li>
        `;
    });
}

// Chart
let myChart = null;
function drawChart(dataObj) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const labels = Object.keys(dataObj);
    const data = Object.values(dataObj);
    if (myChart) myChart.destroy();
    
    const colors = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
    const config = labels.length === 0 ? 
        { labels: ['Trống'], data: [1], colors: ['#e2e8f0'] } : 
        { labels, data, colors };

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: config.labels,
            datasets: [{ data: config.data, backgroundColor: config.colors, borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, font: { family: "'Inter', sans-serif" } } } } }
    });
}

// ACTIONS
const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });

async function addTransaction() {
    const amount = document.getElementById("trans-amount").value;
    const note = document.getElementById("trans-note").value;
    const type = document.getElementById("trans-type").value;
    const account_id = document.getElementById("trans-wallet").value;
    const to_account_id = type === 'transfer' ? document.getElementById("trans-dest-wallet").value : null;
    const category_id = type === 'transfer' ? null : document.getElementById("trans-category").value;

    if(!amount || !account_id) return Toast.fire({ icon: 'warning', title: 'Thiếu thông tin' });
    if(type === 'transfer' && account_id === to_account_id) return Swal.fire('Lỗi', 'Ví nguồn và đích trùng nhau', 'error');

    const res = await fetchAPI("/transactions/", "POST", { amount: parseFloat(amount), note, type, account_id, to_account_id, category_id });
    if (res) {
        closeModal("transaction-modal");
        Toast.fire({ icon: 'success', title: 'Thành công' });
        loadDashboard();
    }
}

async function addWallet() {
    const name = document.getElementById("wallet-name").value;
    const balance = document.getElementById("wallet-balance").value || 0;
    const type = document.getElementById("wallet-type").value;
    const bank_name = type === 'bank' ? document.getElementById("wallet-bank-list").value : null;

    if(!name) return;
    if(await fetchAPI("/accounts/", "POST", { name, balance: parseFloat(balance), type, bank_name })) {
        closeModal("wallet-modal");
        Toast.fire({ icon: 'success', title: 'Tạo ví thành công' });
        loadDashboard();
    }
}

async function addCategory() {
    const name = document.getElementById("cat-name").value;
    const type = document.getElementById("cat-type").value;
    if(await fetchAPI("/categories/", "POST", { name, type })) {
        closeModal("category-modal");
        Toast.fire({ icon: 'success', title: 'Thêm danh mục thành công' });
        loadDashboard();
    }
}

async function deleteTransaction(id) {
    const result = await Swal.fire({
        title: 'Xóa giao dịch?', text: "Tiền sẽ được hoàn lại.", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#f43f5e', cancelButtonColor: '#64748b', confirmButtonText: 'Xóa'
    });
    if (result.isConfirmed) {
        if(await fetchAPI(`/transactions/${id}`, "DELETE")) {
            Toast.fire({ icon: 'success', title: 'Đã xóa' });
            loadDashboard();
        }
    }
}

function handleLogout() { localStorage.clear(); window.location.href = "login.html"; }
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }
loadDashboard();