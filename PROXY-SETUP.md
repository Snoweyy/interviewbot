# 🌐 Corporate Proxy Setup Guide

If you're trying to run this project on a work/corporate laptop and getting proxy errors, this guide will help you configure everything properly.

## Understanding the Problem

Corporate networks often use proxy servers to control internet access. This can block:
- npm package downloads
- Python pip installations
- API calls to Google Gemini
- Git operations

## Quick Fix Checklist

- [ ] Find your proxy address and port
- [ ] Configure environment variables
- [ ] Configure npm proxy
- [ ] Configure pip proxy
- [ ] Test the connection

---

## Step 1: Find Your Proxy Settings

### Windows
1. Press `Win + I` to open Settings
2. Go to **Network & Internet** → **Proxy**
3. Look for "Manual proxy setup"
4. Note the address and port (e.g., `proxy.company.com:8080`)

### macOS
1. Open **System Preferences** → **Network**
2. Select your network connection
3. Click **Advanced** → **Proxies**
4. Note the proxy server and port

### Ask IT Department
If you can't find it, ask your IT team:
- "What's our HTTP/HTTPS proxy server address and port?"

---

## Step 2: Configure Environment Variables

Edit your `.env` file and add:

```bash
# Proxy Configuration
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,::1

# If your proxy requires authentication
# HTTP_PROXY=http://username:password@proxy.company.com:8080
# HTTPS_PROXY=http://username:password@proxy.company.com:8080
```

**Replace** `proxy.company.com:8080` with your actual proxy address.

---

## Step 3: Configure npm

Open terminal/command prompt and run:

```bash
# Set proxy for npm
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# If you have SSL certificate issues
npm config set strict-ssl false

# Verify settings
npm config get proxy
npm config get https-proxy
```

### With Authentication
If your proxy requires username/password:

```bash
npm config set proxy http://username:password@proxy.company.com:8080
npm config set https-proxy http://username:password@proxy.company.com:8080
```

---

## Step 4: Configure pip (Python)

```bash
# Windows
pip config set global.proxy http://proxy.company.com:8080

# macOS/Linux
pip3 config set global.proxy http://proxy.company.com:8080

# Verify
pip config list
```

### Alternative: Use pip with proxy flag
```bash
pip install --proxy http://proxy.company.com:8080 -r api_py/requirements.txt
```

---

## Step 5: Configure Git (if using)

```bash
git config --global http.proxy http://proxy.company.com:8080
git config --global https.proxy http://proxy.company.com:8080

# Verify
git config --global --get http.proxy
```

---

## Step 6: Test Your Configuration

### Test npm
```bash
npm install axios
```
If successful, npm is configured correctly.

### Test pip
```bash
pip install requests
```
If successful, pip is configured correctly.

### Test API access
```bash
# Windows
curl https://generativelanguage.googleapis.com

# If curl works, API access should work
```

---

## Common Proxy Error Messages

### "ECONNREFUSED" or "ETIMEDOUT"
- Your proxy settings are incorrect
- Double-check proxy address and port

### "407 Proxy Authentication Required"
- Your proxy requires username/password
- Add credentials to proxy URL: `http://user:pass@proxy:port`

### "SSL certificate problem"
- Corporate SSL inspection is interfering
- Try: `npm config set strict-ssl false` (not recommended for production)

### "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"
- SSL certificate chain issue
- Ask IT for the corporate CA certificate
- Or use: `NODE_TLS_REJECT_UNAUTHORIZED=0` (temporary, not secure)

---

## Alternative Solutions

### 1. Use Personal Device
- Run the project on your personal laptop at home
- No proxy configuration needed

### 2. Mobile Hotspot
- Use your phone's internet connection
- Bypass corporate network entirely
- **Note**: May use significant data for npm/pip downloads

### 3. Request IT Whitelist
Ask your IT department to whitelist these domains:
- `registry.npmjs.org` (npm packages)
- `pypi.org` (Python packages)
- `generativelanguage.googleapis.com` (Gemini API)
- `aistudio.google.com` (API key management)

### 4. Offline Installation
1. Download dependencies on a non-corporate network
2. Copy `node_modules/` folder to work laptop
3. For Python: use `pip download` then `pip install --no-index`

---

## Environment-Specific Setup

### Development Only
If you only need proxy for development:

**Windows** (temporary):
```cmd
set HTTP_PROXY=http://proxy.company.com:8080
set HTTPS_PROXY=http://proxy.company.com:8080
npm run dev
```

**macOS/Linux** (temporary):
```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
npm run dev
```

### Permanent System-Wide
Add to system environment variables (Windows):
1. Search "Environment Variables"
2. Add `HTTP_PROXY` and `HTTPS_PROXY` as system variables

---

## Verification Checklist

After configuration, verify:

```bash
# 1. Check npm proxy
npm config get proxy
# Should show: http://proxy.company.com:8080

# 2. Check pip proxy
pip config list
# Should show proxy setting

# 3. Test npm install
npm install

# 4. Test pip install
pip install -r api_py/requirements.txt

# 5. Run the app
npm run dev
```

---

## Still Having Issues?

### Check with IT
- Is the proxy address correct?
- Do you need VPN to be connected?
- Are there any firewall rules blocking specific ports?
- Is authentication required?

### Logs to Check
- npm error logs: `npm-debug.log`
- Python error messages in terminal
- Browser console (F12) for frontend errors

### Last Resort
If nothing works:
1. Use a personal device or home network
2. Set up the project there
3. Share via GitHub/ZIP with colleagues

---

## Quick Reference

```bash
# Find proxy (Windows)
netsh winhttp show proxy

# Remove proxy settings (if needed)
npm config delete proxy
npm config delete https-proxy
git config --global --unset http.proxy
git config --global --unset https.proxy

# Test connection
curl -v https://www.google.com
```

---

**Need more help?** Check the main [SETUP.md](SETUP.md) or open an issue on the repository.
