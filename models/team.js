const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, required: true },
    institute: String
});

const teamSchema = new mongoose.Schema({
    teamName: { type: String, required: true, unique: true },
    members: [memberSchema],
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', teamSchema);
