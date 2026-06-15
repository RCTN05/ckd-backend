const router = require("express").Router();
const Doctor = require("../models/Doctor");

// GET all doctors
router.get("/", async (req, res) => {
  const doctors = await Doctor.find();
  res.json(doctors);
});

// POST register a doctor
router.post("/", async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;