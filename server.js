require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const mongoose  = require("mongoose");
const { spawn } = require("child_process");
const path      = require("path");
const axios     = require("axios");
const multer    = require("multer");
const FormData  = require("form-data");

const patientRouter = require("./routes/patients");
const doctorRouter  = require("./routes/doctors");
const ckdRouter     = require("./routes/ckd");
const authRoutes    = require("./routes/auth");

const app        = express();
const PORT       = process.env.PORT       || 4000;
const FLASK_PORT = process.env.FLASK_PORT || 5000;

// ── 1. Middleware FIRST (before everything) ───────────────────────────────────
app.use(cors());
app.use(express.json());

// ── 2. MongoDB ────────────────────────────────────────────────────────────────
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((e) => console.error("MongoDB error:", e));
}

// ── 3. Routes (once each, no duplicates) ─────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/patients", patientRouter);
app.use("/api/doctors",  doctorRouter);   // ✅ uses doctorRouter, not authRoutes
app.use("/api/ckd",      ckdRouter);

// ── 4. Auto-start Flask ───────────────────────────────────────────────────────
const flaskScript  = path.join(__dirname, "predict_server.py");
const flaskProcess = spawn("python", [flaskScript], {
  stdio: "pipe",
  env: { ...process.env, FLASK_PORT },
});

flaskProcess.stdout.on("data", (d) => console.log(`[Flask] ${d.toString().trim()}`));
flaskProcess.stderr.on("data", (d) => console.error(`[Flask] ${d.toString().trim()}`));
flaskProcess.on("close", (c) => console.log(`[Flask] exited with code ${c}`));

process.on("exit",    () => flaskProcess.kill());
process.on("SIGINT",  () => { flaskProcess.kill(); process.exit(0); });
process.on("SIGTERM", () => { flaskProcess.kill(); process.exit(0); });

// ── 5. CKD Predict ───────────────────────────────────────────────────────────
app.post("/api/predict", async (req, res) => {
  try {
    const flaskRes = await axios.post(
      `http://localhost:${FLASK_PORT}/predict`,
      req.body
    );
    const prediction = flaskRes.data;
    const CKD    = require("./models/CKD");
    const record = new CKD({
      ...req.body,
      prediction:  prediction.prediction,
      probability: prediction.probability,
      risk_level:  prediction.risk_level,
      created_at:  new Date(),
    });
    await record.save();
    res.json({ ...prediction, recordId: record._id });
  } catch (err) {
    console.error("Predict error:", err.message);
    res.status(500).json({ error: "Prediction failed", detail: err.message });
  }
});

// ── 6. LSTM Hypotension ───────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/predict-hypotension", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename:    req.file.originalname,
      contentType: req.file.mimetype || "text/csv",
    });
    const flaskRes = await axios.post(
      `http://localhost:${FLASK_PORT}/predict-hypotension`,
      form,
      { headers: form.getHeaders() }
    );
    res.json(flaskRes.data);
  } catch (err) {
    console.error("Hypotension predict error:", err.message);
    res.status(500).json({ error: "Prediction failed", detail: err.message });
  }
});

// ── 7. Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Node  server → http://localhost:${PORT}`);
  console.log(`🐍 Flask server → http://localhost:${FLASK_PORT}  (starting...)`);
});