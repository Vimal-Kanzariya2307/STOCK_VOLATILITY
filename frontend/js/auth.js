const API_BASE = "http://127.0.0.1:5000";

// Remove legacy localStorage auth data from older versions
localStorage.removeItem("user");

function saveSession(token, user) {
    sessionStorage.setItem("authToken", token);
    sessionStorage.setItem("user", JSON.stringify(user));
}

function clearSession() {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("user");
}

function getAuthToken() {
    return sessionStorage.getItem("authToken");
}

function getCurrentUser() {
    const user = sessionStorage.getItem("user");
    return user ? JSON.parse(user) : null;
}

function isAuthenticated() {
    return !!getAuthToken();
}

async function signup() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!name || !email || !password) {
        alert("Please fill all fields");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Signup failed");
            return;
        }

        alert("Signup Successful");
        window.location.href = "login.html";
    } catch (error) {
        console.error("Signup error:", error);
        alert("Unable to connect to server. Make sure the backend is running.");
    }
}

async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please fill all fields");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Invalid Email or Password");
            return;
        }

        saveSession(data.token, data.user);
        alert("Login Successful");
        window.location.href = "dashboard.html";
    } catch (error) {
        console.error("Login error:", error);
        alert("Unable to connect to server. Make sure the backend is running.");
    }
}

function logout() {
    clearSession();
    window.location.href = "login.html";
}

async function verifySession() {
    const token = getAuthToken();

    if (!token) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            clearSession();
            return false;
        }

        const data = await response.json();
        sessionStorage.setItem("user", JSON.stringify(data.user));
        return true;
    } catch (error) {
        console.error("Session verification error:", error);
        return false;
    }
}
