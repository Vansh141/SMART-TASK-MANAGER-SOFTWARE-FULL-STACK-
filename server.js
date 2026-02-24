require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

// Fail-Fast: Verify critical deployment variables before starting
if (process.env.NODE_ENV === "production") {
  const requiredEnv = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL", "RESEND_API_KEY"];
  const missing = requiredEnv.filter(env => !process.env[env]);
  if (missing.length > 0) {
    console.error(`[CRITICAL SERVER ERROR] Missing required environment variables in production: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// Route files
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

// Security Hardening Middlewares
app.use(helmet());
app.use(cors());

// Body parser, with strict 10kb payload limit preventing DoS memory crashes
app.use(express.json({ limit: "10kb" }));

// Set static folder for frontend
app.use(express.static("public"));

// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// Database Connection with explicit production safety
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Securely"))
  .catch(err => console.error("MongoDB Fatal Connection Error: ", err.message));

// Error handling middleware
app.use(errorHandler);

// Handle unhandled rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});