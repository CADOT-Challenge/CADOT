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
  app.get(`/${page === "home" ? "" : page}`, (req, res) => {
    res.render(page, { current: page });
  });
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

// Connect Mongoose
require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("./models/team");

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
      return res
        .status(400)
        .send(
          `<h3>One or more email addresses are already associated with a registered team.</h3><a href="/registration">Back to Registration</a>`
        );
    }

    // Save new team
    const team = new Team({ teamName, members, password, score: 0 });
    await team.validate(); // Validate the team before saving
    await team.save();

    // Send confirmation
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: members.map((m) => m.email),
      subject: `Registration Confirmed for Team "${teamName}"`,
      html: `
        <p>Hello ${members[0].firstName},</p>
        <p>Your team <strong>${teamName}</strong> has been successfully registered for the CADOT Challenge.</p>
        <p>Use this password to submit your results: <strong>${password}</strong></p>
        <p>Make sure to keep it safe and do not share it with anyone.</p>
        <p>We look forward to your submission!</p>
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

    res.send(
      `<h2>Team <strong>${teamName}</strong> registered successfully! Confirmation sent to ${members[0].email}.</h2><a href="/">Back to Home</a>`
    );
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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

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
