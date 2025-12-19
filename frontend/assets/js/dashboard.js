// assets/js/dashboard.js

// 1. AUTH CHECK
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const username = localStorage.getItem("username") || "User";
const userNameEl = document.getElementById("user-name");
if (userNameEl) userNameEl.innerText = username;

// VARIABLES
let currentTransactions = [];
let allCategories = [];
let myChart = null;
let dailyLineChart = null;
let dateRange = { start: null, end: null };

// 2. HELPER FUNCTIONS
async function fetchAPI(endpoint, method = "GET", body = null) {
    const options = { method, headers: getHeaders() };
    if (body) options.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (res.status === 401) { handleLogout(); return null; }
        return await res.json();
    } catch (err) { return null; }
}

function setupDateFilter() {
    const dateInput = document.getElementById('month-filter');
    if (dateInput && !dateInput.value) {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        dateInput.value = `${year}-${month}`;
    }
    
    if(dateInput) {
        const [year, month] = dateInput.value.split('-');
        const display = document.getElementById('current-month-display');
        if(display) display.innerText = `Tháng ${month}/${year}`;
        return [year, month];
    }
    return [new Date().getFullYear(), new Date().getMonth() + 1];
}

// 3. MAIN LOAD LOGIC
async function loadDashboard() {
    const [year, month] = setupDateFilter();
    
    const [wallets, categories, report, transactions] = await Promise.all([
        fetchAPI("/accounts/"),
        fetchAPI("/categories/"),
        fetchAPI(`/reports/monthly?month=${month}&year=${year}`),
        fetchAPI("/transactions/")
    ]);

    // Render Wallets
    if(wallets) {
        let total = 0, cash = 0, bank = 0;
        const walletOptions = wallets.map(w => {
            total += w.balance;
            if(w.type === 'cash') cash += w.balance; else bank += w.balance;
            const bankName = w.bank_name ? ` - ${w.bank_name}` : '';
            return `<option value="${w.id}">${w.name}${bankName} (${formatMoney(w.balance)})</option>`;
        }).join('');

        document.getElementById("total-balance").innerText = formatMoney(total);
        document.getElementById("cash-balance").innerText = formatMoney(cash);
        document.getElementById("bank-balance").innerText = formatMoney(bank);
        
        const w1 = document.getElementById("trans-wallet");
        const w2 = document.getElementById("trans-dest-wallet");
        if(w1) w1.innerHTML = walletOptions;
        if(w2) w2.innerHTML = walletOptions;
    }

    // Render Categories
    if(categories) {
        allCategories = categories;
        setTransactionType(document.getElementById('trans-type').value);
    }

    // Render Charts & List
    if(transactions) {
        let filtered = transactions;

        // Lọc theo ngày
        if (dateRange.start && dateRange.end) {
            const start = new Date(dateRange.start);
            const end = new Date(dateRange.end);
            end.setHours(23, 59, 59);
            filtered = transactions.filter(t => {
                const d = new Date(t.date);
                return d >= start && d <= end;
            });
        } else {
            // Lọc theo tháng
            filtered = transactions.filter(t => {
                const d = new Date(t.date);
                return (d.getMonth() + 1) == month && d.getFullYear() == year;
            });
        }

        renderTransactions(filtered);
        drawDailyLineChart(filtered, month, year);
        
        // Vẽ biểu đồ tròn từ dữ liệu filtered (chính xác hơn report API khi dùng date range)
        const expenseData = {};
        filtered.forEach(t => {
            if(t.type === 'expense') {
                const catName = t.category_id ? `Mục ${t.category_id}` : 'Khác'; 
                // Note: Thực tế cần map ID sang Name, nhưng tạm thời dùng ID hoặc gọi API chi tiết
                // Để đơn giản, ta dùng category name từ list allCategories nếu khớp ID
                const cat = allCategories.find(c => c.id === t.category_id);
                const name = cat ? cat.name : 'Khác';
                expenseData[name] = (expenseData[name] || 0) + t.amount;
            }
        });
        drawDoughnutChart(expenseData);
    }
}

