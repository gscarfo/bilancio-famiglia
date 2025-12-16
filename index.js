const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rotte API
app.get('/api/movements', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM movements ORDER BY date DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Errore DB' });
  }
});

app.post('/api/movements', async (req, res) => {
  const { type, category, amount, date, note } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO movements (type, category, amount, date, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, category, parseFloat(amount), date, note]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Errore inserimento' });
  }
});

app.delete('/api/movements/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM movements WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: 'Errore eliminazione' });
  }
});

app.get('/api/movements/balance', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'entrata' THEN amount ELSE 0 END), 0) AS entrate,
        COALESCE(SUM(CASE WHEN type = 'uscita' THEN amount ELSE 0 END), 0) AS uscite
      FROM movements
    `);
    const { entrate, uscite } = r.rows[0];
    res.json({ balance: entrate - uscite });
  } catch (e) {
    res.status(500).json({ error: 'Errore saldo' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ App in ascolto su porta ${PORT}`);
});
