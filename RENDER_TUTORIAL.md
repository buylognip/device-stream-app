# Complete Render.com Deployment Guide (From Scratch) - 100% FREE ($0)

Follow these exact steps from start to finish to get your **DeviceStream Pro** app live on the internet for $0 forever with zero authorization codes!

---

## 📌 STEP 1: Upload Your Code to GitHub (Free)

1. Go to **[https://github.com](https://github.com)** and log in or create a free account.
2. Click the **+** icon in the top right -> Select **New repository**.
3. Set Repository Name: `device-stream-app`.
4. Keep it **Public** (or Private) -> Click **Create repository**.
5. Click the link that says **"uploading an existing file"**.
6. Open your local folder:
   `C:\Users\3\.gemini\antigravity\scratch\device_stream_app`
7. Drag and drop all project files into GitHub:
   - `server.js`
   - `package.json`
   - `public/` (folder containing `index.html`, `phone.html`, `css/`, `js/`)
8. Click **Commit changes**.

---

## 📌 STEP 2: Create a Free Service on Render.com

1. Go to **[https://render.com](https://render.com)** and click **Sign Up** (Choose "Sign in with GitHub" for 1-click setup).
2. On your Render Dashboard, click the blue **New +** button -> Select **Web Service**.
3. Choose **Build and deploy from a Git repository** -> Click **Next**.
4. Connect your GitHub account and select your `device-stream-app` repository.

---

## 📌 STEP 3: Configure Render Settings (100% Free)

Fill in the form with these exact settings:

| Setting Field | Enter This Value |
| :--- | :--- |
| **Name** | `my-device-stream` (or any name you like) |
| **Region** | Choose closest region (e.g. Oregon, Frankfurt, Singapore) |
| **Branch** | `main` |
| **Root Directory** | *(Leave blank)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Select **Free ($0/month)** |

Click **Create Web Service** at the bottom.

---

## 📌 STEP 4: Get Your Live Link & Start Using!

Render will build and deploy your app in about 1 to 2 minutes.

Once finished, Render displays your **Live HTTPS URL** at the top of your dashboard:
`https://my-device-stream.onrender.com`

### How to Connect & Stream:
1. **On your PC Browser**: Open `https://my-device-stream.onrender.com`
2. **On your Phone Browser**: Open `https://my-device-stream.onrender.com/phone.html`
3. Tap **Start Screen Stream** on your phone!
4. **Zero PIN codes required!** Your phone screen immediately streams live to your PC from anywhere in the world!
