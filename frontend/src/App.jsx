import { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch(import.meta.env.VITE_API_BASE + "/hello")
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => setMessage("Error: " + err));
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "20%" }}>
      <h1>React + Go Lambda</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;

