// assets/js/dashboard.js

let currentTransactions = [];       // giao dịch theo THÁNG hiện tại (để search/export)
let allCategories = [];
let myChart = null;
let dailyLineChart = null;
let compareMonthChart = null;
let currentChartType = 'doughnut';
let lastExpenseData = {};
let dateRange = {
    start: null,
    end: null
};




// ===== AUTH =====
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const username = localStorage.getItem("username") || "User";
const userNameEl = document.getElementById("user-name");
if (userNameEl) userNameEl.innerText = username;

// ===== HELPER FETCH =====
async function fetchAPI(endpoint, method = "GET", body = null) {
    const options = { method, headers: getHeaders() };
    if (body) options.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (res.status === 401) { handleLogout(); return null; }
        if (res.status === 204) return true; // DELETE success no content
        return await res.json();
    } catch (err) {
        return null;
    }
}

// ===== MONTH FILTER =====
function setupDateFilter() {
    const dateInput = document.getElementById('month-filter');

    if (dateInput && !dateInput.value) {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        dateInput.value = `${year}-${month}`;
    }

    if (dateInput) {
        const [year, month] = dateInput.value.split('-');
        updateMonthText(year, month);
        return [year, month];
    }

    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1];
}


function updateMonthText(year, month) {
    const el = document.getElementById("current-month-text");
    if (!el) return;

    const date = new Date(year, month - 1);
    const text = date.toLocaleDateString('vi-VN', {
        month: 'long',
        year: 'numeric'
    });
    el.innerText = text.charAt(0).toUpperCase() + text.slice(1);
}


// ===== UI: TRANSACTION TYPE =====
function setTransactionType(type) {
    const typeInput = document.getElementById('trans-type');
    if (typeInput) typeInput.value = type;

    const btnExp = document.getElementById('btn-expense');
    const btnInc = document.getElementById('btn-income');
    const btnTrans = document.getElementById('btn-transfer');

    if (btnExp && btnInc && btnTrans) {
        btnExp.className = 'type-btn';
        btnInc.className = 'type-btn';
        btnTrans.className = 'type-btn';

        const groupDest = document.getElementById('group-dest-wallet');
        const groupCat = document.getElementById('group-category');
        const labelSource = document.getElementById('label-source-wallet');

        if (type === 'expense') {
            btnExp.classList.add('active-exp');
            if (groupDest) groupDest.classList.add('hidden');
            if (groupCat) groupCat.classList.remove('hidden');
            if (labelSource) labelSource.innerText = "Ví thanh toán";
        } else if (type === 'income') {
            btnInc.classList.add('active-inc');
            if (groupDest) groupDest.classList.add('hidden');
            if (groupCat) groupCat.classList.remove('hidden');
            if (labelSource) labelSource.innerText = "Ví nhận tiền";
        } else {
            btnTrans.classList.add('active-transfer');
            if (groupDest) groupDest.classList.remove('hidden');
            if (groupCat) groupCat.classList.add('hidden');
            if (labelSource) labelSource.innerText = "Từ ví";
        }
    }

    // lọc category theo type
    const catSelect = document.getElementById("trans-category");
    if (catSelect && type !== 'transfer') {
        catSelect.innerHTML = "";
        const filtered = allCategories.filter(c => c.type === type);
        filtered.forEach(c => {
            catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }
}

// ===== UI: WALLET TYPE =====
function toggleBankSelect() {
    const typeEl = document.getElementById('wallet-type');
    const bankGroup = document.getElementById('group-bank-list');

    if (typeEl && bankGroup) {
        if (typeEl.value === 'bank') {
            bankGroup.classList.remove('hidden');
            loadBankList();
        } else {
            bankGroup.classList.add('hidden');
        }
    }
}

async function loadBankList() {
    const banks = await fetchAPI("/accounts/banks-list");
    const bankSelect = document.getElementById("wallet-bank-list");
    if (bankSelect) {
        bankSelect.innerHTML = "";
        if (banks) banks.forEach(b => bankSelect.innerHTML += `<option value="${b}">${b}</option>`);
    }
}

// ===== RESET FORM =====
function resetTransactionForm() {
    const amountEl = document.getElementById("trans-amount");
    const noteEl = document.getElementById("trans-note");
    if (amountEl) amountEl.value = "";
    if (noteEl) noteEl.value = "";
}

function drawDailyLineChart(transactions, month, year) {
    const ctx = document.getElementById("dailyLineChart");
    if (!ctx) return;

    // Lọc giao dịch theo tháng
    transactions.forEach(t => {
    const d = new Date(t.date);

    if (dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23,59,59,999);
        if (d < start || d > end) return;
    } else {
        if (d.getMonth() + 1 !== Number(month) || d.getFullYear() !== Number(year)) return;
    }

    const day = d.getDate();
    if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0 };

    if (t.type === 'income') dailyData[day].income += t.amount;
    if (t.type === 'expense') dailyData[day].expense += t.amount;
});


    const days = Object.keys(dailyData).sort((a, b) => a - b);
    const incomeData = days.map(d => dailyData[d].income);
    const expenseData = days.map(d => dailyData[d].expense);

    if (dailyLineChart) dailyLineChart.destroy();

    dailyLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days.map(d => `Ngày ${d}`),
            datasets: [
                {
                    label: 'Thu nhập',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.15)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Chi tiêu',
                    data: expenseData,
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244,63,94,0.15)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => formatMoney(value)
                    }
                }
            }
        }
    });
}
function drawCompareMonthChart(transactions, month, year) {
    const ctx = document.getElementById("compareMonthChart");
    if (!ctx) return;

    let thisMonth = { income: 0, expense: 0 };
    let prevMonth = { income: 0, expense: 0 };

    // xác định tháng trước
    let prevM = Number(month) - 1;
    let prevY = Number(year);
    if (prevM === 0) {
        prevM = 12;
        prevY -= 1;
    }

    transactions.forEach(t => {
        const d = new Date(t.date);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        if (m === Number(month) && y === Number(year)) {
            if (t.type === 'income') thisMonth.income += t.amount;
            if (t.type === 'expense') thisMonth.expense += t.amount;
        }

        if (m === prevM && y === prevY) {
            if (t.type === 'income') prevMonth.income += t.amount;
            if (t.type === 'expense') prevMonth.expense += t.amount;
        }
    });

    if (compareMonthChart) compareMonthChart.destroy();

    compareMonthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Thu nhập', 'Chi tiêu'],
            datasets: [
                {
                    label: `Tháng ${prevM}/${prevY}`,
                    data: [prevMonth.income, prevMonth.expense],
                    backgroundColor: '#94a3b8'
                },
                {
                    label: `Tháng ${month}/${year}`,
                    data: [thisMonth.income, thisMonth.expense],
                    backgroundColor: '#6366f1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => formatMoney(value)
                    }
                }
            }
        }
    });
}



