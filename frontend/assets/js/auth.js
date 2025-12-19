// assets/js/auth.js

function toggleForms() {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        regForm.style.display = 'block';
    }
    document.getElementById('message').innerText = "";
}

async function handleRegister() {
    const email = document.getElementById('reg-email').value;
    const username = document.getElementById('reg-username').value;
    const fullName = document.getElementById('reg-fullname').value;
    const password = document.getElementById('reg-password').value;
    const msg = document.getElementById('message');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, full_name: fullName, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert("Đăng ký thành công! Vui lòng đăng nhập.");
            toggleForms();
        } else {
            msg.innerText = data.detail || "Đăng ký thất bại";
        }
    } catch (error) {
        msg.innerText = "Lỗi kết nối Server!";
    }
}

async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const msg = document.getElementById('message');
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("username", username);
            window.location.href = "dashboard.html";
        } else {
            msg.innerText = "Sai thông tin đăng nhập!";
        }
    } catch (error) {
        msg.innerText = "Lỗi kết nối Server!";
    }
}