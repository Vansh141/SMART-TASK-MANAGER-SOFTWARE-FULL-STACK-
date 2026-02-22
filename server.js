const errorHandler = require("./middleware/errorHandler");

require("dotenv").config();

// added for user authentication
const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const mongoose = require("mongoose");
const Task = require("./models/Task");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));



// Get all tasks
app.get("/tasks", auth, async (req, res) => {
  const tasks = await Task
  .find({ user: req.userId })
  .sort({ order: 1 });
  res.json(tasks);
});

// Add new task
app.post("/tasks", auth, async (req, res, next) => {
  try {
    const { text, priority, dueDate } = req.body;

    if (!text || text.trim().length < 2) {
      const err = new Error("Task text too short");
      err.status = 400;
      throw err;
    }

    const task = new Task({
      text,
      priority,
      dueDate,
      user: req.userId
    });

    await task.save();
    res.json({ success: true, task });

  } catch (err) {
    next(err);
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

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Toggle complete
app.put("/tasks/:id", async (req, res) => {
  const task = await Task.findById(req.params.id);
  task.completed = !task.completed;
  await task.save();
  res.json({ success: true });
});

// Delete task
app.delete("/tasks/:id", async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});


app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});