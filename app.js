// app.js
const express = require("express");
const path = require("path");
const app = express();
const expressLayouts = require("express-ejs-layouts");
const nodemailer = require("nodemailer");
app.use(expressLayouts);
app.set("layout", "layout");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));
app.use(express.json());
require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("./models/team");
const pages = [
  "home",
  "dataset",
  "timeline",
  "registration",
  "prizes",
  "results",
  "team",
  "contact",
];
pages.forEach((page) => {
  if (page === "results") {
    app.get("/results", async (req, res) => {
      try {
        const topTeams = await Team.find({ score: { $gt: 0 } })
          .sort({ score: -1, submittedAt: 1 })
          .limit(10);
        res.render("results", { current: "results", topTeams });
      } catch (err) {
        console.error("Error fetching top teams:", err);
        res.render("results", { current: "results", topTeams: [] });
      }
    });
  } else {
    app.get(`/${page === "home" ? "" : page}`, (req, res) => {
      res.render(page, { current: page });
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

// Generate a random password
const generatePassword = require("generate-password");

const password = generatePassword.generate({
  length: 16,
  numbers: true,
  symbols: true,
  uppercase: true,
  lowercase: true,
  strict: true,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Connect Mongoose


mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// send email confirmation
app.post("/submit-registration", async (req, res) => {
  const { teamName, firstName, lastName, email, institute } = req.body;

  const members = firstName.map((_, i) => ({
    firstName: firstName[i],
    lastName: lastName[i],
    email: email[i],
    institute: institute[i],
  }));

  try {
    // Check for duplicate team name
    const existingTeamByName = await Team.findOne({ teamName });
    if (existingTeamByName) {
      return res
        .status(400)
        .send(
          `<h3>The team name <strong>${teamName}</strong> is already registered.</h3><a href="/registration">Back to Registration</a>`
        );
    }

    // Check for email duplication across teams
    const existingTeamByEmail = await Team.findOne({
      "members.email": { $in: email },
    });
    if (existingTeamByEmail) {
      return res.status(400).json({
        success: false,
        message: "One or more email addresses are already associated with a registered team.",
      });
    }

    // Save new team
    const team = new Team({ teamName, members, password, score: 0 });
    const emailSet = new Set(email);
    if (emailSet.size !== email.length) {
      return res.status(400).json({
        success: false,
        message: "Each team member must have a unique email address.",
      });
    } else {
      await team.validate(); // Validate the team before saving
      await team.save();
    }
    // Send confirmation

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: members.map((m) => m.email),
      subject: `Registration Confirmed for Team "${teamName}"`,
      html: `
        <p>Hello ${members[0].firstName},</p>
    
        <p>Your team <strong>${teamName}</strong> has been successfully registered for the CADOT Challenge.</p>
        <p><strong>Password for result submission:</strong> <code>${password}</code></p>
        <p>Please keep it secure — do not share it with others.</p>
    
        <h4>🔑 Important Notes:</h4>
        <pre style="background-color:#f8f8f8; padding:10px; border-radius:5px;">
        Keep your registration password safe for results submission.
        
        Final rankings will consider both results and repository quality.
        
        Contact organizers if you encounter technical issues:
        📧 <a href="mailto:cadot.challenge@gmail.com">cadot.challenge@gmail.com</a>
        </pre>
    
        <p>🎯 We look forward to your amazing solutions! Let's innovate! 🚀</p>
    
        <hr>
        <p><strong>Team Members:</strong></p>
        <ul>
          ${members
          .map(
            (m) =>
              `<li>${m.firstName} ${m.lastName} (${m.email}) – ${m.institute}</li>`
          )
          .join("")}
        </ul>
      `,
    };
    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: `Team "${teamName}" registered successfully! Confirmation sent to ${members[0].email}.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving registration or sending email.");
  }
});
// check password for upload result
app.post("/api/check-password", async (req, res) => {
  const { password } = req.body;
  try {
    const team = await Team.findOne({ password });
    if (team) {
      return res.status(200).json({ success: true, teamName: team.teamName });
    } else {
      return res.status(401).json({ success: false });
    }
  } catch (err) {
    console.error("Error checking password:", err);
    return res.status(500).json({ success: false });
  }
});

app.post("/api/upload-result", async (req, res) => {
  const { data, fileName, teamName } = req.body;

  if (!data) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `Team: ${teamName} new result submitted`,
    text: `A new result file has been uploaded.\n\nFile name: ${fileName}`,
    html: `
      <p><strong>New result submitted by team:</strong> ${teamName}</p>
      <p><strong>File:</strong> ${fileName}</p>
      <p>The full JSON content is attached as a file.</p>
    `,
    attachments: [
      {
        filename: fileName.endsWith(".json") ? fileName : `${fileName}.json`,
        content: JSON.stringify(data, null, 2),
        contentType: "application/json",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

app.post("/api/update-score", async (req, res) => {
  const { file, score, teamName, password } = req.body;

  if (!teamName || !password || typeof score !== "number") {
    return res.status(400).json({ success: false, message: "Missing or invalid data." });
  }

  try {
    const team = await Team.findOneAndUpdate(
      { teamName: teamName, password: password },
      { $set: { score: parseFloat((score).toFixed(4)), submittedAt: new Date() } },
      { new: true }
    );

    if (!team) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: team.members.map(m => m.email),
      subject: `Team: ${teamName} new result submitted`,
      text: `A new result file has been uploaded.\n\nFile name: ${file}`,
      html: `
        <p><strong>File:</strong> ${file}</p>
        <p>Your team score: ${parseFloat((score * 100).toFixed(2))}</p>
      `,
    };
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: `Score updated for ${team.teamName}`,
      newScore: team.score,
    });
  } catch (err) {
    console.error("Error updating score:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

app.get("/results", async (req, res) => {
  try {
    const topTeams = await Team.find({ score: { $gt: -1 } }) // Only teams with scores
      .sort({ score: -1, submittedAt: 1 }) // High score + earlier time
      .limit(10);
    res.render("results", { current: "results", topTeams });
  } catch (err) {
    console.error("Error loading results:", err);
    res.render("results", { current: "results", topTeams: [] });
  }
});

// Contact
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Contact Message from ${name}`,
      html: `
        <p><strong>Sender:</strong> ${name} (${email})</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br/>")}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({
      success: true,
      message: `Thanks, ${name}! We'll get back to you soon.`,
    });
  } catch (err) {
    console.error("Error sending contact email:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send email. Please try again later.",
    });
  }
});
