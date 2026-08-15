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
  ".status-dot.connecting { background-color: var(--warning-color); }" +
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
  ".stream-canvas { max-width: 100%; max-height: 72vh; object-fit: contain; border-radius: 18px; cursor: crosshair; background: #090d16; }" +
  ".stream-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 60px 40px; text-align: center; color: var(--text-muted); }" +
  ".remote-toolbar { display: flex; gap: 10px; margin-top: 18px; padding: 10px 20px; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(14px); border: 1px solid var(--border-color); border-radius: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }" +
  ".tool-btn { background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border-color); color: #fff; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; transition: all 0.2s ease; }" +
  ".tool-btn:hover { background: var(--accent-color); transform: translateY(-2px); box-shadow: 0 4px 14px var(--accent-glow); }" +
  ".btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease; }" +
  ".btn-primary:hover { background: linear-gradient(135deg, #4f46e5, #4338ca); box-shadow: 0 0 18px var(--accent-glow); }" +
  ".modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }" +
  ".modal-overlay.open { opacity: 1; pointer-events: auto; }" +
  ".modal-content { width: 100%; max-width: 460px; padding: 30px; text-align: center; }" +
  ".pin-inputs { display: flex; gap: 8px; justify-content: center; margin: 16px 0; }" +
  ".pin-digit { width: 44px; height: 52px; font-size: 22px; text-align: center; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); border-radius: 10px; color: #fff; font-weight: 700; }" +
  ".qr-box { background: #fff; padding: 12px; border-radius: 16px; display: inline-block; margin: 12px 0; box-shadow: 0 0 25px rgba(99, 102, 241, 0.4); }" +
  ".stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 0.88rem; }" +
  ".stat-label { color: var(--text-muted); }" +
  ".stat-value { font-weight: 600; color: var(--accent-color); }";

