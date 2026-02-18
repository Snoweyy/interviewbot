import dotenv from "dotenv";
import readline from "readline";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Missing GOOGLE_API_KEY. Add it to .env. See README.md.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, (ans) => res(ans.trim())));

const roles = {
  "Web Development Intern": [
    "Explain the difference between var, let, and const in JavaScript.",
    "How does CSS Flexbox differ from CSS Grid for layout?",
    "What are REST APIs and how would you consume one in a frontend app?",
    "Describe how you would debug a performance issue in a React app.",
    "Explain promises and async/await with a real example."
  ],
  "Data Analyst Intern": [
    "How do you handle missing data in a dataset?",
    "Explain the difference between correlation and causation.",
    "What is normalization in SQL and why is it useful?",
    "Describe a time-series analysis approach for forecasting.",
    "How would you validate the results of an A/B test?"
  ],
  "HR Intern": [
    "How would you design a fair internship selection process?",
    "What steps ensure a great candidate experience?",
    "How do you handle conflicting feedback from interviewers?",
    "Describe an effective onboarding plan for interns.",
    "What metrics would you track to improve hiring quality?"
  ]
};

const evalPrompt = ({ role, question, answer }) => `You are an Internshala interview evaluator.
Role: ${role}
Question: ${question}
Candidate answer: ${answer}
Evaluate strictly and return JSON only with keys: score (0-10 integer), feedback (2 sentences), improvement (1 sentence).
JSON only, no markdown, no code fences.`;

const summaryPrompt = ({ role, name, avg, details }) => `You are a concise interview summarizer for Internshala.
Role: ${role}
Candidate: ${name}
Average score: ${avg.toFixed(1)}
Per-question details: ${details.map((d, i) => `Q${i + 1}:${d.score}`).join(", ")}
Return a short final verdict (hire/review/reject) with one actionable suggestion.`;

const safeJson = (text) => {
  try {
    const trimmed = text.trim();
    const match = trimmed.match(/\{[\s\S]*\}/);
    const blob = match ? match[0] : trimmed;
    return JSON.parse(blob);
  } catch {
    return null;
  }
};

async function main() {
  const name = await ask("Your name: ");
  console.log("Select role:");
  const roleNames = Object.keys(roles);
  roleNames.forEach((r, i) => console.log(`${i + 1}. ${r}`));
  const idx = parseInt(await ask("Enter choice number: "), 10) - 1;
  const role = roleNames[idx] || roleNames[0];
  const qs = roles[role];

  console.log(`\nStarting mock interview for ${name} — ${role}.\n`);
  const results = [];

  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    console.log(`Q${i + 1}: ${q}`);
    const ans = await ask("Your answer: ");
    const r = await model.generateContent(evalPrompt({ role, question: q, answer: ans }));
    const text = r.response.text();
    const json = safeJson(text) || { score: 5, feedback: "Response noted.", improvement: "Add specifics." };
    console.log(`Score: ${json.score}`);
    console.log(`Feedback: ${json.feedback}`);
    console.log(`Improvement: ${json.improvement}\n`);
    results.push({ question: q, score: Number(json.score) || 0 });
  }

  const avg = results.reduce((s, r) => s + r.score, 0) / results.length;
  const sr = await model.generateContent(summaryPrompt({ role, name, avg, details: results }));
  console.log(`Final verdict: ${sr.response.text()}`);
  console.log(`\nAverage score: ${avg.toFixed(1)} / 10`);
  rl.close();
}

main();
