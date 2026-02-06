const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

// sessionId -> { messages: [], hostToken }
const sessions = {};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Helper
function createId() {
  return crypto.randomUUID();
}

/**
 * Home page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

/**
 * Create new session
 */
app.post('/create', (req, res) => {
  const sessionId = createId();
  const hostToken = createId();

  sessions[sessionId] = {
    messages: [],
    hostToken
  };

  // Host token is private — only creator gets it
  res.redirect(`/host/${sessionId}?token=${hostToken}`);
});

/**
 * Host view (PROTECTED)
 */
app.get('/host/:id', (req, res) => {
  const { id } = req.params;
  const { token } = req.query;

  const session = sessions[id];
  if (!session) return res.status(404).send('Invalid session');

  if (token !== session.hostToken) {
    return res.status(403).send('Unauthorized');
  }

  const messages = session.messages
    .map(m => `<li class="message-card">${m}</li>`)
    .join('');

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Host View</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/style.css">
  <style>
    body {
      font-family: system-ui, Arial, sans-serif;
      background: #f4f6f8;
      padding: 40px;
      margin: 0;
    }
    .container {
      max-width: 720px;
      margin: auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      text-align: center;
    }
    .message-card {
      background: white;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 12px;
      list-style: none;
      text-align: left;
    }
    button {
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      background: #2563eb;
      color: white;
      cursor: pointer;
    }
    button:hover {
      background: #1e40af;
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
  <pre id="shareLink">https://anon-feedback-pink.vercel.app/chat/${id}</pre>
  <button onclick="copyLink()">Copy link</button>
</div>

<div class="container" style="margin-top:30px">
  <h3>Messages</h3>
  <ul>${messages}</ul>
</div>

<script>
  function copyLink() {
    navigator.clipboard.writeText(
      document.getElementById('shareLink').innerText
    ).then(() => alert('Link copied'));
  }

  // Auto-refresh every 2s
  setTimeout(() => location.reload(), 2000);
</script>

</body>
</html>
  `);
});

/**
 * Guest chat page
 */
app.get('/chat/:id', (req, res) => {
  const { id } = req.params;
  if (!sessions[id]) return res.send('Invalid session');

  res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

/**
 * Receive guest message
 */
app.post('/chat/:id', (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (sessions[id] && message) {
    sessions[id].messages.push(message);
  }

  res.redirect(`/chat/${id}`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
