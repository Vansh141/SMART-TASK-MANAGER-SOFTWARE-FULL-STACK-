// ===== GLOBAL UTILITIES =====

/**
 * Show a toast notification
 * @param {string} msg Message to show
 * @param {boolean} isError True if error, false for success
 */
function showToast(msg, isError = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = msg;
    toast.className = `toast show ${isError ? 'error' : 'success'}`;

    setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}

/**
 * Get the JWT token from storage
 */
function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

/**
 * Save auth token
 */
function saveToken(token, rememberMe = false) {
    if (rememberMe) {
        localStorage.setItem("token", token);
    } else {
        sessionStorage.setItem("token", token);
    }
}

/**
 * Clear auth token and logout
 */
function logout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    window.location.href = "/login.html";
}

// ===== DARK MODE WIRING =====
document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("theme-toggle");

    // Restore theme on load
    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener("click", toggleTheme);
    }

    function applyTheme(theme) {
        document.body.classList.toggle("dark", theme === "dark");
        localStorage.setItem("theme", theme);
        if (themeToggle) {
            themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
        }
    }

    function toggleTheme() {
        const isDark = document.body.classList.contains("dark");
        const newTheme = isDark ? "light" : "dark";
        applyTheme(newTheme);
    }
});
