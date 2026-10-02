const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const SESSIONS_DIR = path.join(__dirname, 'wa_sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// In-memory sessions store
const sessions = new Map();

async function initSession(sessionId, label = '', phoneNumberForPairing = null) {
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId);
    if (existing.status === 'CONNECTED') {
      return existing;
    }
  }

  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sessionData = {
    id: sessionId,
    label: label || `SIM Instance ${sessions.size + 1}`,
    status: 'INITIALIZING',
    qrCode: null,
    pairingCode: null,
    userPhone: null,
    sentCount: 0,
    sock: null,
  };
  sessions.set(sessionId, sessionData);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    syncFullHistory: false,
  });

  sessionData.sock = sock;

  // Request 8-digit Pairing Code if requested
  if (!sock.authState.creds.registered && phoneNumberForPairing) {
    setTimeout(async () => {
      try {
        let clean = phoneNumberForPairing.replace(/[^0-9]/g, '');
        if (clean.length === 10 && ['9', '8', '7', '6'].includes(clean[0])) {
          clean = '91' + clean;
        }
        const code = await sock.requestPairingCode(clean);
        sessionData.pairingCode = code;
        sessionData.status = 'ENTER_CODE';
        console.log(`[${sessionId}] 📲 Pairing Code generated: ${code}`);
      } catch (pairErr) {
        console.error(`[${sessionId}] Error requesting pairing code:`, pairErr);
      }
    }, 2500);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Only set QR code if not using pairing code
    if (qr && !phoneNumberForPairing) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { width: 300 });
        sessionData.qrCode = qrDataUrl;
        sessionData.status = 'SCAN_QR';
        console.log(`[${sessionId}] New QR Code generated.`);
      } catch (err) {
        console.error('Error generating QR', err);
      }
    }

    if (connection === 'open') {
      sessionData.status = 'CONNECTED';
      sessionData.qrCode = null;
      sessionData.pairingCode = null;
      const userJid = sock.user?.id || '';
      sessionData.userPhone = userJid.split(':')[0] || userJid.split('@')[0];
      console.log(`[${sessionId}] ✅ Connected successfully! Phone: +${sessionData.userPhone}`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[${sessionId}] Connection closed. StatusCode: ${statusCode}. Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        sessionData.status = 'RECONNECTING';
        setTimeout(() => initSession(sessionId, sessionData.label), 3000);
      } else {
        sessionData.status = 'DISCONNECTED';
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch (e) {}
        sessions.delete(sessionId);
      }
    }
  });

  return sessionData;
}

// Automatically restore saved sessions from disk on startup
async function restoreSavedSessions() {
  try {
    const folders = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
    for (const folder of folders) {
      if (folder.isDirectory()) {
        console.log(`Restoring session from folder: ${folder.name}`);
        await initSession(folder.name, `SIM (${folder.name})`);
      }
    }
  } catch (err) {
    console.error('Error restoring sessions:', err);
  }
}

// Format phone for Baileys JID (e.g. 918875216646@s.whatsapp.net)
function formatToJid(phone) {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10 && ['9', '8', '7', '6'].includes(clean[0])) {
    clean = '91' + clean;
  }
  return clean + '@s.whatsapp.net';
}

// Convert base64 dataUrl to Buffer
function dataUrlToBuffer(dataUrl) {
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return Buffer.from(matches[2], 'base64');
  }
  return Buffer.from(dataUrl, 'base64');
}

// --- API ROUTES ---

// List all active sessions
app.get('/api/sessions', (req, res) => {
  const list = [];
  for (const [id, sess] of sessions.entries()) {
    list.push({
      id: sess.id,
      label: sess.label,
      status: sess.status,
      userPhone: sess.userPhone,
      qrCode: sess.qrCode,
      pairingCode: sess.pairingCode,
      sentCount: sess.sentCount,
    });
  }
  res.json({ success: true, sessions: list });
});

