document.addEventListener("DOMContentLoaded", () => {
    const taskForm = document.getElementById("task-form");
    const taskList = document.getElementById("taskList");
    const loading = document.getElementById("loading");
    const emptyState = document.getElementById("empty-state");
    const taskCount = document.getElementById("task-count");
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            window.location.href = "/login.html";
        });
    }

    // Set user info if decoded securely (not provided out-of-box with simple JWT localstorage, but we can do our best or omit)
    // But here we'll just check if the user is authenticated.
    if (!getToken()) {
        window.location.href = "/login.html";
        return;
    }

    fetchTasks();

    if (taskForm) {
        taskForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const titleInput = document.getElementById("task-title");
            // const descInput = document.getElementById("task-desc");
            const priorityInput = document.getElementById("priority");
            const dueDateInput = document.getElementById("due-date");

            const text = titleInput.value.trim();
            const priority = priorityInput.value;
            const dueDate = dueDateInput.value;

            if (!text) return showToast("Task cannot be empty", true);

            const btn = document.getElementById("add-task-btn");
            const originalText = btn.innerHTML;
            btn.innerHTML = `Adding...`;
            btn.disabled = true;

            try {
                const res = await fetch("/api/tasks", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getToken()}`,
                    },
                    body: JSON.stringify({ text, priority, dueDate }),
                });

                if (!res.ok) throw new Error("Failed to add task");

                titleInput.value = "";
                dueDateInput.value = "";

                showToast("Task added!", false);
                fetchTasks();
            } catch (err) {
                showToast("Failed to add task", true);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    async function fetchTasks() {
        if (!taskList) return;

        // Initialize drag and drop on the task list container if not already initialized
        if (!taskList.dataset.dndInit) {
            taskList.addEventListener("dragover", (e) => {
                const dragging = document.querySelector(".dragging");
                if (!dragging) return;

                e.preventDefault();

                const afterElement = getDragAfterElement(taskList, e.clientY);

                if (!afterElement) {
                    if (dragging !== taskList.lastElementChild) {
                        taskList.appendChild(dragging);
                    }
                } else if (afterElement !== dragging.nextSibling) {
                    taskList.insertBefore(dragging, afterElement);
                }
            });
            taskList.dataset.dndInit = "true";
        }

        loading.style.display = "flex";
        emptyState.style.display = "none";
        taskList.innerHTML = "";

        try {
            const res = await fetch("/api/tasks", {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    window.location.href = "/login.html";
                }
                throw new Error("Failed to fetch tasks");
            }

            const tasks = await res.json();

            if (taskCount) {
                taskCount.textContent = tasks.length;
            }

            if (!tasks.length) {
                loading.style.display = "none";
                emptyState.style.display = "flex";
                emptyState.style.flexDirection = "column";
                emptyState.style.alignItems = "center";
                return;
            }

            const fragment = document.createDocumentFragment();

            tasks.forEach(task => {
                const li = document.createElement("li");
                li.className = `task ${getDueStatus(task.dueDate, task.completed)} ${task.completed ? "completed" : ""}`;
                li.setAttribute("data-id", task._id);
                li.setAttribute("draggable", "true");

                li.addEventListener("dragstart", () => {
                    li.classList.add("dragging");
                });

                li.addEventListener("dragend", () => {
                    li.classList.remove("dragging");
                });

                li.innerHTML = `
          <div class="task-content">
            <strong class="task-title">${task.text}</strong>
            <div class="task-meta">Priority: ${task.priority} | Due: ${task.dueDate || "None"}</div>
          </div>
          <div class="task-actions">
            <button class="complete-btn" title="Complete task">✔</button>
            <button class="delete-btn" title="Delete task">✖</button>
          </div>
        `;
                li.querySelector('.complete-btn').addEventListener('click', () => window.toggleTask(task._id));
                li.querySelector('.delete-btn').addEventListener('click', () => window.deleteTask(task._id));
                fragment.appendChild(li);
            });

            taskList.appendChild(fragment);
        } catch (err) {
            showToast("Could not load tasks", true);
        } finally {
            loading.style.display = "none";
        }
    }

    window.toggleTask = async function (id) {
        try {
            const res = await fetch(`/api/tasks/${id}/toggle`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${getToken()}` },
            });

            if (!res.ok) throw new Error("Toggle failed");

            // Visual update
            const taskEl = document.querySelector(`[data-id="${id}"]`);
            if (taskEl) taskEl.classList.toggle("completed");
        } catch (err) {
            showToast("Failed to update task", true);
        }
    };

    window.deleteTask = async function (id) {
        try {
            const scrollY = window.scrollY;

            const res = await fetch(`/api/tasks/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${getToken()}` },
            });

            if (!res.ok) throw new Error("Delete failed");

            const taskEl = document.querySelector(`[data-id="${id}"]`);
            if (taskEl) taskEl.remove();

            // Recalculate count
            const taskEls = document.querySelectorAll(".task");
            if (taskCount) taskCount.textContent = taskEls.length;
            if (taskEls.length === 0 && emptyState) {
                emptyState.style.display = "flex";
                emptyState.style.flexDirection = "column";
                emptyState.style.alignItems = "center";
            }

            window.scrollTo(0, scrollY);
            showToast("Task deleted");
        } catch (err) {
            showToast("Failed to delete task", true);
        }
    };

    function getDueStatus(dueDate, completed) {
        if (completed) return "done";
        if (!dueDate) return "normal";
        const today = new Date();
        const due = new Date(dueDate);
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        if (due < today) return "overdue";
        if (due.getTime() === today.getTime()) return "today";
        return "normal";
    }

    // Helper for HTML5 drag and drop reordering
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
