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
      <button onclick="toggleTask('${task._id}')">✔</button>
      <button onclick="deleteTask('${task._id}')">❌</button>
    `;

    taskList.appendChild(li);
  });
}

// ➕ ADD TASK
async function addTask() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "Adding...";

  try {
    const text = document.getElementById("taskInput").value.trim();
    const priority = document.getElementById("priority").value;
    const dueDateValue = document.getElementById("dueDate").value;

    await fetch("/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text, priority, dueDate: dueDateValue })
    });

    document.getElementById("taskInput").value = "";
    fetchTasks();
  } catch (err) {
    alert("Failed to add task");
  } finally {
    btn.disabled = false;
    btn.textContent = "Add Task";
  }
}

// ✅ TOGGLE
async function toggleTask(id) {
  await fetch(`/tasks/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  fetchTasks();
}

// ❌ DELETE
async function deleteTask(id) {
  await fetch(`/tasks/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  fetchTasks();
}

// 🔄 AUTO LOGIN
if (token) {
  showTasks();
}

function toggleTheme() {
  document.body.classList.toggle("light");

  const mode = document.body.classList.contains("light")
    ? "light"
    : "dark";

  localStorage.setItem("theme", mode);
}

// load saved theme
(function () {
  const saved = localStorage.getItem("theme");
  if (saved === "light") document.body.classList.add("light");
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