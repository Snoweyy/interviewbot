import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 40 }}>
      <h1>AI Interview Bot</h1>
      <button onClick={() => navigate("/interview")}>
        Start Interview
      </button>
    </div>
  );
}
