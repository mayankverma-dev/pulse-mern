import { useState, useEffect } from "react";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");

  const fetchTasks = async () => {
    const res = await fetch("/api/tasks");
    const json = await res.json();
    setTasks(json.data || []);
    setSource(json.source || "");
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    fetchTasks();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "2rem auto",
        fontFamily: "sans-serif",
      }}
    >
      <h1>PulseMERN DevOps Sandbox</h1>
      <p>
        Last read served from: <strong>{source}</strong>
      </p>
      <form onSubmit={addTask}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New deployment task..."
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {tasks.map((t) => (
          <li key={t._id}>{t.title}</li>
        ))}
      </ul>
    </main>
  );
}
