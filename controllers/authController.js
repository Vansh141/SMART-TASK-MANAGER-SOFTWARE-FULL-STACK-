const crypto = require("crypto");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || "30d"
    });

    res.status(statusCode).json({
        success: true,
        token
    });
};

// @desc      Register user
// @route     POST /api/auth/register
// @access    Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Quick validation
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ success: false, error: "Please provide all required fields" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, error: "Passwords do not match" });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, error: "Email already registered" });
        }

        // Create user
        user = await User.create({
            name,
            email,
            password
        });

        sendTokenResponse(user, 201, res);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || "Server Error" });
    }
};

// @desc      Login user
// @route     POST /api/auth/login
// @access    Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate email and password inputs
        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Please provide an email and password" });
        }

        // Check for user
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid credentials" });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Invalid credentials" });
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || "Server Error" });
    }
};

// @desc      Forgot password
// @route     POST /api/auth/forgot-password
// @access    Public
exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        // Important Security Feature: Do not reveal if email exists.
        // If user not found, we still return successfully.
        if (!user) {
            return res.status(200).json({ success: true, message: "If that email is in our database, we will send a reset link." });
        }

        // Get reset token
        const resetToken = user.getResetPasswordToken();

        await user.save({ validateBeforeSave: false });

        // 🔴 SECURITY CHECK: Verify CLIENT_URL exists if in production
        if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
            console.error("[CRITICAL] CLIENT_URL environment variable is missing in production!");
            return res.status(500).json({ success: false, error: "Server configuration error" });
        }

        // Create reset url dynamically based on environment
        let clientUrl = process.env.CLIENT_URL;

        // Add safe fallback handling if CLIENT_URL is missing or set to a placeholder like example.com
        if (!clientUrl || clientUrl.includes("example.com")) {
            const host = req.headers["x-forwarded-host"] || req.get("host");
            const protocol = req.headers["x-forwarded-proto"] || req.protocol;
            clientUrl = `${protocol}://${host}`;
        }

        const resetUrl = `${clientUrl}/reset-password.html?token=${resetToken}`;

        const message = `You are receiving this email because you (or someone else) requested a password reset. Please go to: \n\n ${resetUrl}`;

        // Professional HTML Email Template
        const htmlMessage = `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Inter', Arial, sans-serif; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #4f46e5; margin: 0;">🧠 Smart Task Manager</h1>
            </div>
            <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #111827; margin-top: 0;">Reset Your Password</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">You recently requested to reset your password for your Smart Task Manager account. Click the button below to proceed.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">If you did not request a password reset, please ignore this email. This password reset link will expire in 15 minutes.</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} Smart Task Manager. All rights reserved.</p>
            </div>
          </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: "Smart Task Manager - Password Reset",
                message,
                htmlMessage
            });

            res.status(200).json({ success: true, message: "If that email is in our database, we will send a reset link." });
        } catch (err) {
            console.error("\n[CRITICAL ERROR - authController] The sendEmail function explicitly threw an error!");
            console.error("Full Error Output: ", err);

            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ success: false, error: "Email could not be sent" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || "Server Error" });
    }
};

// @desc      Reset password
// @route     PUT /api/auth/reset-password/:token
// @access    Public
exports.resetPassword = async (req, res, next) => {
    try {
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword || password !== confirmPassword) {
            return res.status(400).json({ success: false, error: "Passwords must match and be valid." });
        }

        // Get hashed token
        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: "Invalid or expired token" });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || "Server Error" });
    }
};
