const mongoose = require("mongoose");

const DoctorSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  specialization: { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone:          { type: String, required: true, trim: true },
  license:        { type: String, required: true, unique: true, trim: true },
  password:       { type: String, required: true },
  role:           { type: String, default: "doctor" },
}, { timestamps: true });

module.exports = mongoose.model("Doctor", DoctorSchema);