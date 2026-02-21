const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  priority: { type: String, default: "Medium" },
  dueDate: { type: Date, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // ⭐ NEW
});

module.exports = mongoose.model("Task", taskSchema);