const INDEX_HTML = 
  "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>DeviceStream Pro v2.0 - PC Control Center</title><style>" + EMBEDDED_CSS + "</style></head><body>" +
  "<header><div class='brand'><div class='brand-icon'>📱</div><div><div class='brand-title'>DeviceStream Pro v2.0</div><div style='font-size: 0.75rem; color: #94a3b8;'>PC Remote Control Center & Live Mirror</div></div></div>" +
  "<div style='display: flex; gap: 12px; align-items: center;'><button id='toggle-mode-btn' class='connection-pill' style='background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #10b981;' onclick='toggleAuthMode()'>⚡ Mode: Zero-Code Instant</button>" +
  "<button class='btn-primary' onclick='openPairingModal()'>📷 Scan QR / Connect Link</button><div class='connection-pill'><span id='server-status-dot' class='status-dot connecting'></span><span id='server-status-text'>Connecting...</span></div></div></header>" +
  "<div class='dashboard-container'><div class='sidebar-panel'><div class='glass-panel panel-section' style='flex: 1;'><div class='panel-header'><span class='panel-title'>Connected Devices</span><button style='background: none; border: none; color: #6366f1; cursor: pointer; font-size: 0.85rem;' onclick='refreshDevices()'>🔄 Refresh</button></div>" +
  "<div id='device-list-container'><div style='text-align: center; color: #94a3b8; padding: 30px 10px; font-size: 0.9rem;'>Loading devices...</div></div>" +
  "<div id='mode-info-box' style='margin-top: 20px; padding: 14px; background: rgba(16, 185, 129, 0.08); border-radius: 12px; border: 1px dashed rgba(16, 185, 129, 0.3);'>" +
  "<div style='font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; color: #10b981;' id='mode-info-title'>⚡ Screen Mirroring Active</div><div style='font-size: 0.78rem; color: #94a3b8; line-height: 1.4;' id='mode-info-desc'>Samsung Galaxy A16 & all mobile devices supported!</div></div></div></div>" +
  "<div class='glass-panel viewport-container'><div id='screen-wrapper' class='screen-wrapper' style='display: none;'><canvas id='stream-canvas' class='stream-canvas' tabindex='0'></canvas></div>" +
  "<div id='stream-placeholder' class='stream-placeholder'><div style='font-size: 58px; color: #6366f1;'>📲</div><h3 style='font-size: 1.35rem; color: #fff;'>No Mobile Stream Active</h3><p style='max-width: 420px; font-size: 0.9rem;'>Scan QR Code or open link on your mobile phone to connect live.</p><button class='btn-primary' style='margin-top: 10px;' onclick='openPairingModal()'>📷 Open QR Code Scanner</button></div>" +
  "<div id='remote-toolbar' class='remote-toolbar' style='display: none;'><button class='tool-btn' title='Back' onclick=\"sendRemoteButton('back')\">◀️</button><button class='tool-btn' title='Home' onclick=\"sendRemoteButton('home')\">🏠</button><button class='tool-btn' title='Recents' onclick=\"sendRemoteButton('recents')\">⏹️</button><button class='tool-btn' title='Lock Screen' onclick=\"sendRemoteButton('lock')\">🔒</button><button class='tool-btn' title='Volume Up' onclick=\"sendRemoteButton('volume_up')\">🔊</button><button class='tool-btn' title='Volume Down' onclick=\"sendRemoteButton('volume_down')\">🔉</button><button class='tool-btn' title='Screenshot' onclick=\"sendRemoteButton('screenshot')\">📸</button></div></div>" +
  "<div class='sidebar-panel sidebar-right'><div class='glass-panel panel-section'><div class='panel-header'><span class='panel-title'>Keyboard & Clipboard</span></div><div style='display: flex; flex-direction: column; gap: 10px;'><input type='text' id='clipboard-input' placeholder='Type text to send to phone...' style='width: 100%; padding: 10px 14px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; color: #fff;'><button class='btn-primary' style='width: 100%; font-size: 0.85rem;' onclick='sendClipboardText()'>⚡ Send Text to Phone</button></div></div>" +
  "<div class='glass-panel panel-section'><div class='panel-header'><span class='panel-title'>Stream Controls</span></div><div style='display: flex; flex-direction: column; gap: 12px;'><div><label style='font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 6px;'>Frame Rate & Quality</label><select id='quality-select' style='width: 100%; padding: 8px 12px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; color: #fff;' onchange='updateStreamQuality()'><option value='60'>🚀 Ultra Smooth (60 FPS)</option><option value='30' selected>⚖️ Balanced (30 FPS)</option><option value='15'>🔋 Battery Saver (15 FPS)</option></select></div></div></div>" +
  "<div class='glass-panel panel-section'><div class='panel-header'><span class='panel-title'>Live Diagnostics</span></div><div class='stat-row'><span class='stat-label'>Active Device</span><span class='stat-value' id='diag-device-name'>None</span></div><div class='stat-row'><span class='stat-label'>Live Frame Rate</span><span class='stat-value' id='diag-fps'>0 FPS</span></div><div class='stat-row'><span class='stat-label'>Auth Mode</span><span class='stat-value' id='diag-auth-mode'>Zero-Code Instant</span></div><div class='stat-row'><span class='stat-label'>Resolution</span><span class='stat-value' id='diag-resolution'>N/A</span></div></div></div></div>" +
  "<div id='pairing-modal' class='modal-overlay'><div class='glass-panel modal-content'><div style='display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;'><h3>📷 Instant QR Code Scan</h3><button style='background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;' onclick='closePairingModal()'>×</button></div>" +
  "<div style='font-size: 0.85rem; color: #94a3b8; margin-bottom: 10px;'><b>Scan this QR Code with your Phone Camera:</b></div>" +
  "<div class='qr-box'><img id='qr-image-display' src='' alt='Scan QR Code' style='width: 200px; height: 200px; display: block; border-radius: 8px;'></div>" +
  "<div style='font-size: 0.82rem; color: #10b981; font-weight: 600; margin-bottom: 12px;'>⚡ 1 Scan Auto-Connects Your Phone Live</div>" +
  "<code id='phone-url-display' style='background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 6px; color: #10b981; font-weight: 600; display: block; margin-bottom: 8px; word-break: break-all;'>http://loading...</code>" +
  "<button class='btn-primary' style='width: 100%; font-size: 0.85rem;' onclick='copyPhoneUrl()'>📋 Copy Link Instead</button>" +
  "<div style='text-align: center; margin: 16px 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px;'><div style='font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px;'>- Or Enter 6-Digit PIN Code (PIN Security Mode) -</div><div class='pin-inputs'><input type='text' class='pin-digit' maxlength='1' onkeyup='handlePinInput(this, 0)'><input type='text' class='pin-digit' maxlength='1' onkeyup='handlePinInput(this, 1)'><input type='text' class='pin-digit' maxlength='1' onkeyup='handlePinInput(this, 2)'><input type='text' class='pin-digit' maxlength='1' onkeyup='handlePinInput(this, 3)'><input type='text' class='pin-digit' maxlength='1' onkeyup='handlePinInput(this, 4)'><input type='text' class='pin-digit' maxlength='1' onkeyup='handlePinInput(this, 5)'></div><button class='btn-primary' style='width: 100%; margin-top: 8px;' onclick='submitPairingCode()'>Authorize via PIN Code</button></div><div id='pending-pairing-alerts'></div></div></div>" +
  "<script>" +
  "let ws = null, activeDeviceId = null, requirePairingCode = false, frameCounter = 0, lastFpsTime = Date.now();" +
  "const streamCanvas = document.getElementById('stream-canvas'), ctx = streamCanvas.getContext('2d'), screenWrapper = document.getElementById('screen-wrapper'), streamPlaceholder = document.getElementById('stream-placeholder'), remoteToolbar = document.getElementById('remote-toolbar');" +
  "function initWebSocket() { const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'; ws = new WebSocket(protocol + '//' + window.location.host); ws.binaryType = 'arraybuffer'; ws.onopen = () => { document.getElementById('server-status-dot').className = 'status-dot online'; document.getElementById('server-status-text').innerText = 'Connected'; ws.send(JSON.stringify({ type: 'register_pc' })); const phoneUrl = window.location.protocol + '//' + window.location.host + '/phone.html'; document.getElementById('phone-url-display').innerText = phoneUrl; document.getElementById('qr-image-display').src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(phoneUrl); refreshDevices(); }; ws.onmessage = (event) => { if (event.data instanceof ArrayBuffer) { renderBinaryFrame(event.data); return; } const data = JSON.parse(event.data); if (data.type === 'pc_registered') { requirePairingCode = data.requirePairingCode; updateAuthModeUI(requirePairingCode); updateAuthorizedDeviceList(data.authorizedDevices || []); } else if (data.type === 'setting_updated') { requirePairingCode = data.requirePairingCode; updateAuthModeUI(requirePairingCode); } else if (data.type === 'device_status_change') { refreshDevices(); if (data.status === 'online' && !activeDeviceId) selectDevice(data.deviceId, data.deviceName, true); } }; ws.onclose = () => setTimeout(initWebSocket, 3000); }" +
  "async function toggleAuthMode() { const res = await fetch('/api/toggle-auto-approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requirePairingCode: !requirePairingCode }) }); const data = await res.json(); requirePairingCode = data.requirePairingCode; updateAuthModeUI(requirePairingCode); }" +
  "function updateAuthModeUI(reqCode) { const btn = document.getElementById('toggle-mode-btn'), diagAuth = document.getElementById('diag-auth-mode'); if (!reqCode) { btn.innerText = '⚡ Mode: Zero-Code Instant'; btn.style.color = '#10b981'; if (diagAuth) diagAuth.innerText = 'Zero-Code Instant'; } else { btn.innerText = '🔒 Mode: PIN Code Required'; btn.style.color = '#f59e0b'; if (diagAuth) diagAuth.innerText = 'PIN Code Required'; } }" +
  "function copyPhoneUrl() { navigator.clipboard.writeText(document.getElementById('phone-url-display').innerText).then(() => alert('Copied Link!')); }" +
  "async function refreshDevices() { const res = await fetch('/api/devices'); updateAuthorizedDeviceList(await res.json()); }" +
  "function updateAuthorizedDeviceList(devices) { const container = document.getElementById('device-list-container'); if (!devices || devices.length === 0) { container.innerHTML = '<div style=\"text-align:center; padding:30px; color:#94a3b8;\">No devices connected.</div>'; return; } container.innerHTML = devices.map(dev => '<div class=\"device-card ' + (dev.deviceId === activeDeviceId ? 'active' : '') + '\" onclick=\"selectDevice(\\'' + dev.deviceId + '\\', \\'' + dev.deviceName + '\\', ' + dev.isOnline + ')\"><div><b>' + dev.deviceName + '</b><br><small>' + (dev.isOnline ? '🟢 Connected' : '🔴 Offline') + '</small></div>' + (dev.isOnline ? '<button class=\"btn-primary\" style=\"padding:4px 8px; font-size:12px;\" onclick=\"event.stopPropagation(); startStreamForDevice(\\'' + dev.deviceId + '\\', \\'' + dev.deviceName + '\\')\">View</button>' : '') + '</div>').join(''); }" +
  "function renderBinaryFrame(arrayBuffer) { const blob = new Blob([arrayBuffer], { type: 'image/jpeg' }), img = new Image(), url = URL.createObjectURL(blob); img.onload = () => { streamCanvas.width = img.width; streamCanvas.height = img.height; ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url); frameCounter++; const now = Date.now(); if (now - lastFpsTime >= 1000) { document.getElementById('diag-fps').innerText = frameCounter + ' FPS'; frameCounter = 0; lastFpsTime = now; } }; img.src = url; }" +
  "function selectDevice(deviceId, deviceName, isOnline) { activeDeviceId = deviceId; if (isOnline) startStreamForDevice(deviceId, deviceName); }" +
  "function startStreamForDevice(deviceId, deviceName) { activeDeviceId = deviceId; screenWrapper.style.display = 'flex'; streamPlaceholder.style.display = 'none'; remoteToolbar.style.display = 'flex'; document.getElementById('diag-device-name').innerText = deviceName; }" +
  "function openPairingModal() { document.getElementById('pairing-modal').classList.add('open'); }" +
  "function closePairingModal() { document.getElementById('pairing-modal').classList.remove('open'); }" +
  "function handlePinInput(el, idx) { if (el.value.length === 1 && idx < 5) document.querySelectorAll('.pin-digit')[idx+1].focus(); }" +
  "function submitPairingCode() { const digits = Array.from(document.querySelectorAll('.pin-digit')).map(i => i.value).join(''); if (digits.length === 6 && ws) ws.send(JSON.stringify({ type: 'approve_pairing', pairingCode: digits })); }" +
  "function sendRemoteButton(action) { if (activeDeviceId && ws) ws.send(JSON.stringify({ type: 'remote_button', targetDeviceId: activeDeviceId, action })); }" +
  "function sendClipboardText() { const input = document.getElementById('clipboard-input'); if (input.value && activeDeviceId && ws) { ws.send(JSON.stringify({ type: 'remote_clipboard', targetDeviceId: activeDeviceId, text: input.value })); input.value = ''; } }" +
  "function updateStreamQuality() { const fpsVal = parseInt(document.getElementById('quality-select').value, 10); if (activeDeviceId && ws) ws.send(JSON.stringify({ type: 'change_quality', targetDeviceId: activeDeviceId, config: { fps: fpsVal } })); }" +
  "window.addEventListener('DOMContentLoaded', initWebSocket);" +
  "</script></body></html>";

