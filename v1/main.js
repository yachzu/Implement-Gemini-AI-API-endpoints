import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
// const PORT = 3000;

// ===== MIDDLEWARE =====
const allowedOrigins = process.env.FRONTEND_URL
  ?.split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // allow server-to-server / curl
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"]
}));

app.use(express.json());

// ===== INIT =====
const upload = multer();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-2.5-flash";

// ===== ROUTES =====
app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: "Prompt is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

    res.json({ result: response.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  const { prompt } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "Image is required" });
  }

  const base64Image = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt ?? "Jelaskan gambar ini", type: "text" },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
      ],
    });

    res.json({ result: response.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/generate-from-document", upload.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Document is required" });
  }

  const base64Document = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: "Buat ringkasan dari dokumen berikut.", type: "text" },
        { inlineData: { data: base64Document, mimeType: req.file.mimetype } }
      ],
    });

    res.json({ result: response.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Audio is required" });
  }

  const base64Audio = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: "Buat transkrip dari rekaman tersebut.", type: "text" },
        { inlineData: { data: base64Audio, mimeType: req.file.mimetype } }
      ],
    });

    res.json({ result: response.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ===== GENERATE WITH RETRY =====
async function generateWithRetry(prompt, retries = 3) {
  try {
    return await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
  } catch (e) {
    if (retries === 0) throw e;
    await new Promise(r => setTimeout(r, 1000));
    return generateWithRetry(prompt, retries - 1);
  }
}

app.get('/', (req, res) => {
  res.json({ status: "ok" });
});



//  ===== START SERVER =====
// app.listen(PORT, () => {
//   console.log(`Server berjalan pada port ${PORT}`);
// });


export default app;