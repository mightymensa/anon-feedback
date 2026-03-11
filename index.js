const express = require('express');
const crypto = require('crypto');
const path = require('path');

var redis;
const {createClient}  = require('redis');

(async function initRedis() {
    
    redis = await createClient({ url: process.env.REDIS_URL }).connect();
})();

const app = express();
const PORT = 3000;

// session expiry (24 hours)
const SESSION_TTL = 60 * 60 * 24;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(express.static(path.join(__dirname, 'public')));

function createId() {
  return crypto.randomUUID();
}

function sessionKey(id) {
  return `session:${id}`;
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
app.post('/create', async (req, res) => {

  const sessionId = createId();
  const hostToken = createId();

  const session = {
    messages: [],
    hostToken
  };
// await redis.set('key', 'value');
  await redis.set(sessionKey(sessionId), JSON.stringify(session));

  res.redirect(`/host/${sessionId}?token=${hostToken}`);
});

/**
 * Host view
 */
app.get('/host/:id', async (req, res) => {

  const { id } = req.params;
  const { token } = req.query;

  const session = await redis.get(sessionKey(id));
  const parsedSession = JSON.parse(session);

  if (!session) return res.status(404).send('Invalid session');

  if (token !== parsedSession.hostToken) {
    return res.status(403).send('Unauthorized');
  }

  let messages = parsedSession.messages
    .map(m => `<li class="message-card">
      <span class="message-text">${m}</span>
      <button onclick="copyMessage(this)">Copy</button>
    </li>`)
    .join('');

  if (!messages) {
    messages = '<li style="list-style:none;color:#888;font-size:14px;text-align:left">No messages yet</li>';
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Host View</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      display: flex;
      justify-content: space-between;
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

setTimeout(()=>location.reload(),2000)

function copyMessage(button){

const text = button
.closest('.message-card')
.querySelector('.message-text')
.innerText

navigator.clipboard.writeText(text)

button.innerText='Copied'

setTimeout(()=>button.innerText='Copy',1500)

}

</script>

</body>
</html>
`);
});

/**
 * Guest chat page
 */
app.get('/chat/:id', async (req, res) => {

  const { id } = req.params;

  const session = await redis.get(sessionKey(id));

  if (!session) return res.send('Invalid session');

  res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

/**
 * Receive guest message
 */
app.post('/chat/:id', async (req, res) => {

  const { id } = req.params;
  const { message } = req.body;

  const session = await redis.get(sessionKey(id));

  if (session && message) {
    const parsedSession = JSON.parse(session);
    parsedSession.messages.push(message);

    await redis.set(sessionKey(id), JSON.stringify(parsedSession));

  }

  res.redirect(`/chat/${id}`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});