// 4. RENDER FUNCTIONS
function renderTransactions(transactions) {
    const list = document.getElementById("transaction-list");
    if(!list) return;
    list.innerHTML = "";
    
    currentTransactions = transactions; // Save for search

    if (transactions.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">Không có giao dịch nào</div>';
        return;
    }

    // Sort newest first
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    transactions.forEach(t => {
        let icon, color, sign, label;
        if(t.type === 'expense') { icon='fa-arrow-down'; color='exp'; sign='-'; label='Chi tiêu'; }
        else if(t.type === 'income') { icon='fa-arrow-up'; color='inc'; sign='+'; label='Thu nhập'; }
        else { icon='fa-right-left'; color='text-main'; sign=''; label='Chuyển tiền'; }

        const date = new Date(t.date).toLocaleDateString('vi-VN');
        // Find category name
        const cat = allCategories.find(c => c.id === t.category_id);
        const subLabel = cat ? cat.name : label;

        list.innerHTML += `
            <li class="trans-item">
                <div class="trans-left">
                    <div class="trans-icon-sm"><i class="fa-solid ${icon} ${color}"></i></div>
                    <div class="trans-info">
                        <h4>${t.note || subLabel}</h4>
                        <span>${date} • ${subLabel}</span>
                    </div>
                </div>
                <div class="trans-right">
                    <span class="trans-money ${color}">${sign} ${formatMoney(t.amount)}</span>
                    <button class="btn-delete" onclick="deleteTransaction(${t.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </li>
        `;
    });
}

function drawDailyLineChart(transactions, month, year) {
    const ctx = document.getElementById("dailyLineChart");
    if (!ctx) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
    const incomeData = new Array(daysInMonth).fill(0);
    const expenseData = new Array(daysInMonth).fill(0);

    transactions.forEach(t => {
        const d = new Date(t.date);
        const day = d.getDate();
        // Chỉ tính nếu đúng tháng đang xem (hoặc trong range)
        if (day <= daysInMonth) {
            if (t.type === 'income') incomeData[day - 1] += t.amount;
            if (t.type === 'expense') expenseData[day - 1] += t.amount;
        }
    });

    if (dailyLineChart) dailyLineChart.destroy();

    dailyLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Thu', data: incomeData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, fill: true },
                { label: 'Chi', data: expenseData, borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)', tension: 0.3, fill: true }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
    });
}

function drawDoughnutChart(dataObj) {
    const ctx = document.getElementById('expenseChart');
    if(!ctx) return;
    if(myChart) myChart.destroy();

    const labels = Object.keys(dataObj);
    const data = Object.values(dataObj);
    
    if (labels.length === 0) {
         myChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Trống'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], borderWidth: 0 }] }, options: { cutout: '70%' } });
         return;
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
    });
}

// 5. ACTIONS
const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });

async function addTransaction() {
    const amount = document.getElementById("trans-amount").value;
    const note = document.getElementById("trans-note").value;
    const type = document.getElementById("trans-type").value;
    const account_id = document.getElementById("trans-wallet").value;
    const to_account_id = type === 'transfer' ? document.getElementById("trans-dest-wallet").value : null;
    const category_id = type === 'transfer' ? null : document.getElementById("trans-category").value;

    if(!amount || !account_id) return Toast.fire({ icon: 'warning', title: 'Thiếu thông tin' });
    if(type === 'transfer' && account_id === to_account_id) return Swal.fire('Lỗi', 'Ví trùng nhau', 'error');

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
    const bankList = document.getElementById("wallet-bank-list");
    const bank_name = (type === 'bank' && bankList) ? bankList.value : null;

    if(!name) return Toast.fire({ icon: 'warning', title: 'Nhập tên ví' });
    if(await fetchAPI("/accounts/", "POST", { name, balance: parseFloat(balance), type, bank_name })) {
        closeModal("wallet-modal");
        Toast.fire({ icon: 'success', title: 'Đã tạo ví' });
        loadDashboard();
    }
}

async function addCategory() {
    const name = document.getElementById("cat-name").value;
    const type = document.getElementById("cat-type").value;
    if(!name) return Toast.fire({ icon: 'warning', title: 'Nhập tên mục' });
    if(await fetchAPI("/categories/", "POST", { name, type })) {
        closeModal("category-modal");
        Toast.fire({ icon: 'success', title: 'Đã thêm mục' });
        loadDashboard();
    }
}

