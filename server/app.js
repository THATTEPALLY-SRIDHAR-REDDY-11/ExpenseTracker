import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Expense } from './models/Expense.js';
import {
  extractExpenseFromImage,
  generateSpendingInsights,
  safeUnlinkUpload,
} from './services/gemini.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg';
    if (ok) cb(null, true);
    else cb(new Error('Only JPG, JPEG, and PNG images are allowed'));
  },
});

function uploadSingle(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    next();
  });
}

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
  })
);
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/insights', async (_req, res) => {
  try {
    const expenses = await Expense.find().lean();
    const result = await generateSpendingInsights(expenses);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate insights' });
  }
});

app.get('/expenses', async (_req, res) => {
  try {
    const list = await Expense.find().sort({ date: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.post('/upload', uploadSingle, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided (field name: image)' });
  }

  const mimeType = req.file.mimetype;
  const imageBuffer = req.file.buffer;

  try {
    const extracted = await extractExpenseFromImage(imageBuffer, mimeType);
    const imageDataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

    const doc = await Expense.create({
      image: imageDataUrl,
      shopName: extracted.shopName,
      amount: extracted.amount,
      date: extracted.date,
      category: extracted.category,
      summary: extracted.summary,
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to analyze or save expense' });
  }
});

app.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    safeUnlinkUpload(deleted.image);
    res.json({ ok: true, id: deleted._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default app;
