function openPasswordPopup() {
  document.getElementById("passwordModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("passwordModal").style.display = "none";
  document.getElementById("resultPassword").value = "";
  document.getElementById("errorText").style.display = "none";
}
let verifiedTeamName = null;
let enteredPassword = null;

function checkPassword() {
  enteredPassword = document.getElementById("resultPassword").value;

  fetch("/api/check-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: enteredPassword }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        verifiedTeamName = data.teamName;
        closeModal();
        document.getElementById("fileInput").click(); // Open file picker
      } else {
        document.getElementById("errorText").style.display = "block";
      }
    })
    .catch(() => {
      document.getElementById("errorText").style.display = "block";
    });
}

function handleFileUpload() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const isJsonType = file.type === "application/json";
  const isJsonExtension = file.name.toLowerCase().endsWith(".json");

  if (!isJsonType && !isJsonExtension) {
    alert("Please upload a valid .json file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const json = JSON.parse(event.target.result);

      alert(`File "${file.name}" is valid. Uploading...`);

      // fetch("/api/upload-result", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     data: json,
      //     fileName: file.name,
      //     teamName: verifiedTeamName,
      //   }),
      // })
      //   .then((res) => res.json())
      //   .then((data) => {
      //     if (data.success) {
      //       alert(
      //         "File uploaded and email sent to cadot.challenge@gmail.com!"
      //       );
      //     } else {
      //       alert("Upload failed. Please try again.");
      //     }
      //   })
      //   .catch(() => {
      //     alert("Upload failed. Please try again.");
      //   });

      fetch("https://cadot-evaluation.onrender.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: json,
          fileName: file.name,
          teamName: verifiedTeamName,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log(data)
          handleUpdateScore(data)
        })
        .catch(() => {
          alert("Upload failed. Please try again.");
        });
    } catch (err) {
      alert("Invalid JSON format. Please check your file.");
    }
  };

  reader.readAsText(file);
}

function handleUpdateScore(data) {
  console.log("input data", data)
  const { file, message, score, team } = data
  fetch("/api/update-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file: file,
      score: score,
      teamName: team,
      password: enteredPassword
    }),
  }).then(res => res.json()).then((data) => {
    if (data.success) {
      alert(
        "Your team score: " + score
      );
      window.location.reload();
    } else {
      alert("Upload failed. Please try again.");
    }
  })
}