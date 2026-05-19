import app from '../server/app.js';
import { connectDB } from '../server/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();

    const url = req.url || '/';
    if (url.startsWith('/api')) {
      req.url = url.slice(4) || '/';
    }

    return app(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Server error' });
    }
  }
}
