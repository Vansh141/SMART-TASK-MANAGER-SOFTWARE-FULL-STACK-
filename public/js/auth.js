document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const forgotForm = document.getElementById("forgot-form");
    const resetForm = document.getElementById("reset-form");

    // UI Setup: Password toggles
    document.querySelectorAll(".toggle-password").forEach((toggle) => {
        toggle.addEventListener("click", function () {
            const input = this.previousElementSibling;
            if (!input) return;
            if (input.type === "password") {
                input.type = "text";
                this.textContent = "👁️";
            } else {
                input.type = "password";
                this.textContent = "🙈";
            }
        });
    });

    // UI Setup: Password Strengh Meter (only on Register/Reset)
    const passwordInput = document.getElementById("password");
    if (passwordInput && (registerForm || resetForm)) {
        passwordInput.addEventListener("input", checkStrength);
    }

    function checkStrength() {
        const pwd = passwordInput.value;
        const bar = document.getElementById("strength-bar");
        const text = document.getElementById("strength-text");
        if (!bar || !text) return;

        if (pwd.length === 0) {
            bar.style.width = "0%";
            bar.style.backgroundColor = "transparent";
            text.textContent = "";
            return;
        }

        let strength = 0;
        if (pwd.length >= 6) strength++;
        if (pwd.length >= 10) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;

        switch (strength) {
            case 1:
            case 2:
                bar.style.width = "33%";
                bar.style.backgroundColor = "var(--danger)";
                text.textContent = "Weak";
                text.style.color = "var(--danger)";
                break;
            case 3:
            case 4:
                bar.style.width = "66%";
                bar.style.backgroundColor = "orange";
                text.textContent = "Moderate";
                text.style.color = "orange";
                break;
            case 5:
                bar.style.width = "100%";
                bar.style.backgroundColor = "var(--accent)";
                text.textContent = "Strong";
                text.style.color = "var(--accent)";
                break;
            default:
                bar.style.width = "10%";
                bar.style.backgroundColor = "var(--danger)";
                text.textContent = "Very Weak";
                text.style.color = "var(--danger)";
        }
    }

    function toggleLoading(btn, isLoading) {
        if (!btn) return;
        const span = btn.querySelector("span");
        const loader = btn.querySelector(".btn-loader");
        if (isLoading) {
            btn.disabled = true;
            if (span) span.style.display = "none";
            if (loader) loader.style.display = "inline-block";
        } else {
            btn.disabled = false;
            if (span) span.style.display = "inline";
            if (loader) loader.style.display = "none";
        }
    }

    // --- Handlers ---
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm-password").value;

            if (password !== confirmPassword) {
                return showToast("Passwords do not match", true);
            }

            const btn = document.getElementById("register-btn");
            toggleLoading(btn, true);

            try {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, confirmPassword })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast("Account created successfully!");

                    // Use the utility function to handle cross-session state
                    if (typeof saveToken === "function") {
                        saveToken(data.token, true);
                    } else {
                        localStorage.setItem("token", data.token);
                    }

                    setTimeout(() => window.location.href = "/", 1000);
                } else {
                    showToast(data.error || "Registration failed", true);
                }
            } catch (err) {
                showToast("Registration failed", true);
            } finally {
                toggleLoading(btn, false);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            const btn = document.getElementById("login-btn");
            toggleLoading(btn, true);

            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (res.ok) {
                    const rememberMe = document.getElementById("remember-me")?.checked;

                    // Delegate storage logic to utils.js explicitly so 'Remember Me' is respected
                    if (typeof saveToken === "function") {
                        saveToken(data.token, rememberMe);
                    } else {
                        if (rememberMe) {
                            localStorage.setItem("token", data.token);
                        } else {
                            sessionStorage.setItem("token", data.token);
                        }
                    }

                    window.location.href = "/";
                } else {
                    showToast(data.error || "Login failed", true);
                }
            } catch (err) {
                showToast("Login failed", true);
            } finally {
                toggleLoading(btn, false);
            }
        });
    }

    if (forgotForm) {
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();

            const btn = document.getElementById("forgot-btn");
            toggleLoading(btn, true);

            try {
                const res = await fetch("/api/auth/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();

                // As requested, always show success to prevent email sweeping
                showToast("If that email is in our database, we will send a reset link.");
            } catch (err) {
                showToast("Something went wrong", true);
            } finally {
                toggleLoading(btn, false);
            }
        });
    }

    if (resetForm) {
        resetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm-password").value;

            if (password !== confirmPassword) {
                return showToast("Passwords do not match", true);
            }

            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get("token");

            if (!token) {
                return showToast("Invalid or missing reset token", true);
            }

            const btn = document.getElementById("reset-btn");
            toggleLoading(btn, true);

            try {
                const res = await fetch(`/api/auth/reset-password/${token}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password, confirmPassword })
                });
                const data = await res.json();

                if (res.ok) {
                    showToast("Password updated successfully!");
                    setTimeout(() => window.location.href = "/login.html", 2000);
                } else {
                    showToast(data.error || "Password reset failed", true);
                }
            } catch (err) {
                showToast("Failed to connect", true);
            } finally {
                toggleLoading(btn, false);
            }
        });
    }
});
