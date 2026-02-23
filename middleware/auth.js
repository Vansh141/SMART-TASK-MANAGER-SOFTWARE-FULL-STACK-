const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token, access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ⭐ VERY IMPORTANT — routes depend on this
    req.user = decoded;

    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};