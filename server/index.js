import 'dotenv/config';
import app from './app.js';
import { connectDB } from './db.js';

const PORT = Number(process.env.PORT) || 5000;

async function main() {
  await connectDB();
  console.log('Connected to MongoDB');

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
