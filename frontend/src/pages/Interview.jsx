import { useEffect, useRef, useState } from "react";
import api from "../api/api";
import Editor from "@monaco-editor/react";

export default function Interview() {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [code, setCode] = useState("");

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);

  useEffect(() => {
    startInterview();
  }, []);

  const startInterview = async () => {
    const res = await api.post("/interview/start", {
      user_id: "react_user",
    });

    setSessionId(res.data.session_id);
    setQuestion(res.data.question);
    startRecording();
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    videoRef.current.srcObject = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recordedChunks.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };

    recorder.start();
  };

  const stopAndUploadVideo = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunks.current, {
          type: "video/webm",
        });

        const formData = new FormData();
        formData.append("session_id", sessionId);
        formData.append("video", blob);

        await api.post("/record/upload", formData);
        resolve();
      };

      mediaRecorderRef.current.stop();
      videoRef.current?.srcObject
        ?.getTracks()
        .forEach((t) => t.stop());
    });
  };

  const submitText = async () => {
    console.log("Submitting text answer");

    await stopAndUploadVideo();

    const res = await api.post("/interview/answer/text", {
      session_id: sessionId,
      answer: answer,
    });

    if (res.data.next_question) {
      setQuestion(res.data.next_question);
      setAnswer("");
      startRecording();
    } else {
      alert("Interview Finished");
    }
  };

  const submitCode = async () => {
    console.log("Submitting code");
    console.log(code);

    await stopAndUploadVideo();

    const res = await api.post("/interview/answer/code", {
      session_id: sessionId,
      code: code,
    });

    console.log("Backend response:", res.data);
    alert("Interview Finished");
  };

  if (!question) return <p>Loading...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h2>{question.question}</h2>

      <video
        ref={videoRef}
        autoPlay
        muted
        width="400"
        style={{ border: "1px solid black" }}
      />

      {question.type === "text" && (
        <>
          <textarea
            rows={4}
            cols={50}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <br />
          <button onClick={submitText}>Submit</button>
        </>
      )}

      {question.type === "code" && (
        <>
          <Editor
            height="300px"
            language="python"
            value={code}
            onChange={(value) => setCode(value || "")}
            theme="vs-dark"
          />
          <br />
          <button type="button" onClick={submitCode}>
            Submit Code
          </button>
        </>
      )}
    </div>
  );
}