// ===== DASHBOARD LOAD =====
async function loadDashboard() {
    const [year, month] = setupDateFilter(); // year, month are strings

    const [wallets, categories, report, transactions] = await Promise.all([
        fetchAPI("/accounts/"),
        fetchAPI("/categories/"),
        fetchAPI(`/reports/monthly?month=${month}&year=${year}`),
        fetchAPI("/transactions/")
    ]);

    // wallets
    if (wallets) {
        const walletOptions = wallets.map(w => {
            const bankInfo = w.bank_name ? ` - ${w.bank_name}` : '';
            return `<option value="${w.id}">${w.name}${bankInfo} (${formatMoney(w.balance)})</option>`;
        }).join('');

        const w1 = document.getElementById("trans-wallet");
        const w2 = document.getElementById("trans-dest-wallet");
        if (w1) w1.innerHTML = walletOptions;
        if (w2) w2.innerHTML = walletOptions;

        let total = 0, cash = 0, bank = 0;
        wallets.forEach(w => {
            total += w.balance;
            if (w.type === 'cash') cash += w.balance; else bank += w.balance;
        });

        const elTotal = document.getElementById("total-balance");
        const elCash = document.getElementById("cash-balance");
        const elBank = document.getElementById("bank-balance");
        if (elTotal) elTotal.innerText = formatMoney(total);
        if (elCash) elCash.innerText = formatMoney(cash);
        if (elBank) elBank.innerText = formatMoney(bank);
    }

    // categories
    if (categories) {
        allCategories = categories;
        setTransactionType('expense');
    }

    // report
    if (report) {
        const elInc = document.getElementById("month-income");
        const elExp = document.getElementById("month-expense");
        if (elInc) elInc.innerText = `+${formatMoney(report.total_income)}`;
        if (elExp) elExp.innerText = `-${formatMoney(report.total_expense)}`;
        lastExpenseData = report.expense_by_category || {};
        drawChart(lastExpenseData);

    } else {
        drawChart({});
    }

    // transactions
    if (transactions) {
    renderTransactions(transactions, month, year);
    drawDailyLineChart(transactions, month, year);
    drawCompareMonthChart(transactions, month, year);
}


}

