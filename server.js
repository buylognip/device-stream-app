const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const AUTH_FILE = path.join(__dirname, 'authorized_devices.json');

let requirePairingCode = false;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

let authorizedDevices = {};

function loadAuthorizedDevices() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      authorizedDevices = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading authorized devices:', err);
  }
}

function saveAuthorizedDevices() {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(authorizedDevices, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving authorized devices:', err);
  }
}

loadAuthorizedDevices();

const connectedPhones = new Map();
const connectedPCs = new Set();
const pendingPairings = new Map();

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.get('/api/info', (req, res) => {
  res.json({
    localIP: getLocalIP(),
    port: PORT,
    requirePairingCode
  });
});

app.post('/api/toggle-auto-approve', (req, res) => {
  if (typeof req.body.requirePairingCode === 'boolean') {
    requirePairingCode = req.body.requirePairingCode;
  } else {
    requirePairingCode = !requirePairingCode;
  }
  broadcastToPCs({
    type: 'setting_updated',
    requirePairingCode
  });
  res.json({ success: true, requirePairingCode });
});

app.get('/api/devices', (req, res) => {
  const deviceList = Object.values(authorizedDevices).map(dev => ({
    deviceId: dev.deviceId,
    deviceName: dev.deviceName,
    isOnline: connectedPhones.has(dev.deviceId) && connectedPhones.get(dev.deviceId).authenticated
  }));
  res.json(deviceList);
});

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>DeviceStream Pro Server Running</h1><p><a href="/phone.html">Phone Connect Link</a></p>');
  }
});

app.get('/phone.html', (req, res) => {
  const phonePath = path.join(__dirname, 'public', 'phone.html');
  if (fs.existsSync(phonePath)) {
    res.sendFile(phonePath);
  } else {
    res.send('<h1>DeviceStream Mobile Streamer</h1>');
  }
});

wss.on('connection', (ws) => {
  let clientRole = null;
  let clientDeviceId = null;

  ws.on('message', (message) => {
    try {
      if (Buffer.isBuffer(message)) {
        if (clientRole === 'phone' && clientDeviceId) {
          broadcastToPCsBinary(clientDeviceId, message);
        }
        return;
      }

      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'register_pc':
          clientRole = 'pc';
          connectedPCs.add(ws);
          ws.send(JSON.stringify({
            type: 'pc_registered',
            localIP: getLocalIP(),
            requirePairingCode,
            authorizedDevices: Object.values(authorizedDevices).map(dev => ({
              ...dev,
              isOnline: connectedPhones.has(dev.deviceId) && connectedPhones.get(dev.deviceId).authenticated
            }))
          }));
          break;

        case 'phone_connect': {
          clientRole = 'phone';
          clientDeviceId = data.deviceId;
          const deviceName = data.deviceName || 'Mobile Device';
          const providedToken = data.token;
          const isAlreadyAuthorized = providedToken && authorizedDevices[clientDeviceId] && authorizedDevices[clientDeviceId].token === providedToken;

          if (isAlreadyAuthorized || !requirePairingCode) {
            let token = providedToken || ('tok_' + crypto.randomBytes(16).toString('hex'));
            authorizedDevices[clientDeviceId] = {
              deviceId: clientDeviceId,
              deviceName,
              token,
              authorizedAt: new Date().toISOString()
            };
            saveAuthorizedDevices();
            connectedPhones.set(clientDeviceId, { ws, info: { deviceId: clientDeviceId, deviceName }, authenticated: true });

            ws.send(JSON.stringify({
              type: 'auth_success',
              deviceId: clientDeviceId,
              token
            }));

            broadcastToPCs({
              type: 'device_status_change',
              deviceId: clientDeviceId,
              deviceName,
              status: 'online'
            });
          } else {
            const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
            pendingPairings.set(pairingCode, {
              deviceId: clientDeviceId,
              deviceName,
              phoneWs: ws,
              expiresAt: Date.now() + 300000
            });
            connectedPhones.set(clientDeviceId, { ws, info: { deviceId: clientDeviceId, deviceName }, authenticated: false });

            ws.send(JSON.stringify({
              type: 'pairing_required',
              pairingCode
            }));

            broadcastToPCs({
              type: 'pairing_request_received',
              deviceId: clientDeviceId,
              deviceName,
              pairingCode
            });
          }
          break;
        }

        case 'approve_pairing': {
          const { pairingCode, deviceId } = data;
          let pending = null;

          if (pairingCode && pendingPairings.has(pairingCode)) {
            pending = pendingPairings.get(pairingCode);
            pendingPairings.delete(pairingCode);
          }

          if (pending && pending.expiresAt > Date.now()) {
            const token = 'tok_' + crypto.randomBytes(16).toString('hex');
            authorizedDevices[pending.deviceId] = {
              deviceId: pending.deviceId,
              deviceName: pending.deviceName,
              token,
              authorizedAt: new Date().toISOString()
            };
            saveAuthorizedDevices();

            if (connectedPhones.has(pending.deviceId)) {
              connectedPhones.get(pending.deviceId).authenticated = true;
            }

            pending.phoneWs.send(JSON.stringify({
              type: 'auth_success',
              deviceId: pending.deviceId,
              token
            }));

            broadcastToPCs({
              type: 'device_status_change',
              deviceId: pending.deviceId,
              deviceName: pending.deviceName,
              status: 'online'
            });
          }
          break;
        }

        case 'remote_input':
        case 'remote_key':
        case 'remote_button':
        case 'remote_clipboard':
        case 'change_quality': {
          const targetDeviceId = data.targetDeviceId || data.deviceId;
          if (connectedPhones.has(targetDeviceId)) {
            const phoneEntry = connectedPhones.get(targetDeviceId);
            if (phoneEntry.ws && phoneEntry.ws.readyState === WebSocket.OPEN) {
              phoneEntry.ws.send(JSON.stringify(data));
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    if (clientRole === 'pc') {
      connectedPCs.delete(ws);
    } else if (clientRole === 'phone' && clientDeviceId) {
      connectedPhones.delete(clientDeviceId);
      broadcastToPCs({
        type: 'device_status_change',
        deviceId: clientDeviceId,
        status: 'offline'
      });
    }
  });
});

function broadcastToPCs(payload) {
  const msg = JSON.stringify(payload);
  for (const pcWs of connectedPCs) {
    if (pcWs.readyState === WebSocket.OPEN) {
      pcWs.send(msg);
    }
  }
}

function broadcastToPCsBinary(deviceId, binaryData) {
  for (const pcWs of connectedPCs) {
    if (pcWs.readyState === WebSocket.OPEN) {
      pcWs.send(binaryData);
    }
  }
}

server.listen(PORT, () => {
  console.log('---------------------------------------------------------');
  console.log('🚀 DEVICESTREAM PRO v2.0 SERVER STARTED SUCCESSFULLY');
  console.log('🌐 Server listening on PORT:', PORT);
  console.log('---------------------------------------------------------');
});
