const router = require("express").Router();
const Patient = require("../models/Patient");

router.get("/", async (req, res) => {
  const patients = await Patient.find();
  res.json(patients);
});

router.post("/", async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;