// ===== RENDER TRANSACTIONS =====
function renderTransactions(transactions, m, y) {
    const list = document.getElementById("transaction-list");
    if (!list) return;

    list.innerHTML = "";

    let filtered = transactions;

// nếu có date range → ưu tiên lọc theo ngày
if (dateRange.start && dateRange.end) {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23,59,59,999);

    filtered = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
    });
} else {
    // fallback: lọc theo tháng
    filtered = transactions.filter(t => {
        const d = new Date(t.date);
        return (d.getMonth() + 1) === Number(m) && d.getFullYear() === Number(y);
    });
}

filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
currentTransactions = filtered;
    // lưu để search/export
    currentTransactions = filteredMonth;

    if (filteredMonth.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8;">Chưa có giao dịch</div>';
        return;
    }

    filteredMonth.forEach(t => {
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
                    <div class="trans-icon-sm">
                        <i class="fa-solid ${icon}"
                           style="color: ${t.type==='expense'?'#f43f5e':(t.type==='income'?'#10b981':'#6366f1')}"></i>
                    </div>
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

// ===== CHART =====
function drawChart(dataObj) {
    const ctx = document.getElementById('expenseChart');
    const totalEl = document.getElementById('chart-total');
    if (!ctx) return;

    if (myChart) myChart.destroy();

    const labels = Object.keys(dataObj || {});
    const data = Object.values(dataObj || {});
    const total = data.reduce((a, b) => a + b, 0);

    if (totalEl) {
        totalEl.innerText = total > 0 ? formatMoney(total) : "Không có dữ liệu";
    }

    // Không có dữ liệu
    if (labels.length === 0) {
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Trống'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '70%' }
        });
        return;
    }

    const colors = [
        '#6366f1', '#f43f5e', '#f59e0b',
        '#10b981', '#8b5cf6', '#ec4899'
    ];

    myChart = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderRadius: currentChartType === 'bar' ? 8 : 0,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: currentChartType === 'doughnut' ? '70%' : 0,
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const value = ctx.raw;
                            const percent = ((value / total) * 100).toFixed(1);
                            return `${formatMoney(value)} (${percent}%)`;
                        }
                    }
                }
            },
            scales: currentChartType === 'bar' ? {
                y: {
                    ticks: {
                        callback: value => formatMoney(value)
                    }
                }
            } : {}
        }
    });
}

// ===== ACTIONS =====
const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });

async function addTransaction() {
    const amount = document.getElementById("trans-amount")?.value;
    const note = document.getElementById("trans-note")?.value || "";
    const type = document.getElementById("trans-type")?.value;
    const account_id = document.getElementById("trans-wallet")?.value;
    const to_account_id = type === 'transfer' ? document.getElementById("trans-dest-wallet")?.value : null;
    const category_id = type === 'transfer' ? null : document.getElementById("trans-category")?.value;

    if (!amount || !account_id) return Toast.fire({ icon: 'warning', title: 'Thiếu thông tin' });

    if (type === 'transfer' && account_id === to_account_id) {
        return Swal.fire('Lỗi', 'Ví nguồn và ví đích trùng nhau', 'error');
    }

    // ✅ CẢNH BÁO VƯỢT SỐ DƯ (chỉ áp dụng khi chi tiền)
    if (type === 'expense') {
        const walletSelect = document.getElementById("trans-wallet");
        if (walletSelect) {
            const selectedText = walletSelect.options[walletSelect.selectedIndex]?.text || "";
            const balanceText = selectedText.match(/\((.*?) ₫\)/);
            if (balanceText) {
                const balance = parseInt(balanceText[1].replace(/\D/g, '')) || 0;
                if (parseFloat(amount) > balance) {
                    Swal.fire('Cảnh báo', 'Số dư ví không đủ', 'warning');
                    return;
                }
            }
        }
    }

    const payload = {
        amount: parseFloat(amount),
        note,
        type,
        account_id,
        to_account_id,
        category_id
    };

    const res = await fetchAPI("/transactions/", "POST", payload);
    if (res) {
        closeModal("transaction-modal");
        resetTransactionForm();
        Toast.fire({ icon: 'success', title: 'Thành công' });
        loadDashboard();
    }
}

