const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

// In-memory storage
const sessions = {};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Helper
function createId() {
  return crypto.randomUUID();
}

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

// Create session
app.post('/create', (req, res) => {
  const sessionId = createId();
  sessions[sessionId] = [];
  res.redirect(`/host/${sessionId}`);
});

// Host view
app.get('/host/:id', (req, res) => {
  const { id } = req.params;
  if (!sessions[id]) return res.send('Invalid session');

  const messages = sessions[id]
    .map(m => `<li>${m}</li>`)
    .join('');

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Host View</title>
      <link rel="stylesheet" href="/style.css">
        <style>
    body {
  font-family: system-ui, Arial, sans-serif;
  background: #f4f6f8;
  margin: 0;
  padding: 40px;
}

.container {
  max-width: 500px;
  margin: auto;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}

h2, h3 {
  margin-top: 0;
}

input {
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  background: #2563eb;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

button:hover {
  background: #1e40af;
}

ul {
  padding-left: 18px;
}

pre {
  background: #f1f5f9;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

  </style>
    </head>
    <body>
      <div class="container">
        <h2>Host View</h2>
        <p>Share this link:</p>
        <pre>https://anon-feedback-pink.vercel.app/chat/${id}</pre>
        
        <h3>Messages</h3>
        <ul>${messages}</ul>
        </div>
        
        <script>
        setTimeout(() => location.reload(), 2000);
        </script>
        </body>
        </html>
        `);
      });
      // <pre>http://localhost:${PORT}/chat/${id}</pre>

// Guest chat
app.get('/chat/:id', (req, res) => {
  const { id } = req.params;
  if (!sessions[id]) return res.send('Invalid session');

  res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

// Receive message
app.post('/chat/:id', (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (sessions[id] && message) {
    sessions[id].push(message);
  }

  res.redirect(`/chat/${id}`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
