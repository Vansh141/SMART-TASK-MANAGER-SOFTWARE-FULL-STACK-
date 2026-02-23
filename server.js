const errorHandler = require("./middleware/errorHandler");

require("dotenv").config();

// added for user authentication
const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const mongoose = require("mongoose");
const Task = require("./models/Task");
const auth = require("./middleware/auth");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));



// Get tasks for logged-in user
app.get("/tasks", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Add new task

app.post("/tasks", auth, async (req, res, next) => {
  try {
    const { text, priority, dueDate } = req.body;

    if (!text || text.trim().length < 3) {
      return res.status(400).json({ message: "Task text too short" });
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
    res.status(500).json({ error: "Task creation failed" }); // ✅ ONLY HERE
  }
});

// Toggle task completion
app.put("/tasks/:id/toggle", auth, async (req, res) => {
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
});

app.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      const err = new Error("All fields required");
      err.status = 400;
      throw err;
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    await user.save();
    res.json({ success: true, message: "User registered" });
  } catch (err) {
    next(err);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Wrong password" });
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Forgot Password
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });
    user.generatePasswordReset();
    await user.save();
    // TODO: Send email with reset link (demo: log to console)
    const resetUrl = `${req.protocol}://${req.get("host")}/reset.html#${user.resetPasswordToken}`;
    console.log(`Password reset link for ${email}: ${resetUrl}`);
    res.json({ message: "Reset link sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send reset link" });
  }
});

// Reset Password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset password" });
  }
});


// Delete task
// Delete task
app.delete("/tasks/:id", auth, async (req, res) => {
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
});
      

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});