async function addWallet() {
    const name = document.getElementById("wallet-name")?.value;
    const balance = document.getElementById("wallet-balance")?.value || 0;
    const type = document.getElementById("wallet-type")?.value;
    const bankListEl = document.getElementById("wallet-bank-list");
    const bank_name = (type === 'bank' && bankListEl) ? bankListEl.value : null;

    if (!name) return Toast.fire({ icon: 'warning', title: 'Thiếu tên ví' });

    const ok = await fetchAPI("/accounts/", "POST", {
        name,
        balance: parseFloat(balance),
        type,
        bank_name
    });

    if (ok) {
        closeModal("wallet-modal");
        Toast.fire({ icon: 'success', title: 'Tạo ví thành công' });
        loadDashboard();
    }
}

async function addCategory() {
    const name = document.getElementById("cat-name")?.value;
    const type = document.getElementById("cat-type")?.value;

    if (!name) return Toast.fire({ icon: 'warning', title: 'Thiếu tên danh mục' });

    const ok = await fetchAPI("/categories/", "POST", { name, type });
    if (ok) {
        closeModal("category-modal");
        Toast.fire({ icon: 'success', title: 'Thêm danh mục thành công' });
        loadDashboard();
    }
}

async function deleteTransaction(id) {
    const result = await Swal.fire({
        title: 'Xóa giao dịch?',
        text: "Tiền sẽ được hoàn lại.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Xóa'
    });

    if (result.isConfirmed) {
        const ok = await fetchAPI(`/transactions/${id}`, "DELETE");
        if (ok) {
            Toast.fire({ icon: 'success', title: 'Đã xóa' });
            loadDashboard();
        }
    }
}

// ===== SEARCH (dùng input id="search-trans" trong dashboard.html) =====
function filterTransactions() {
    const keyword = (document.getElementById("search-trans")?.value || "").toLowerCase();
    const list = document.getElementById("transaction-list");
    if (!list) return;

    const filtered = currentTransactions.filter(t =>
        (t.note || "").toLowerCase().includes(keyword)
    );

    // render lại list theo kết quả search (không gọi API)
    list.innerHTML = "";
    if (filtered.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8;">Không tìm thấy giao dịch</div>';
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
                    <div class="trans-icon-sm">
                        <i class="fa-solid ${icon}"
                           style="color: ${t.type==='expense'?'#f43f5e':(t.type==='income'?'#10b981':'#6366f1')}"></i>
                    </div>
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

// ===== GLOBALS =====
function handleLogout() { localStorage.clear(); window.location.href = "login.html"; }
window.openModal = function (id) { document.getElementById(id).style.display = "flex"; }
window.closeModal = function (id) { document.getElementById(id).style.display = "none"; }
window.toggleBankSelect = toggleBankSelect;
window.setTransactionType = setTransactionType;
window.addTransaction = addTransaction;
window.addWallet = addWallet;
window.addCategory = addCategory;
window.deleteTransaction = deleteTransaction;
window.filterTransactions = filterTransactions;

function changeMonth(step) {
    const input = document.getElementById("month-filter");
    if (!input || !input.value) return;

    let [year, month] = input.value.split('-').map(Number);
    month += step;

    if (month === 0) {
        month = 12;
        year--;
    }
    if (month === 13) {
        month = 1;
        year++;
    }

    input.value = `${year}-${String(month).padStart(2, '0')}`;
    loadDashboard();
}

function goToday() {
    const now = new Date();
    const input = document.getElementById("month-filter");
    if (!input) return;

    input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    loadDashboard();
}

function applyDateRange() {
    const start = document.getElementById("start-date").value;
    const end = document.getElementById("end-date").value;

    if (!start || !end) {
        Swal.fire('Thiếu ngày', 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc', 'warning');
        return;
    }

    if (new Date(start) > new Date(end)) {
        Swal.fire('Lỗi', 'Ngày bắt đầu phải trước ngày kết thúc', 'error');
        return;
    }

    dateRange.start = start;
    dateRange.end = end;

    loadDashboard();
}

function clearDateRange() {
    dateRange.start = null;
    dateRange.end = null;

    document.getElementById("start-date").value = "";
    document.getElementById("end-date").value = "";

    loadDashboard();
}

function switchChart(type) {
    currentChartType = type;

    document.querySelectorAll('.btn-chart').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    drawChart(lastExpenseData);
}

// ===== INIT =====
loadDashboard();


