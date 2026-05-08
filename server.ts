import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mock API for Pokémon cards (for initial setup)
  app.get('/api/cards', (req, res) => {
    res.json([
      { id: '1', name: 'Charizard GX', price: 150, stock: 5, rarity: 'Super Rare' },
      { id: '2', name: 'Pikachu VMAX', price: 80, stock: 12, rarity: 'Ultra Rare' },
      { id: '3', name: 'Mewtwo EX', price: 120, stock: 3, rarity: 'Secret Rare' },
    ]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sasori Pokémon Server running on http://localhost:${PORT}`);
  });
}

startServer();
