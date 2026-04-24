# 🤫 Shushlink

> Zero-backend, zero-knowledge secret sharing. The secret lives in the URL fragment, the server never sees it, the password is the decryption key.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat)](LICENSE)
[![Powered by VibeNest](https://img.shields.io/badge/powered%20by-VibeNest-7c3aed?style=flat)](https://vibenest.net/)
[![Built with SynthCabal](https://img.shields.io/badge/built%20with-SynthCabal-0ea5e9?style=flat)](https://sc.vibenest.net/)

Shushlink is a single static page that lets you share a secret with someone over an insecure channel. The browser encrypts the secret with a password-derived key and packs the ciphertext into the URL fragment (`#…`). Browsers do **not** send fragments to servers, so the host that ships the HTML never sees your secret, your password, or any metadata.

Compromise the host → nothing leaks. Pull the plug on the host → the link still decrypts. Open the HTML file from disk → it still works.

---

## How it works

```
sender                          recipient
------                          ---------
secret + password
   │
   ├─ Argon2id(password, salt) → key
   ├─ AES-256-GCM(key, iv, secret) → ciphertext
   ├─ payload = salt ‖ iv ‖ ciphertext+tag
   │
   └─→ URL: https://shushlink.app/#v1.<base64url(payload)>
                  │
                  │  (fragment never hits the server)
                  ▼
              recipient opens the link
                  │
                  ├─ password
                  ├─ Argon2id(password, salt) → key
                  └─ AES-256-GCM.decrypt → secret
```

- **KDF:** Argon2id, m=19 MiB, t=2, p=1, 32-byte output (OWASP-2024 minimum)
- **Cipher:** AES-256-GCM (Web Crypto, native), 128-bit auth tag
- **Salt:** 16 bytes from `crypto.getRandomValues`
- **IV:** 12 bytes from `crypto.getRandomValues`
- **Encoding:** base64url, no padding
- **Format:** `v1.<base64url(salt ‖ iv ‖ ciphertext)>` — versioned so KDF parameters can evolve safely

---

## Run locally

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # preview the production bundle
```

The build artifact is a fully static `dist/` directory: drop it on any static host (or open `dist/index.html` straight from disk — it still works).

---

## Deploy

Built for one-click deploy on [VibeNest](https://vibenest.net/) — paste the repo, get a live URL. Works equally well on GitHub Pages, Cloudflare Pages, Netlify, S3 + CloudFront, or your own nginx.

---

## Security notes

- The fragment (everything after `#`) is **never** sent in HTTP requests. It does not appear in server logs, access logs, or `Referer` headers.
- The `<meta name="referrer" content="no-referrer">` and `<meta name="robots" content="noindex">` tags belt-and-brace the above.
- All outbound links use `rel="noopener noreferrer"` — important for any crypto tool.
- No external scripts, fonts, or trackers. No analytics. No cookies.
- The recipient must paste the password manually — it is never carried in the URL.
- "One-time view" is **not** offered, because it requires server-side state and would invalidate the zero-backend property. If you close the tab, the secret is gone from your machine; the link itself can still be decrypted by anyone who has both it and the password.

---

## Limits

- Browsers tolerate URLs up to roughly 2000 characters reliably. After base64 + Argon2 overhead, that is ~1.4 KB of plaintext. The UI warns you when you exceed this.
- For larger secrets or files, you need either chunked links or a backend — both out of scope for the zero-backend MVP.

---

## Project layout

```
index.html
public/favicon.svg
src/
  main.ts            entry, fragment-based routing
  crypto.ts          Argon2id + AES-256-GCM + base64url
  password.ts        secure random password generator
  qr.ts              inline-SVG QR rendering
  i18n.ts            string dictionary (EN; RU scaffolded)
  ui/
    encrypt-view.ts  "create link" form + result + QR
    decrypt-view.ts  "decrypt link" form + result
    components.ts    DOM helpers
  styles.css         single-file CSS
```

---

## License

[Apache License 2.0](LICENSE).

---

## Powered by

Shushlink is built and hosted on [VibeNest](https://vibenest.net/) — a PaaS that takes you from "paste repo" to "live URL" in 60 seconds. The codebase was assembled together with [SynthCabal](https://sc.vibenest.net/) — an AI squad for vibe-driven development.

<p align="center">
  <a href="https://vibenest.net/"><img src="https://img.shields.io/badge/powered%20by-VibeNest-7c3aed?style=flat" alt="Powered by VibeNest" height="28"/></a>
  &nbsp;
  <a href="https://sc.vibenest.net/"><img src="https://img.shields.io/badge/built%20with-SynthCabal-0ea5e9?style=flat" alt="Built with SynthCabal" height="28"/></a>
</p>
