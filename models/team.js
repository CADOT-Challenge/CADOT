const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, required: true },
  institute: String,
});

const teamSchema = new mongoose.Schema({
  teamName: { type: String, required: true, unique: true },
  members: [memberSchema],
  password: { type: String, required: true },
  score: {
    type: Number,
    default: 0,
    set: (v) => Math.round(v * 10000) / 10000,
  },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("team", teamSchema);
