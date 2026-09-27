// Toast & Speech Writer - share a few memories, and an AI on YOUR machine (QVAC) writes a toast or short speech.
// Then practice it with the built-in teleprompter. Open http://localhost:3077 after starting.

import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The QVAC worker can be slow to start on some computers. Wait up to 3 minutes for it.
process.env.QVAC_RPC_INIT_TIMEOUT_MS ??= "180000";
const { loadModel, completion, LLAMA_3_2_1B_INST_Q4_0 } = await import("@qvac/sdk");

const PORT = 3077;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- Step 1: load the AI model (downloads the first time, then it's cached) ----
let modelId = null;
const status = { ready: false, message: "Starting...", percent: null, error: null };
async function startModel() {
  try {
    status.message = "Loading the AI model (first run downloads it)...";
    modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: "llm",
      onProgress: (p) => { const v = typeof p === "number" ? p : p?.percentage; if (typeof v === "number") status.percent = Math.round(v); },
    });
    status.ready = true; status.message = "AI speech writer ready";
    console.log("Model loaded. Open http://localhost:" + PORT);
  } catch (err) { status.error = String(err?.message || err); console.error("Could not load model:", err); }
}

// One AI job at a time
let chain = Promise.resolve();
const enqueue = (job) => { const p = chain.then(job); chain = p.catch(() => {}); return p; };

function readBody(req, limit = 10000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > limit) { reject(new Error("Too big")); req.destroy(); } });
    req.on("end", () => resolve(data)); req.on("error", reject);
  });
}
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
const clean = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

const TONES = { heartfelt: "heartfelt and warm", funny: "light and funny (kind humor, never embarrassing)", mix: "a mix of funny and heartfelt" };
const prompt = (tone, words) => `You write short, natural speeches and toasts that are easy to say out loud. Tone: ${TONES[tone]}.
Length: about ${words} words. Use short sentences. Use the speaker's own memories and details: never invent stories, names or facts.
Structure: a warm opening, one or two of the memories, what the person means to the speaker, and a closing line (end a toast with raising a glass).
Reply with the speech only, no title.`;

// ---- Step 2: the web server ----
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(await readFile(path.join(__dirname, "public", "index.html")));
    }
    if (req.method === "GET" && req.url === "/api/status") return json(res, 200, status);
    if (req.method === "POST" && req.url === "/api/speech") {
      if (!status.ready) { res.writeHead(503); return res.end("The AI speech writer is not ready yet."); }
      const b = JSON.parse(await readBody(req, 20000));
      const occasion = clean(b.occasion, 60) || "celebration", who = clean(b.who, 60), relation = clean(b.relation, 60), memories = String(b.memories || "").trim().slice(0, 1500), speaker = clean(b.speaker, 60);
      const tone = TONES[b.tone] ? b.tone : "mix", minutes = Math.max(1, Math.min(5, parseInt(b.minutes, 10) || 2));
      if (!who || memories.length < 10) { res.writeHead(400); return res.end("Add who it's for and at least one memory."); }
      const ask = `Occasion: ${occasion}.\nThe speech is for: ${who}.` + (relation ? `\nThe speaker is their: ${relation}.` : "") + (speaker ? `\nSpeaker's name: ${speaker}.` : "") + `\nMemories and details from the speaker (use these):\n"""\n${memories}\n"""`;
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      await enqueue(async () => {
        // This is the QVAC call that runs the AI on-device
        const run = completion({ modelId, stream: true, history: [{ role: "system", content: prompt(tone, minutes * 130) }, { role: "user", content: ask }] });
        for await (const token of run.tokenStream) res.write(token);
      });
      return res.end();
    }
    res.writeHead(404); res.end("Not found");
  } catch (err) { console.error(err); if (!res.headersSent) res.writeHead(500); res.end(""); }
});

// "127.0.0.1" means only YOUR computer can reach this app
server.listen(PORT, "127.0.0.1", () => console.log("Server running at http://localhost:" + PORT));
startModel();
