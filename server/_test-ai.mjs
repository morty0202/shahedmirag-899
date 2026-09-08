// Quick end-to-end test: OpenRouter AI integration.
const base = "http://localhost:3001";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "amir", password: "Amir1404@" }),
}).then((r) => r.json());
const token = login.token || login.data?.token;
console.log("login ok:", !!token);

const st = await fetch(`${base}/api/assistant/status`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
console.log("status:", JSON.stringify(st.data));

const chat = await fetch(`${base}/api/assistant/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    message: "قانون دوم نیوتن را در دو جمله توضیح بده",
    history: [],
  }),
}).then((r) => r.json());

console.log("chat ok:", chat.ok, "| source:", chat.data?.source, "| model:", chat.data?.model);
console.log("reply:", (chat.data?.reply || "").slice(0, 400));
