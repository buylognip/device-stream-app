const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { spawn, execSync, exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

const ADB_PATH = 'C:\\Users\\3\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
function getAdbPath() {
  if (fs.existsSync(ADB_PATH)) return ADB_PATH;
  return 'adb';
}

function getAdbDevices() {
  try {
    const adb = getAdbPath();
    const stdout = execSync(`"${adb}" devices`, { encoding: 'utf8' });
    const lines = stdout.split('\n').filter(l => l.trim() && !l.startsWith('List of devices'));
    return lines.map(l => {
      const [id, status] = l.split(/\s+/);
      return { id, status };
    }).filter(d => d.status === 'device');
  } catch (e) {
    return [];
  }
}

function getDeviceModel(deviceId) {
  try {
    const adb = getAdbPath();
    return execSync(`"${adb}" -s ${deviceId} shell getprop ro.product.model`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'Samsung Galaxy A16';
  }
}

const EMBEDDED_CSS = 
  ":root { --bg-primary: #090d16; --bg-secondary: #131929; --bg-card: rgba(19, 25, 41, 0.85); --accent-color: #6366f1; --accent-glow: rgba(99, 102, 241, 0.4); --success-color: #10b981; --warning-color: #f59e0b; --danger-color: #ef4444; --text-main: #f8fafc; --text-muted: #94a3b8; --border-color: rgba(255, 255, 255, 0.12); --radius-lg: 18px; --radius-md: 12px; --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }" +
  "* { box-sizing: border-box; margin: 0; padding: 0; font-family: var(--font-family); user-select: none; }" +
  "body { background-color: var(--bg-primary); color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }" +
  ".glass-panel { background: var(--bg-card); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); }" +
  "header { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px; background: rgba(9, 13, 22, 0.95); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 100; }" +
  ".brand { display: flex; align-items: center; gap: 12px; }" +
  ".brand-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 0 18px var(--accent-glow); }" +
  ".brand-title { font-size: 1.3rem; font-weight: 800; color: #fff; }" +
  ".connection-pill { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }" +
  ".status-dot { width: 8px; height: 8px; border-radius: 50%; background-color: var(--text-muted); }" +
  ".status-dot.online { background-color: var(--success-color); box-shadow: 0 0 12px var(--success-color); }" +
  ".dashboard-container { display: grid; grid-template-columns: 320px 1fr 340px; gap: 20px; padding: 20px; flex: 1; max-width: 1850px; margin: 0 auto; width: 100%; }" +
  "@media (max-width: 1250px) { .dashboard-container { grid-template-columns: 300px 1fr; } .sidebar-right { display: none; } }" +
  "@media (max-width: 850px) { .dashboard-container { grid-template-columns: 1fr; } }" +
  ".sidebar-panel { display: flex; flex-direction: column; gap: 20px; }" +
  ".panel-section { padding: 22px; }" +
  ".panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }" +
  ".panel-title { font-size: 0.88rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 700; }" +
  ".device-card { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 10px; cursor: pointer; transition: all 0.2s ease; }" +
  ".device-card.active { border-color: var(--accent-color); background: rgba(99, 102, 241, 0.12); box-shadow: 0 0 15px rgba(99, 102, 241, 0.2); }" +
  ".viewport-container { display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; min-height: 580px; padding: 24px; overflow: hidden; }" +
  ".screen-wrapper { position: relative; max-width: 100%; max-height: 78vh; display: flex; align-items: center; justify-content: center; border-radius: 26px; padding: 12px; background: #000; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 25px rgba(99, 102, 241, 0.25); border: 2px solid rgba(255, 255, 255, 0.12); }" +
  ".stream-canvas { max-width: 100%; max-height: 72vh; object-fit: contain; border-radius: 18px; cursor: pointer; background: #090d16; }" +
  ".remote-toolbar { display: flex; gap: 10px; margin-top: 18px; padding: 10px 20px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(14px); border: 1px solid var(--border-color); border-radius: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }" +
  ".tool-btn { background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border-color); color: #fff; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; transition: all 0.2s ease; }" +
  ".tool-btn:hover { background: var(--accent-color); transform: translateY(-2px); box-shadow: 0 4px 14px var(--accent-glow); }" +
  ".btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease; }" +
  ".stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 0.88rem; }" +
  ".stat-label { color: var(--text-muted); }" +
  ".stat-value { font-weight: 600; color: var(--accent-color); }";

const INDEX_HTML = 
  "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>DeviceStream Pro v2.0 - Native Galaxy A16 Mirror</title><style>" + EMBEDDED_CSS + "</style></head><body>" +
  "<header><div class='brand'><div class='brand-icon'>📱</div><div><div class='brand-title'>DeviceStream Pro v2.0</div><div style='font-size: 0.75rem; color: #94a3b8;'>Native ADB Screen Mirroring & Remote Touch Control</div></div></div>" +
  "<div style='display: flex; gap: 12px; align-items: center;'><div class='connection-pill'><span id='server-status-dot' class='status-dot online'></span><span id='server-status-text'>ADB Native Active</span></div></div></header>" +
  "<div class='dashboard-container'><div class='sidebar-panel'><div class='glass-panel panel-section' style='flex: 1;'><div class='panel-header'><span class='panel-title'>Detected ADB Devices</span><button style='background: none; border: none; color: #6366f1; cursor: pointer; font-size: 0.85rem;' onclick='refreshAdbDevices()'>🔄 Refresh</button></div>" +
  "<div id='device-list-container'><div style='text-align: center; color: #94a3b8; padding: 30px 10px; font-size: 0.9rem;'>Scanning ADB...</div></div>" +
  "<div style='margin-top: 20px; padding: 14px; background: rgba(16, 185, 129, 0.08); border-radius: 12px; border: 1px dashed rgba(16, 185, 129, 0.3);'>" +
  "<div style='font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; color: #10b981;'>⚡ Native Hardware ADB Connected</div><div style='font-size: 0.78rem; color: #94a3b8; line-height: 1.4;'>Samsung Galaxy A16 connected via ADB. Direct screen streaming & full touch control unlocked!</div></div></div></div>" +
  "<div class='glass-panel viewport-container'><div id='screen-wrapper' class='screen-wrapper'><canvas id='stream-canvas' class='stream-canvas' tabindex='0'></canvas></div>" +
  "<div id='remote-toolbar' class='remote-toolbar'><button class='tool-btn' title='Back' onclick=\"sendAdbKey('4')\">◀️</button><button class='tool-btn' title='Home' onclick=\"sendAdbKey('3')\">🏠</button><button class='tool-btn' title='Recents' onclick=\"sendAdbKey('187')\">⏹️</button><button class='tool-btn' title='Lock Screen' onclick=\"sendAdbKey('26')\">🔒</button><button class='tool-btn' title='Volume Up' onclick=\"sendAdbKey('24')\">🔊</button><button class='tool-btn' title='Volume Down' onclick=\"sendAdbKey('25')\">🔉</button></div></div>" +
  "<div class='sidebar-panel sidebar-right'><div class='glass-panel panel-section'><div class='panel-header'><span class='panel-title'>Keyboard Typer</span></div><div style='display: flex; flex-direction: column; gap: 10px;'><input type='text' id='clipboard-input' placeholder='Type text to send to phone...' style='width: 100%; padding: 10px 14px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; color: #fff;' onkeypress='handleKeyPress(event)'><button class='btn-primary' style='width: 100%; font-size: 0.85rem;' onclick='sendTextToPhone()'>⚡ Type Text into Phone</button></div></div>" +
  "<div class='glass-panel panel-section'><div class='panel-header'><span class='panel-title'>Live Diagnostics</span></div><div class='stat-row'><span class='stat-label'>Device</span><span class='stat-value' id='diag-device-name'>Samsung Galaxy A16</span></div><div class='stat-row'><span class='stat-label'>Live FPS</span><span class='stat-value' id='diag-fps'>0 FPS</span></div><div class='stat-row'><span class='stat-label'>Mode</span><span class='stat-value' style='color:#10b981;'>Native ADB Direct</span></div><div class='stat-row'><span class='stat-label'>Touch Control</span><span class='stat-value' style='color:#10b981;'>Active (Click/Swipe)</span></div></div></div></div>" +
  "<script>" +
  "let ws = null, frameCounter = 0, lastFpsTime = Date.now(), isMouseDown = false, startX = 0, startY = 0;" +
  "const streamCanvas = document.getElementById('stream-canvas'), ctx = streamCanvas.getContext('2d');" +
  "function initWebSocket() { const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'; ws = new WebSocket(protocol + '//' + window.location.host); ws.binaryType = 'arraybuffer'; ws.onopen = () => { ws.send(JSON.stringify({ type: 'start_adb_stream' })); refreshAdbDevices(); }; ws.onmessage = (event) => { if (event.data instanceof ArrayBuffer) { renderBinaryFrame(event.data); } }; ws.onclose = () => setTimeout(initWebSocket, 2000); }" +
  "function renderBinaryFrame(arrayBuffer) { const blob = new Blob([arrayBuffer], { type: 'image/png' }), img = new Image(), url = URL.createObjectURL(blob); img.onload = () => { streamCanvas.width = img.width; streamCanvas.height = img.height; ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url); frameCounter++; const now = Date.now(); if (now - lastFpsTime >= 1000) { document.getElementById('diag-fps').innerText = frameCounter + ' FPS'; frameCounter = 0; lastFpsTime = now; } }; img.src = url; }" +
  "async function refreshAdbDevices() { const res = await fetch('/api/adb-devices'); const devices = await res.json(); document.getElementById('device-list-container').innerHTML = devices.map(d => '<div class=\"device-card active\"><div><b>' + d.model + '</b><br><small>🟢 Connected via USB/ADB</small></div></div>').join(''); }" +
  "function getCanvasCoords(e) { const rect = streamCanvas.getBoundingClientRect(), scaleX = streamCanvas.width / rect.width, scaleY = streamCanvas.height / rect.height; return { x: Math.round((e.clientX - rect.left) * scaleX), y: Math.round((e.clientY - rect.top) * scaleY) }; }" +
  "streamCanvas.addEventListener('mousedown', (e) => { isMouseDown = true; const coords = getCanvasCoords(e); startX = coords.x; startY = coords.y; });" +
  "streamCanvas.addEventListener('mouseup', (e) => { if (!isMouseDown) return; isMouseDown = false; const coords = getCanvasCoords(e); const dist = Math.hypot(coords.x - startX, coords.y - startY); if (dist < 15) { ws.send(JSON.stringify({ type: 'adb_tap', x: coords.x, y: coords.y })); } else { ws.send(JSON.stringify({ type: 'adb_swipe', x1: startX, y1: startY, x2: coords.x, y2: coords.y, duration: 250 })); } });" +
  "function sendAdbKey(key) { if (ws) ws.send(JSON.stringify({ type: 'adb_key', key })); }" +
  "function sendTextToPhone() { const input = document.getElementById('clipboard-input'); if (input.value && ws) { ws.send(JSON.stringify({ type: 'adb_text', text: input.value })); input.value = ''; } }" +
  "function handleKeyPress(e) { if (e.key === 'Enter') sendTextToPhone(); }" +
  "window.addEventListener('DOMContentLoaded', initWebSocket);" +
  "</script></body></html>";

app.get('/', (req, res) => res.send(INDEX_HTML));
app.get('/index.html', (req, res) => res.send(INDEX_HTML));

app.get('/api/adb-devices', (req, res) => {
  const devices = getAdbDevices().map(d => ({ ...d, model: getDeviceModel(d.id) }));
  res.json(devices);
});

let isStreaming = false;
function startAdbStreamLoop() {
  if (isStreaming) return;
  isStreaming = true;

  const adb = getAdbPath();
  const captureFrame = () => {
    exec(`"${adb}" exec-out screencap -p`, { encoding: 'binary', maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (!err && stdout) {
        const buf = Buffer.from(stdout, 'binary');
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) client.send(buf);
        }
      }
      setTimeout(captureFrame, 50);
    });
  };
  captureFrame();
}

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const adb = getAdbPath();

      if (data.type === 'start_adb_stream') {
        startAdbStreamLoop();
      } else if (data.type === 'adb_tap') {
        exec(`"${adb}" shell input tap ${data.x} ${data.y}`);
      } else if (data.type === 'adb_swipe') {
        exec(`"${adb}" shell input swipe ${data.x1} ${data.y1} ${data.x2} ${data.y2} ${data.duration || 250}`);
      } else if (data.type === 'adb_key') {
        exec(`"${adb}" shell input keyevent ${data.key}`);
      } else if (data.type === 'adb_text') {
        const sanitized = data.text.replace(/["'\\]/g, '');
        exec(`"${adb}" shell input text "${sanitized}"`);
      }
    } catch (e) {}
  });
});

server.listen(PORT, () => {
  console.log(`🚀 NATIVE ADB GALAXY A16 SERVER RUNNING AT http://localhost:${PORT}`);
});