const PHONE_HTML = 
  "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'><title>DeviceStream - Mobile</title><style>" + EMBEDDED_CSS + " body { background: #090d16; display: flex; align-items: center; justify-content: center; padding: 20px; min-height: 100vh; } .phone-card { width: 100%; max-width: 420px; padding: 24px; text-align: center; }</style></head><body>" +
  "<div class='glass-panel phone-card'><div style='font-size: 48px; margin-bottom: 10px;'>📱</div><h2>DeviceStream Mobile</h2><div id='device-name-tag' style='font-size: 0.85rem; color: #94a3b8; margin-bottom: 15px;'>Connecting...</div>" +
  "<div class='connection-pill' style='justify-content: center; margin-bottom: 15px;'><span id='phone-status-dot' class='status-dot connecting'></span><span id='phone-status-text'>Connecting...</span></div>" +
  "<div id='pairing-card' style='display: none; padding: 16px; background: rgba(245,158,11,0.15); border: 2px dashed #f59e0b; border-radius: 12px; margin-bottom: 20px;'><div style='font-size: 0.85rem; color: #94a3b8;'>Enter this PIN Code on PC:</div><div id='display-pairing-code' style='font-size: 2.5rem; font-weight: 800; letter-spacing: 6px; color: #fff; font-family: monospace; margin: 10px 0;'>------</div></div>" +
  "<div id='authorized-card'><div style='padding: 12px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; margin-bottom: 16px; color: #10b981; font-weight: 600;'>🟢 Authorized & Connected!</div>" +
  "<div style='display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;'>" +
  "<button id='btn-start-screen' class='btn-primary' style='width: 100%; padding: 14px; font-size: 0.95rem;' onclick='startScreenShare()'>📱 Mirror Phone Screen</button>" +
  "<button id='btn-start-cam' class='btn-primary' style='width: 100%; padding: 14px; font-size: 0.95rem; background: linear-gradient(135deg, #a855f7, #6366f1);' onclick='startCameraMirror()'>📷 Mirror Camera Stream</button>" +
  "<button id='btn-stop' style='display: none; width: 100%; padding: 14px; background: #ef4444; color: #fff; border: none; border-radius: 10px; font-weight: 600;' onclick='stopScreenCapture()'>⏹️ Stop Mirroring</button>" +
  "</div>" +
  "<canvas id='preview' style='display: none; width: 100%; margin-top: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);'></canvas></div>" +
  "<div id='action-toast' style='margin-top: 15px; font-size: 0.85rem; color: #6366f1;'></div></div>" +
  "<script>" +
  "let ws = null, mediaStream = null, captureInterval = null;" +
  "function getDeviceId() { let id = localStorage.getItem('device_id'); if (!id) { id = 'dev_' + Math.random().toString(36).substring(2, 9); localStorage.setItem('device_id', id); } return id; }" +
  "const deviceId = getDeviceId(), deviceName = /android/i.test(navigator.userAgent) ? 'Android Device' : /iPhone|iPad/i.test(navigator.userAgent) ? 'Apple iOS' : 'Mobile Phone';" +
  "document.getElementById('device-name-tag').innerText = 'ID: ' + deviceId + ' | ' + deviceName;" +
  "function initWS() { const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'; ws = new WebSocket(protocol + '//' + window.location.host); ws.binaryType = 'arraybuffer'; ws.onopen = () => { document.getElementById('phone-status-dot').className = 'status-dot online'; document.getElementById('phone-status-text').innerText = 'Connected'; ws.send(JSON.stringify({ type: 'phone_connect', deviceId: deviceId, deviceName: deviceName, token: localStorage.getItem('device_token') })); }; ws.onmessage = (event) => { const data = JSON.parse(event.data); if (data.type === 'pairing_required') { document.getElementById('pairing-card').style.display = 'block'; document.getElementById('authorized-card').style.display = 'none'; document.getElementById('display-pairing-code').innerText = data.pairingCode; } else if (data.type === 'auth_success') { if (data.token) localStorage.setItem('device_token', data.token); document.getElementById('pairing-card').style.display = 'none'; document.getElementById('authorized-card').style.display = 'block'; } }; ws.onclose = () => setTimeout(initWS, 3000); }" +
  "async function startScreenShare() { try { mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false }); startStreamingWithMedia(); } catch (e) { try { mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); startStreamingWithMedia(); } catch (err2) { mediaStream = await navigator.mediaDevices.getUserMedia({ video: true }); startStreamingWithMedia(); } } }" +
  "async function startCameraMirror() { try { mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); startStreamingWithMedia(); } catch (e) { mediaStream = await navigator.mediaDevices.getUserMedia({ video: true }); startStreamingWithMedia(); } }" +
  "function startStreamingWithMedia() { document.getElementById('btn-start-screen').style.display = 'none'; document.getElementById('btn-start-cam').style.display = 'none'; document.getElementById('btn-stop').style.display = 'block'; const canvas = document.getElementById('preview'), ctx = canvas.getContext('2d'); canvas.style.display = 'block'; const v = document.createElement('video'); v.srcObject = mediaStream; v.play(); v.onended = () => stopScreenCapture(); captureInterval = setInterval(() => { if (v.readyState !== v.HAVE_ENOUGH_DATA) return; canvas.width = v.videoWidth * 0.75; canvas.height = v.videoHeight * 0.75; ctx.drawImage(v, 0, 0, canvas.width, canvas.height); canvas.toBlob((b) => { if (b && ws && ws.readyState === 1) b.arrayBuffer().then(buf => ws.send(buf)); }, 'image/jpeg', 0.7); }, 33); }" +
  "function stopScreenCapture() { if (captureInterval) clearInterval(captureInterval); if (mediaStream) mediaStream.getTracks().forEach(t => t.stop()); document.getElementById('btn-start-screen').style.display = 'block'; document.getElementById('btn-start-cam').style.display = 'block'; document.getElementById('btn-stop').style.display = 'none'; }" +
  "window.addEventListener('DOMContentLoaded', initWS);" +
  "</script></body></html>";

