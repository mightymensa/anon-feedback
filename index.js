const express = require('express');
const crypto = require('crypto');
const path = require('path');

import { createClient } from 'redis';
(async function initRedis() {
    
    const redis = await createClient({ url: process.env.REDIS_URL }).connect();
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
  await redis.set(sessionKey(sessionId), session);

  res.redirect(`/host/${sessionId}?token=${hostToken}`);
});

/**
 * Host view
 */
app.get('/host/:id', async (req, res) => {

  const { id } = req.params;
  const { token } = req.query;

  const session = await redis.get(sessionKey(id));

  if (!session) return res.status(404).send('Invalid session');

  if (token !== session.hostToken) {
    return res.status(403).send('Unauthorized');
  }

  let messages = session.messages
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
<link rel="stylesheet" href="/style.css">
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

function copyLink(){
navigator.clipboard.writeText(
document.getElementById('shareLink').innerText
)
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

    session.messages.push(message);

    await redis.set(sessionKey(id), session);

  }

  res.redirect(`/chat/${id}`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});