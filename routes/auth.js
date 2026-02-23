const express = require("express");
const {
    register,
    login,
    forgotPassword,
    resetPassword
} = require("../controllers/authController");

const router = express.Router();

const rateLimit = require("express-rate-limit");

// Add rate limiting for forgot password
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 forgot password requests per windowMs
    message: { success: false, error: "Too many password resets. Please try again later." }
});
// Add rate limiting for auth processes (prevent brute forcing passwords)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Max 10 attempts
    message: { success: false, error: "Too many requests. Please try again later." }
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.put("/reset-password/:token", resetPassword);

module.exports = router;
