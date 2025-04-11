function openPasswordPopup() {
  document.getElementById("passwordModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("passwordModal").style.display = "none";
  document.getElementById("resultPassword").value = "";
  document.getElementById("errorText").style.display = "none";
}
let verifiedTeamName = null;

function checkPassword() {
  const enteredPassword = document.getElementById("resultPassword").value;

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

// Step 4: Handle file upload (after password success)
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

      // Optional confirmation
      alert(`File "${file.name}" is valid. Uploading...`);

      // Step 5: Upload to backend and notify organizers
      fetch("/api/upload-result", {
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
          if (data.success) {
            alert(
              "File uploaded and email sent to cadot.challenge@gmail.com!"
            );
          } else {
            alert("Upload failed. Please try again.");
          }
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
