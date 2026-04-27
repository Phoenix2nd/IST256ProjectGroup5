const { useState, useEffect } = React;

function FinalizationApp() {
  const [attendees, setAttendees] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [message, setMessage] = useState("");
  const [jsonPreview, setJsonPreview] = useState("");

  useEffect(() => {
    const storedAttendees = JSON.parse(localStorage.getItem("attendees")) || [];
    const storedCart = JSON.parse(localStorage.getItem("conferenceCart")) || [];

    setAttendees(storedAttendees);
    setCartItems(storedCart);

    document.querySelectorAll("section").forEach(section => {
      section.classList.add("card", "shadow-sm", "p-3", "mb-4");
    });

    document.querySelectorAll("input[type='text'], input[type='email'], input[type='tel'], select").forEach(el => {
      el.classList.add("form-control");
    });

    document.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach(el => {
      el.classList.add("form-check-input");
    });

    document.querySelectorAll("button[type='submit']").forEach(btn => {
      btn.classList.add("btn", "btn-primary", "me-2");
    });

    document.querySelectorAll("button[type='reset']").forEach(btn => {
      btn.classList.add("btn", "btn-outline-secondary", "me-2");
    });
  }, []);

  function buildPayload() {
    const fullName = document.getElementById("full-name")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const institution = document.getElementById("institution")?.value.trim() || "";
    const attendeeType = document.getElementById("attendee-type")?.value || "";

    const participationType =
      document.querySelector("input[name='participation_type']:checked")?.value || "";

    const selectedSessions = Array.from(
      document.querySelectorAll("input[name='sessions']:checked")
    ).map(item => item.value);

    return {
      attendee: {
        full_name: fullName,
        email: email,
        institution: institution,
        attendee_type: attendeeType
      },
      participation_type: participationType,
      sessions: selectedSessions,
      attendees_from_localStorage: attendees,
      cart_from_localStorage: cartItems,
      submitted_at: new Date().toISOString()
    };
  }

  function handleReactSubmit() {
    const payload = buildPayload();

    if (!payload.attendee.full_name || !payload.attendee.email) {
      setMessage("Please enter your full name and email before submitting.");
      return;
    }

    setJsonPreview(JSON.stringify(payload, null, 2));

    fetch("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        console.log("Order saved:", data);
        setMessage("Registration submitted successfully. Status: Pending approval.");
      })
      .catch(error => {
        console.error("Submit error:", error);
        setMessage("There was an error submitting your registration.");
      });
  }

  return (
    <div className="card shadow-sm p-4 mb-5">
      <h2 className="mb-3">React Finalization Panel</h2>
      <p className="mb-3">
        This section reads saved attendee and cart data, builds a JSON payload, and sends it to the Node.js backend.
      </p>

      <div className="row">
        <div className="col-md-6 mb-3">
          <h5>Saved Attendees</h5>
          {attendees.length === 0 ? (
            <p className="text-muted">No attendee data found in localStorage.</p>
          ) : (
            <ul className="list-group">
              {attendees.map((person, index) => (
                <li key={index} className="list-group-item">
                  {person.name || person.full_name || "Unnamed attendee"}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="col-md-6 mb-3">
          <h5>Saved Cart Items</h5>
          {cartItems.length === 0 ? (
            <p className="text-muted">No cart items found in localStorage.</p>
          ) : (
            <ul className="list-group">
              {cartItems.map((item, index) => (
                <li key={index} className="list-group-item">
                  {item.productName || item.name || "Conference Item"}
                  {item.quantity ? ` (Qty: ${item.quantity})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button className="btn btn-success mt-2" onClick={handleReactSubmit}>
        Submit Registration
      </button>

      {message && <div className="alert alert-info mt-3">{message}</div>}

      {jsonPreview && (
        <div className="mt-4">
          <h5>JSON Preview</h5>
          <pre className="bg-light border rounded p-3" style={{ whiteSpace: "pre-wrap" }}>
            {jsonPreview}
          </pre>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<FinalizationApp />, document.getElementById("finalization-root"));
