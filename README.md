# Doklah

A lightweight, offline-first Progressive Web App (PWA) designed for 100% offline use. Once installed, the app requires no internet connection and no server synchronization.

## Features

✓ **Completely Offline** - Works entirely without internet after installation  
✓ **PWA Ready** - Install on phone/computer like a native app  
✓ **No Syncing** - All data is bundled locally, no server communication  
✓ **Cache-First** - Service Worker caches all assets on first run  
✓ **JSON Data** - Store application data as simple JSON files

## Project Structure

```
doklah/
├── index.html          # Main HTML entry point
├── styles.css          # Application styling
├── app.js              # Application logic
├── sw.js               # Service Worker (caching & offline)
├── manifest.json       # PWA manifest (install metadata)
├── data/               # Your JSON data files
│   └── sample.json     # Example data file
└── README.md           # This file
```

## Getting Started

### 1. Live Demo

**📱 [Try Doklah on GitHub Pages](https://fernando7jr.github.io/doklah/)**

The PWA is fully functional online. Once you visit, you can install it as an app and use it completely offline.

### 2. Development

Serve locally with any HTTP server:

```bash
# Using Python 3
python -m http.server 8000

# Or using Node's http-server
npx http-server

# Or using Ruby
ruby -run -ehttpd . -p8000
```

Visit `http://localhost:8000/doklah/` in your browser.

### 3. GitHub Pages Setup

GitHub Pages is already enabled for this repository!

To set up GitHub Pages for your own fork:

1. **Push to your GitHub repository**
   ```bash
   git push origin main
   ```

2. **Enable GitHub Pages in repository settings:**
   - Go to your repository on GitHub
   - Settings → Pages
   - Source: main branch
   - Click Save

3. **Your PWA will be live at:**
   ```
   https://yourusername.github.io/doklah/
   ```

The `.nojekyll` file in the root directory tells GitHub Pages to serve files as-is, without Jekyll processing, which is required for PWA Service Workers to work correctly.

## Installation on Devices

### Mobile (iOS/Android)

1. Visit the PWA URL in your browser
2. Tap the share/menu button
3. Select "Add to Home Screen" or "Install app"
4. The app will appear on your home screen

### Desktop (Chrome, Edge)

1. Visit the PWA URL
2. Click the install icon in the address bar (or menu)
3. The app will appear in your applications

## How It Works

- **Service Worker** (`sw.js`): Caches all assets on first visit using a cache-first strategy
- **Manifest** (`manifest.json`): Defines install behavior, colors, and app metadata
- **App Logic** (`app.js`): Loads your JSON data and renders the interface

## Offline-First Strategy

The Service Worker uses a **cache-first** approach:

1. **First visit**: Downloads and caches all assets
2. **Subsequent visits**: Serves everything from cache
3. **Network failure**: Still works perfectly from cache
4. **New assets**: Automatically cached when fetched

## Customization

- **Colors**: Edit the gradient in `styles.css` and theme color in `manifest.json`
- **Title**: Change "Doklah" in `index.html` and `manifest.json`
- **Data**: Add JSON files to `data/` folder
- **Layout**: Modify `index.html` and `styles.css`

## Browser Support

- ✓ Chrome/Edge 40+
- ✓ Firefox 44+
- ✓ Safari 15+ (iOS 15.1+)
- ✓ Samsung Internet 4+

## No Server Required

This PWA is designed to work entirely offline. There is:

- ❌ No backend server
- ❌ No API calls
- ❌ No sync mechanism
- ❌ No database

Everything needed is bundled with the app at installation time.
