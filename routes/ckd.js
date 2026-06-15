const router = require("express").Router();
const CKD    = require("../models/CKD");

// GET all CKD records — used by the dashboard to display history
router.get("/", async (req, res) => {
  try {
    // Return newest first, limit to last 50 for dashboard performance
    const records = await CKD.find()
      .sort({ created_at: -1 })
      .limit(50);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a raw CKD record (without ML prediction) — optional direct save
router.post("/", async (req, res) => {
  try {
    const record = new CKD(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;