async function deleteTransaction(id) {
    const result = await Swal.fire({ title: 'Xóa giao dịch?', text: "Tiền sẽ hoàn lại ví.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Xóa' });
    if (result.isConfirmed) {
        if(await fetchAPI(`/transactions/${id}`, "DELETE")) {
            Toast.fire({ icon: 'success', title: 'Đã xóa' });
            loadDashboard();
        }
    }
}

// 6. UI HELPERS
function setTransactionType(type) {
    document.getElementById('trans-type').value = type;
    const btns = { expense: 'btn-expense', income: 'btn-income', transfer: 'btn-transfer' };
    
    Object.keys(btns).forEach(k => {
        document.getElementById(btns[k]).className = 'type-btn'; // Reset
    });
    
    // Set active class based on type
    const activeClass = type === 'expense' ? 'active-exp' : (type === 'income' ? 'active-inc' : 'active-transfer');
    document.getElementById(btns[type]).classList.add(activeClass);

    // Toggle fields
    const dest = document.getElementById('group-dest-wallet');
    const cat = document.getElementById('group-category');
    const label = document.getElementById('label-source-wallet');

    if (type === 'transfer') {
        dest.classList.remove('hidden');
        cat.classList.add('hidden');
        label.innerText = 'Từ ví';
    } else {
        dest.classList.add('hidden');
        cat.classList.remove('hidden');
        label.innerText = type === 'expense' ? 'Ví thanh toán' : 'Ví nhận tiền';
    }

    // Filter categories
    const catSelect = document.getElementById("trans-category");
    if(catSelect && type !== 'transfer') {
        catSelect.innerHTML = "";
        allCategories.filter(c => c.type === type).forEach(c => {
            catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }
}

function toggleBankSelect() {
    const type = document.getElementById('wallet-type').value;
    const group = document.getElementById('group-bank-list');
    if (type === 'bank') {
        group.classList.remove('hidden');
        loadBankList();
    } else {
        group.classList.add('hidden');
    }
}

async function loadBankList() {
    const banks = await fetchAPI("/accounts/banks-list");
    const select = document.getElementById("wallet-bank-list");
    if(select) {
        select.innerHTML = "";
        if(banks) banks.forEach(b => select.innerHTML += `<option value="${b}">${b}</option>`);
    }
}

function filterTransactions() {
    const keyword = document.getElementById("search-trans").value.toLowerCase();
    const filtered = currentTransactions.filter(t => (t.note || "").toLowerCase().includes(keyword));
    renderTransactions(filtered);
}

function handleLogout() { localStorage.clear(); window.location.href = "login.html"; }
window.openModal = (id) => document.getElementById(id).style.display = "flex";
window.closeModal = (id) => document.getElementById(id).style.display = "none";
window.toggleBankSelect = toggleBankSelect;
window.setTransactionType = setTransactionType;
window.addTransaction = addTransaction;
window.addWallet = addWallet;
window.addCategory = addCategory;
window.deleteTransaction = deleteTransaction;
window.filterTransactions = filterTransactions;

// Date Nav
window.changeMonth = (step) => {
    const input = document.getElementById("month-filter");
    let [year, month] = input.value.split('-').map(Number);
    month += step;
    if(month > 12) { month = 1; year++; }
    if(month < 1) { month = 12; year--; }
    input.value = `${year}-${String(month).padStart(2,'0')}`;
    loadDashboard();
};
window.goToday = () => {
    const now = new Date();
    document.getElementById("month-filter").value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    clearDateRange();
};
window.applyDateRange = () => {
    dateRange.start = document.getElementById("start-date").value;
    dateRange.end = document.getElementById("end-date").value;
    if(!dateRange.start || !dateRange.end) return Swal.fire('Thiếu ngày', 'Chọn đủ ngày', 'warning');
    loadDashboard();
};
window.clearDateRange = () => {
    document.getElementById("start-date").value = "";
    document.getElementById("end-date").value = "";
    dateRange = { start: null, end: null };
    loadDashboard();
};

// Start
loadDashboard();