REALWORLD BATTLE ZONE - PWA WEB PROJECT

Files:
- index.html
- style.css
- src/main.js
- public/manifest.webmanifest
- public/sw.js
- public/icon.svg

Run in Termux:
  cd ~/RealWorldBattleZone/frontend
  npm install
  npm run dev

Open the Local URL shown by Vite in Chrome.
For public PWA installation, deploy the built app over HTTPS:
  npm run build
  npm run preview

This is a 3D prototype. It is not an APK and does not include online multiplayer.
The service worker caches visited resources; complete offline support requires a production build and a first online visit.
