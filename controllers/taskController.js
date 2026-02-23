const Task = require("../models/Task");

// @desc      Get all tasks for logged-in user
// @route     GET /api/tasks
// @access    Private
exports.getTasks = async (req, res, next) => {
    try {
        const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
};

// @desc      Add new task
// @route     POST /api/tasks
// @access    Private
exports.addTask = async (req, res, next) => {
    try {
        const { text, priority, dueDate } = req.body;

        if (!text || text.trim().length < 3) {
            return res.status(400).json({ message: "Task text too short" });
        }

        if (dueDate) {
            const d = new Date(dueDate);
            if (isNaN(d)) {
                return res.status(400).json({ message: "Invalid due date format" });
            }
            const year = d.getFullYear();
            if (year < 2000 || year > 2100) {
                return res.status(400).json({ message: "Invalid due date" });
            }
        }

        const task = new Task({
            text,
            priority,
            dueDate,
            user: req.user.id,
        });

        await task.save();
        res.status(201).json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Task creation failed" });
    }
};

// @desc      Toggle task completion
// @route     PUT /api/tasks/:id/toggle
// @access    Private
exports.toggleTask = async (req, res, next) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            user: req.user.id,
        });

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        task.completed = !task.completed;
        await task.save();

        res.json(task);
    } catch (err) {
        console.error("Toggle error:", err);
        res.status(500).json({ error: "Toggle failed" });
    }
};

// @desc      Delete task
// @route     DELETE /api/tasks/:id
// @access    Private
exports.deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id,
        });

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        res.json({ message: "Task deleted" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ error: "Delete failed" });
    }
};