// Create session using QR Code
app.post('/api/sessions/create', async (req, res) => {
  try {
    const { sessionId, label } = req.body;
    const finalId = (sessionId || `sim_${Date.now()}`).trim();
    const sess = await initSession(finalId, label);

    let retries = 0;
    while (!sess.qrCode && sess.status === 'INITIALIZING' && retries < 15) {
      await new Promise((r) => setTimeout(r, 200));
      retries++;
    }

    res.json({
      success: true,
      session: {
        id: sess.id,
        label: sess.label,
        status: sess.status,
        userPhone: sess.userPhone,
        qrCode: sess.qrCode,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create session using 8-digit Pairing Code (OTP / Number Linking)
app.post('/api/sessions/create-pairing', async (req, res) => {
  try {
    const { sessionId, label, phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Mobile number is required' });
    }

    const finalId = (sessionId || `sim_${Date.now()}`).trim();
    const sess = await initSession(finalId, label, phoneNumber);

    // Wait for pairing code generation
    let retries = 0;
    while (!sess.pairingCode && retries < 25) {
      await new Promise((r) => setTimeout(r, 250));
      retries++;
    }

    if (sess.pairingCode) {
      res.json({
        success: true,
        sessionId: sess.id,
        pairingCode: sess.pairingCode,
      });
    } else {
      res.json({
        success: false,
        error: 'Pairing code generate hone me time lag raha hai. Kripya dubara try karein.',
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete / Logout session
app.delete('/api/sessions/:id', async (req, res) => {
  const id = req.params.id;
  if (sessions.has(id)) {
    const sess = sessions.get(id);
    try {
      if (sess.sock) {
        sess.sock.end();
      }
    } catch (e) {}
    sessions.delete(id);
    const sessionPath = path.join(SESSIONS_DIR, id);
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    } catch (e) {}
  }
  res.json({ success: true, message: `Session ${id} removed` });
});

// Send Bulk Messages across all connected SIM sessions (Round-Robin)
app.post('/api/sessions/send-bulk', async (req, res) => {
  try {
    const { recipients, message, attachment } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'Recipients list is required.' });
    }

    const connectedSessions = [];
    for (const sess of sessions.values()) {
      if (sess.status === 'CONNECTED' && sess.sock) {
        connectedSessions.push(sess);
      }
    }

    if (connectedSessions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Koi bhi SIM connected nahi hai! Pehle QR ya Pairing Code se kam se kam 1 SIM connect karein.',
      });
    }

    const results = [];

    for (let i = 0; i < recipients.length; i++) {
      const phone = recipients[i];
      const jid = formatToJid(String(phone));

      const assignedSession = connectedSessions[i % connectedSessions.length];

      try {
        let sentMsg;

        if (attachment && attachment.dataUrl) {
          const buffer = dataUrlToBuffer(attachment.dataUrl);

          if (attachment.type === 'image') {
            sentMsg = await assignedSession.sock.sendMessage(jid, {
              image: buffer,
              caption: message || '',
            });
          } else if (attachment.type === 'video') {
            sentMsg = await assignedSession.sock.sendMessage(jid, {
              video: buffer,
              caption: message || '',
            });
          } else if (attachment.type === 'pdf') {
            sentMsg = await assignedSession.sock.sendMessage(jid, {
              document: buffer,
              mimetype: 'application/pdf',
              fileName: attachment.name || 'document.pdf',
              caption: message || '',
            });
          }
        } else {
          sentMsg = await assignedSession.sock.sendMessage(jid, {
            text: message || 'Hello!',
          });
        }

        assignedSession.sentCount++;

        results.push({
          recipient: phone,
          status: 'SUCCESS',
          messageId: sentMsg?.key?.id || `MSG-${Date.now()}`,
          fromSIM: assignedSession.label,
          fromPhone: assignedSession.userPhone || assignedSession.id,
        });
      } catch (sendErr) {
        console.error(`Failed to send to ${phone}`, sendErr);
        results.push({
          recipient: phone,
          status: 'FAILED',
          fromSIM: assignedSession.label,
          error: sendErr.message || 'Delivery error',
        });
      }

      if (i < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    const successCount = results.filter((r) => r.status === 'SUCCESS').length;

    res.json({
      success: true,
      totalRequested: recipients.length,
      successfulCount: successCount,
      simsUsedCount: connectedSessions.length,
      results,
    });
  } catch (err) {
    console.error('Send bulk error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 5001;
app.listen(PORT, async () => {
  console.log(`===================================================`);
  console.log(`🚀 Private WhatsApp Server is running on port ${PORT}`);
  console.log(`===================================================`);
  await restoreSavedSessions();
});
