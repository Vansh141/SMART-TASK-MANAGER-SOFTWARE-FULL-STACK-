function getDueStatus(dueDate, completed) {
  if (completed) return "done";

  if (!dueDate) return "normal";

  const today = new Date();
  const due = new Date(dueDate);

  // remove time for accurate compare
  today.setHours(0,0,0,0);
  due.setHours(0,0,0,0);

  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  return "normal";
}

let draggedItem = null;
const taskList = document.getElementById("taskList");
taskList.addEventListener("dragover", (e) => {
  e.preventDefault();

  const afterElement = getDragAfterElement(taskList, e.clientY);
  const dragging = document.querySelector(".dragging");

  if (afterElement == null) {
    taskList.appendChild(dragging);
  } else {
    taskList.insertBefore(dragging, afterElement);
  }
});
const API = "";
let token = localStorage.getItem("token");

// 🔐 REGISTER
async function register() {
  const name = regName.value;
  const email = regEmail.value;
  const password = regPassword.value;

  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();
  alert(data.message || data.error);
}

// 🔐 LOGIN
async function login() {
  const email = loginEmail.value;
  const password = loginPassword.value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    token = data.token;
    showTasks();
  } else {
    alert(data.error);
  }
}

// 🚪 LOGOUT
function logout() {
  localStorage.removeItem("token");
  token = null;
  location.reload();
}

// 👀 SHOW TASK UI
function showTasks() {
  authSection.style.display = "none";
  taskSection.style.display = "block";
  fetchTasks();
}

// 📥 FETCH TASKS
async function fetchTasks() {
  const res = await fetch("/tasks", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const tasks = await res.json();
  taskList.innerHTML = "";

  tasks.forEach(task => {
    const li = document.createElement("li");
    li.classList.add("task");
    const status = getDueStatus(task.dueDate, task.completed);
  li.classList.add(status);

    li.setAttribute("draggable", "true");
    li.setAttribute("data-id", task._id);
    li.addEventListener("dragstart", () => {
  draggedItem = li;
  li.classList.add("dragging");
});

li.addEventListener("dragend", () => {
  draggedItem = null;
  li.classList.remove("dragging");
}); 
    if (task.completed) li.classList.add("completed");

    li.innerHTML = `
      <strong>${task.text}</strong><br>
      Priority: ${task.priority} | Due: ${task.dueDate || "None"}<br>
      <button class="complete-btn" onclick='toggleTask("${task._id}")'>✔</button>
      <button class="delete-btn" onclick='deleteTask("${task._id}")'>❌</button>
    `;

    taskList.appendChild(li);
  });
}

// ➕ ADD TASK
async function addTask() {
  const btn = event.target;

  try {
    const text = document.getElementById("taskInput").value.trim();
    const priority = document.getElementById("priority").value;
    const dueDateValue = document.getElementById("dueDate").value;

    // ✅ STEP 1 — validate BEFORE disabling
    if (!text) {
      alert("Task cannot be empty");
      return;
    }

    // ✅ STEP 2 — now disable button
    btn.disabled = true;
    btn.textContent = "Adding...";

    // ✅ STEP 3 — send request
    const res = await fetch("/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        priority,
        dueDate: dueDateValue,
      }),
    });

    // ✅ STEP 4 — check response
    if (!res.ok) {
      throw new Error("Failed to add task");
    }

    // ✅ STEP 5 — clear inputs
    document.getElementById("taskInput").value = "";
    document.getElementById("dueDate").value = "";

    // ✅ STEP 6 — refresh list
    fetchTasks();

  } catch (err) {
    alert("Failed to add task");
  } finally {
    // ✅ STEP 7 — always re-enable button
    btn.disabled = false;
    btn.textContent = "Add Task";
  }
}

// ✅ TOGGLE
async function toggleTask(id) {
  try {
    const res = await fetch(`/tasks/${id}/toggle`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Toggle failed");

    fetchTasks();
  } catch (err) {
    console.error(err);
    alert("Failed to toggle task");
  }
}

// ❌ DELETE
async function deleteTask(id) {
  try {
    const res = await fetch(`/tasks/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Delete failed");
    }

    fetchTasks(); // refresh list
  } catch (err) {
    console.error(err);
    alert("Failed to delete task");
  }
}

// 🔄 AUTO LOGIN
if (token) {
  showTasks();
}

function toggleTheme() {
  document.body.classList.toggle("dark");

  const mode = document.body.classList.contains("dark")
    ? "dark"
    : "light";

  localStorage.setItem("theme", mode);
}

// load saved theme
(function () {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
})();

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