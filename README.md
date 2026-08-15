# DeviceStream Pro 📱💻

A low-latency real-time screen streaming and PC remote control application. Once authorized via a persistent PIN/QR code pairing process, your phone automatically connects to your PC whenever it comes online!

---

## 🌟 Key Features

1. **Persistent Device Authorization**:
   - Pair phone with PC once using a 6-digit code or direct authorization.
   - Saves a persistent token securely on the device.
   - **Auto-Connect when Online**: Whenever your phone connects to Wi-Fi or comes online, it automatically registers as 🟢 **Online & Authorized** on your PC!

2. **Real-time Low Latency Screen Mirroring**:
   - High-FPS WebSocket & WebRTC screen streaming engine.
   - Adaptive frame rate (15 to 60 FPS) and JPEG quality scaling (HD, Balanced, Performance).

3. **Full Remote Control Center**:
   - Touch & Mouse interactions (Tap, Double Tap, Drag, Right Click, Mouse Wheel Scroll).
   - Remote Navigation Bar: 🏠 **Home**, ◀️ **Back**, ⏹️ **Recents**, 🔒 **Lock Screen**, 🔊/🔉 **Volume**, 📸 **Screenshot**.
   - Physical Keyboard support & Shared Clipboard text bridge.

4. **Multi-Device Dashboard**:
   - Track and manage multiple paired phones from one PC Control Center.

---

## 🚀 How to Run

1. **Start the Server**:
   ```bash
   node server.js
   ```

2. **Open PC Control Center**:
   - Open your browser on PC: `http://localhost:3000`

3. **Connect & Authorize Phone**:
   - Open the displayed Mobile URL on your phone (e.g. `http://<PC_LOCAL_IP>:3000/phone.html`).
   - Enter the 6-digit PIN on PC (or click "Approve Device").
   - Click **Start Screen Stream** on your phone.
   - Enjoy controlling your phone screen live from your PC!

4. **Auto-Reconnect Test**:
   - Turn off Wi-Fi on your phone, then turn it back on.
   - Watch the PC Dashboard instantly update status to 🟢 **Online & Authorized** without asking for a code again!
