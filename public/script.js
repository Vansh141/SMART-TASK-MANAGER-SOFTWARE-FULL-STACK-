// ===== GLOBAL =====
const API = "";
function getToken() { return localStorage.getItem("token"); }

document.addEventListener("DOMContentLoaded", () => {
  // ===== DOM REFERENCES =====
  const authSection = document.getElementById("auth-section");
  const dashboardSection = document.getElementById("dashboard-section");
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const forgotForm = document.getElementById("forgot-form");
  const resetForm = document.getElementById("reset-form");
  const showForgot = document.getElementById("show-forgot");
  const backToLogin = document.getElementById("back-to-login");
  const taskForm = document.getElementById("task-form");
  const taskList = document.getElementById("taskList");
  const dashboardHeader = document.getElementById("dashboard-header");

  // ===== DARK MODE TOGGLE (UI WIRING) =====
  const themeToggle = document.getElementById("theme-toggle");
  const themeToggleAuth = document.getElementById("theme-toggle-auth");
  if (!themeToggle) console.warn("Missing element:", "theme-toggle");
  if (!themeToggleAuth) console.warn("Missing element:", "theme-toggle-auth");
  themeToggle?.addEventListener("click", toggleTheme);
  themeToggleAuth?.addEventListener("click", toggleTheme);
  // Restore theme on load
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);

  const icon = theme === "dark" ? "☀️" : "🌙";
  if (themeToggle) themeToggle.textContent = icon;
  if (themeToggleAuth) themeToggleAuth.textContent = icon;
}

  function toggleTheme() {
    const isDark = document.body.classList.contains("dark");
    const newTheme = isDark ? "light" : "dark";
    applyTheme(newTheme);
  }

  // ===== FORM HANDLERS =====
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      register();
    });
  }
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      login();
    });
  }
  if (forgotForm) {
    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      forgotPassword();
    });
  }
  if (resetForm) {
    resetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      resetPassword();
    });
  }
  if (showForgot && loginForm && forgotForm) {
    showForgot.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.style.display = "none";
      forgotForm.style.display = "block";
    });
  }
  if (backToLogin && loginForm && forgotForm) {
    backToLogin.addEventListener("click", (e) => {
      e.preventDefault();
      forgotForm.style.display = "none";
      loginForm.style.display = "block";
    });
  }
  if (taskForm) {
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addTask(e);
    });
  }
  function ensureLogoutButton() {
    let logoutBtn = document.getElementById("logout-btn");
    if (!logoutBtn && dashboardHeader) {
      logoutBtn = document.createElement("button");
      logoutBtn.id = "logout-btn";
      logoutBtn.textContent = "Logout";
      logoutBtn.className = "navbar-btn";
      logoutBtn.style.marginLeft = "16px";
      dashboardHeader.appendChild(logoutBtn);
    }
    logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.removeEventListener("click", logout);
      logoutBtn.addEventListener("click", logout);
    }
  }
  if (getToken()) {
    showTasks();
  }
  if (taskList) {
  taskList.addEventListener("dragover", (e) => {
    const dragging = document.querySelector(".dragging");

    // ✅ DO NOTHING if not actively dragging
    if (!dragging) return;

    e.preventDefault();

    const afterElement = getDragAfterElement(taskList, e.clientY);

    // ✅ prevent useless DOM moves
    if (!afterElement) {
      if (dragging !== taskList.lastElementChild) {
        taskList.appendChild(dragging);
      }
    } else if (afterElement !== dragging.nextSibling) {
      taskList.insertBefore(dragging, afterElement);
    }
  });
}
  function showTasks() {
    if (authSection) authSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";
    const navbarUser = document.getElementById("navbar-user");
    const navbarAuth = document.getElementById("navbar-auth");
    if (navbarUser) navbarUser.style.display = "flex";
    if (navbarAuth) navbarAuth.style.display = "none";
    ensureLogoutButton();
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", logout);
    fetchTasks();
  }
  async function fetchTasks() {
    if (!taskList) {
      alert("Task list element missing.");
      return;
    }
    const scrollPos = taskList.scrollTop;
    taskList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    try {
      const res = await fetch("/tasks", {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const tasks = await res.json();
      if (!Array.isArray(tasks)) return;
      tasks.forEach(task => {
        const li = document.createElement("li");
        li.classList.add("task");
        const status = getDueStatus(task.dueDate, task.completed);
        li.classList.add(status);
        li.setAttribute("draggable", "true");
        li.setAttribute("data-id", task._id);
        li.addEventListener("dragstart", () => {
          li.classList.add("dragging");
        });
        li.addEventListener("dragend", () => {
          li.classList.remove("dragging");
        });
        if (task.completed) li.classList.add("completed");
        li.innerHTML = `
        <strong>${task.text}</strong><br>
        Priority: ${task.priority} | Due: ${task.dueDate || "None"}<br>

        <button type="button" class="complete-btn" onclick="toggleTask('${task._id}')">✔</button>
        <button type="button" class="delete-btn" onclick="deleteTask('${task._id}')">✖</button>
        `;
        fragment.appendChild(li);
      });
      taskList.appendChild(fragment);
      taskList.scrollTop = scrollPos;
    } catch (err) {
      alert("Failed to load tasks");
    }
  }
  async function addTask(e) {
    const textInput = document.getElementById("task-title") || document.getElementById("taskInput");
    const descInput = document.getElementById("task-desc");
    const priorityInput = document.getElementById("priority");
    const dueDateInput = document.getElementById("due-date") || document.getElementById("dueDate");
    if (!textInput || !priorityInput) return;
    const text = textInput.value.trim();
    const description = descInput ? descInput.value.trim() : "";
    const priority = priorityInput.value;
    const dueDate = dueDateInput ? dueDateInput.value : "";
    if (!text) {
      alert("Task cannot be empty");
      return;
    }
    const btn = e && e.target && e.target.tagName === "BUTTON" ? e.target : null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Adding...";
    }
    try {
      const res = await fetch("/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ text, description, priority, dueDate }),
      });
      if (!res.ok) throw new Error("Failed to add task");
      if (textInput) textInput.value = "";
      if (descInput) descInput.value = "";
      if (dueDateInput) dueDateInput.value = "";
      fetchTasks();
    } catch (err) {
      alert("Failed to add task");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Add Task";
      }
    }
  }
  async function register() {
    const name = document.getElementById("register-name")?.value;
    const email = document.getElementById("register-email")?.value;
    const password = document.getElementById("register-password")?.value;
    if (!name || !email || !password) {
      alert("All fields required");
      return;
    }
    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Registered successfully! Please login.");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      alert("Registration failed");
    }
  }
  async function login() {
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    if (!emailInput || !passwordInput) {
      alert("Login inputs not found");
      return;
    }
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        showTasks();
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      alert("Login failed");
    }
  }
  function logout() {
    localStorage.removeItem("token");
    // If you have an in-memory token variable, clear it here as well
    location.reload();
  }
  async function forgotPassword() {
    alert("Forgot password feature coming soon.");
  }
  async function resetPassword() {
    alert("Reset password feature coming soon.");
  }
  window.toggleTask = async function(id) {
    try {
      const res = await fetch(`/tasks/${id}/toggle`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Toggle failed");
      fetchTasks();
    } catch (err) {
      alert("Failed to toggle task");
    }
  };
  window.deleteTask = async function(id) {
    try {
      const res = await fetch(`/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchTasks();
    } catch (err) {
      alert("Failed to delete task");
    }
  };
  function getDueStatus(dueDate, completed) {
    if (completed) return "done";
    if (!dueDate) return "normal";
    const today = new Date();
    const due = new Date(dueDate);
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    if (due < today) return "overdue";
    if (due.getTime() === today.getTime()) return "today";
    return "normal";
  }
  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".task:not(.dragging)")
    ];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }
});