app.get('/', (req, res) => res.send(INDEX_HTML));
app.get('/index.html', (req, res) => res.send(INDEX_HTML));
app.get('/phone.html', (req, res) => res.send(PHONE_HTML));

let authorizedDevices = {};
function loadAuthorizedDevices() {
  try { if (fs.existsSync(AUTH_FILE)) authorizedDevices = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); } catch (err) {}
}
function saveAuthorizedDevices() {
  try { fs.writeFileSync(AUTH_FILE, JSON.stringify(authorizedDevices, null, 2), 'utf8'); } catch (err) {}
}
loadAuthorizedDevices();

const connectedPhones = new Map();
const connectedPCs = new Set();
const pendingPairings = new Map();

app.get('/api/info', (req, res) => {
  res.json({ port: PORT, requirePairingCode });
});

app.post('/api/toggle-auto-approve', (req, res) => {
  requirePairingCode = typeof req.body.requirePairingCode === 'boolean' ? req.body.requirePairingCode : !requirePairingCode;
  broadcastToPCs({ type: 'setting_updated', requirePairingCode });
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

wss.on('connection', (ws) => {
  let clientRole = null, clientDeviceId = null;
  ws.on('message', (message) => {
    try {
      if (Buffer.isBuffer(message)) {
        if (clientRole === 'phone' && clientDeviceId) broadcastToPCsBinary(clientDeviceId, message);
        return;
      }
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'register_pc':
          clientRole = 'pc'; connectedPCs.add(ws);
          ws.send(JSON.stringify({
            type: 'pc_registered', requirePairingCode,
            authorizedDevices: Object.values(authorizedDevices).map(dev => ({
              ...dev, isOnline: connectedPhones.has(dev.deviceId) && connectedPhones.get(dev.deviceId).authenticated
            }))
          }));
          break;

        case 'phone_connect': {
          clientRole = 'phone'; clientDeviceId = data.deviceId;
          const deviceName = data.deviceName || 'Mobile Device';
          const providedToken = data.token;
          const isAlreadyAuthorized = providedToken && authorizedDevices[clientDeviceId] && authorizedDevices[clientDeviceId].token === providedToken;

          if (isAlreadyAuthorized || !requirePairingCode) {
            let token = providedToken || ('tok_' + crypto.randomBytes(16).toString('hex'));
            authorizedDevices[clientDeviceId] = { deviceId: clientDeviceId, deviceName, token, authorizedAt: new Date().toISOString() };
            saveAuthorizedDevices();
            connectedPhones.set(clientDeviceId, { ws, info: { deviceId: clientDeviceId, deviceName }, authenticated: true });
            ws.send(JSON.stringify({ type: 'auth_success', deviceId: clientDeviceId, token }));
            broadcastToPCs({ type: 'device_status_change', deviceId: clientDeviceId, deviceName, status: 'online' });
          } else {
            const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
            pendingPairings.set(pairingCode, { deviceId: clientDeviceId, deviceName, phoneWs: ws, expiresAt: Date.now() + 300000 });
            connectedPhones.set(clientDeviceId, { ws, info: { deviceId: clientDeviceId, deviceName }, authenticated: false });
            ws.send(JSON.stringify({ type: 'pairing_required', pairingCode }));
            broadcastToPCs({ type: 'pairing_request_received', deviceId: clientDeviceId, deviceName, pairingCode });
          }
          break;
        }

        case 'approve_pairing': {
          const { pairingCode, deviceId } = data;
          let pending = null;
          if (pairingCode && pendingPairings.has(pairingCode)) {
            pending = pendingPairings.get(pairingCode); pendingPairings.delete(pairingCode);
          }
          if (pending && pending.expiresAt > Date.now()) {
            const token = 'tok_' + crypto.randomBytes(16).toString('hex');
            authorizedDevices[pending.deviceId] = { deviceId: pending.deviceId, deviceName: pending.deviceName, token, authorizedAt: new Date().toISOString() };
            saveAuthorizedDevices();
            if (connectedPhones.has(pending.deviceId)) connectedPhones.get(pending.deviceId).authenticated = true;
            pending.phoneWs.send(JSON.stringify({ type: 'auth_success', deviceId: pending.deviceId, token }));
            broadcastToPCs({ type: 'device_status_change', deviceId: pending.deviceId, deviceName: pending.deviceName, status: 'online' });
          }
          break;
        }

        case 'remote_input':
        case 'remote_key':
        case 'remote_button':
        case 'remote_clipboard':
        case 'change_quality':
          const targetDeviceId = data.targetDeviceId || data.deviceId;
          if (connectedPhones.has(targetDeviceId)) {
            const phoneEntry = connectedPhones.get(targetDeviceId);
            if (phoneEntry.ws.readyState === 1) phoneEntry.ws.send(JSON.stringify(data));
          }
          break;
      }
    } catch (e) {}
  });

  ws.onclose = () => {
    if (clientRole === 'pc') connectedPCs.delete(ws);
    else if (clientRole === 'phone' && clientDeviceId) {
      connectedPhones.delete(clientDeviceId);
      broadcastToPCs({ type: 'device_status_change', deviceId: clientDeviceId, status: 'offline' });
    }
  };
});

function broadcastToPCs(payload) {
  const msg = JSON.stringify(payload);
  for (const pcWs of connectedPCs) { if (pcWs.readyState === 1) pcWs.send(msg); }
}

function broadcastToPCsBinary(deviceId, binaryData) {
  for (const pcWs of connectedPCs) { if (pcWs.readyState === 1) pcWs.send(binaryData); }
}

server.listen(PORT, () => {
  console.log(`🚀 AUTO FALLBACK ZERO ALERT MIRROR RUNNING ON PORT ${PORT}`);
});
