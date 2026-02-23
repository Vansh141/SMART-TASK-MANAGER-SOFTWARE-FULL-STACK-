const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

// Generate password reset token
userSchema.methods.generatePasswordReset = function() {
  this.resetPasswordToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 min expiry
};

module.exports = mongoose.model("User", userSchema);