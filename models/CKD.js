const mongoose = require("mongoose");

const CKDSchema = new mongoose.Schema({
  // Existing patient record fields
  patient:    String,
  mrn:        String,
  stage:      Number,
  egfr:       Number,
  creatinine: Number,
  bp:         String,
  dialysis:   String,
  date:       String,

  // Dialysis monitoring inputs (from the form)
  blood_pressure: { type: Number },
  heart_rate:     { type: Number },
  blood_urea:     { type: Number },
  hemoglobin:     { type: Number },
  complications:  { type: String, enum: ["Yes", "No"], default: "No" },

  // ML prediction output
  prediction:  { type: String },
  probability: { type: Number },
  risk_level:  { type: String },

}, { timestamps: true });

module.exports = mongoose.model("CKD", CKDSchema);