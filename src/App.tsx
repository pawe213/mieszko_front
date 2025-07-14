// frontend/src/App.tsx
import { useEffect, useState } from "react";

function App() {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    fetch("https://calendar-api-799156456450.europe-west1.run.app/slots")
      .then(res => res.json())
      .then(data => setSlots(data));
  }, []);

  const book = () => {
    fetch("https://calendar-api-799156456450.europe-west1.run.app/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2025-07-14" })
    }).then(() => alert("Booked!"));
  };

  return (
    <div>
      <h1>Book a Slot</h1>
      <button onClick={book}>Book 14 July</button>
    </div>
  );
}

export default App;
