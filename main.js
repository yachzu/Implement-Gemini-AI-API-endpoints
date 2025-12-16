import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();

/* =========================
   CONFIG
========================= */
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_BODY_SIZE = "4mb";

/* =========================
   INIT
========================= */
const upload = multer({ limits: { fileSize: 4 * 1024 * 1024 } });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/* =========================
   MIDDLEWARE
========================= */
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // allow curl / server-to-server
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST"],
}));

app.use(express.json({ limit: MAX_BODY_SIZE }));
app.use(express.urlencoded({ extended: true, limit: MAX_BODY_SIZE }));

/* =========================
   HELPERS
========================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function generateContent({ contents, retries = 3 }) {
  try {
    return await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents
    });
  } catch (err) {
    if (retries === 0) throw err;

    // retry only on overload
    if (err.message?.includes("503")) {
      await sleep(1000);
      return generateContent({ contents, retries: retries - 1 });
    }

    throw err;
  }
}

function asyncHandler(fn) {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

/* =========================
   ROUTES
========================= */
app.get('/', (_, res) => {
  res.json({ status: "ok" });
});

app.post(
  '/generate-text',
  asyncHandler(async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const response = await generateContent({ contents: prompt });
    res.json({ result: response.text });
  })
);

app.post(
  '/generate-from-image',
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const contents = [
      { text: req.body.prompt || "Jelaskan gambar ini", type: "text" },
      {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      }
    ];

    const response = await generateContent({ contents });
    res.json({ result: response.text });
  })
);

app.post(
  '/generate-from-document',
  upload.single("document"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Document is required" });
    }

    const contents = [
      { text: "Buat ringkasan dari dokumen berikut.", type: "text" },
      {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      }
    ];

    const response = await generateContent({ contents });
    res.json({ result: response.text });
  })
);

app.post(
  '/generate-from-audio',
  upload.single("audio"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Audio is required" });
    }

    const contents = [
      { text: "Buat transkrip dari rekaman tersebut.", type: "text" },
      {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      }
    ];

    const response = await generateContent({ contents });
    res.json({ result: response.text });
  })
);

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error(err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: err.message });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File too large" });
  }

  res.status(500).json({ message: err.message || "Internal Server Error" });
});

export default app;
