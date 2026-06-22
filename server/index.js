const express = require('express');
const cors = require('cors');
const path = require('path');
const postsRouter = require('./routes/posts');

require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api', postsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DRCR2 server running on port ${PORT}`);
});
