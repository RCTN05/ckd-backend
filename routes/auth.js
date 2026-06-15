const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const Doctor  = require("../models/Doctor");

// ── SIGNUP ────────────────────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  const { name, specialization, phone, license, email, password, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  try {
    const existing = await Doctor.findOne({ email });
    if (existing)
      return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const doctor = new Doctor({ 
      name, 
      specialization, 
      phone,           
      license,         
      email, 
      password: hashed, 
      role: role || "doctor" 
    });
    await doctor.save();

    const token = jwt.sign(
      { id: doctor._id, email: doctor.email, role: doctor.role },
      process.env.JWT_SECRET || "ckd_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: doctor._id, name: doctor.name, email: doctor.email, role: doctor.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const doctor = await Doctor.findOne({ email });
    if (!doctor)
      return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, doctor.password);
    if (!match)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: doctor._id, email: doctor.email, role: doctor.role },
      process.env.JWT_SECRET || "ckd_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: doctor._id, name: doctor.name, email: doctor.email, role: doctor.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;