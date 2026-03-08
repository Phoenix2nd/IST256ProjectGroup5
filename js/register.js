const form = document.getElementById("registration-form");
const tableBody = document.querySelector("#attendeeTable tbody");

let attendees = JSON.parse(localStorage.getItem("attendees")) || [];


function renderTable() {

  tableBody.innerHTML = "";

  attendees.forEach((person, index) => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${person.name}</td>
      <td>${person.email}</td>
      <td>${person.age}</td>
      <td>${person.institution}</td>
      <td>${person.phone || "-"}</td>
      <td>
        <button onclick="editAttendee(${index})">Edit</button>
        <button onclick="deleteAttendee(${index})">Delete</button>
      </td>
    `;

    tableBody.appendChild(row);

  });

}


form.addEventListener("submit", function(e) {

  e.preventDefault();

  const name = document.getElementById("full-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const age = document.getElementById("age").value;
  const institution = document.getElementById("institution").value.trim();
  const phone = document.getElementById("phone").value.trim();

  if (!name || !email || !age || !institution) {

    alert("Please fill out all required fields.");
    return;

  }

  const attendee = {
    name,
    email,
    age,
    institution,
    phone
  };

  attendees.push(attendee);

  localStorage.setItem("attendees", JSON.stringify(attendees));

  form.reset();

  renderTable();

});


function deleteAttendee(index) {

  attendees.splice(index, 1);

  localStorage.setItem("attendees", JSON.stringify(attendees));

  renderTable();

}


function editAttendee(index) {

  const person = attendees[index];

  document.getElementById("full-name").value = person.name;
  document.getElementById("email").value = person.email;
  document.getElementById("age").value = person.age;
  document.getElementById("institution").value = person.institution;
  document.getElementById("phone").value = person.phone;

  attendees.splice(index, 1);

  localStorage.setItem("attendees", JSON.stringify(attendees));

  renderTable();

}


renderTable();
