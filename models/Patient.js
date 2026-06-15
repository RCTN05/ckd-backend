const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema({
  name:   String,
  mrn:    { type: String, unique: true },
  age:    Number,
  gender: String,
}, { timestamps: true });

module.exports = mongoose.model("Patient", PatientSchema);