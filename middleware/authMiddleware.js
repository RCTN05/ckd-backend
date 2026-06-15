const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "ckd_secret");
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};