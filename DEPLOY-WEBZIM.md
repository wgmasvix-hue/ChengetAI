# Deploying the ChengetAi Labs website on WebZim (cPanel shared hosting)

The site is fully static — no database, no Node.js, no build step. It runs on any
Apache/cPanel host, including WebZim shared hosting.

## What to upload

Use the ready-made package **`dist/chengetai-website-webzim.zip`** (in this repository),
or upload these items from the repository root:

```
index.html            products.html   cloud.html     deploy.html
ai.html               solutions.html  research.html  pricing.html
resources.html        about.html      contact.html   portal.html
admin.html            404.html        .htaccess      assets/
```

## Steps (cPanel File Manager)

1. Log in to your WebZim cPanel.
2. Open **File Manager** → go to **`public_html`** (or the subdomain's document root).
3. Click **Upload** and upload `chengetai-website-webzim.zip`.
4. Back in File Manager, right-click the zip → **Extract** into `public_html`.
5. Delete the zip. Done — visit your domain.

> Make sure **"Show Hidden Files (dotfiles)"** is enabled in File Manager settings so
> the `.htaccess` file is visible after extraction.

## Steps (FTP)

Upload everything (including `.htaccess` and the whole `assets/` folder) into
`public_html`, preserving the folder structure.

## Enabling HTTPS

In cPanel, run **SSL/TLS Status → Run AutoSSL** (WebZim includes free AutoSSL).
The site works on both HTTP and HTTPS with no changes.

## Notes

- **Self-contained:** fonts are bundled in `assets/fonts/` — the site makes zero
  external requests, so it stays fast on local connections and works even if
  international bandwidth is degraded.
- **Friendly URLs:** `.htaccess` maps `/pricing` → `/pricing.html`, adds caching,
  compression and security headers, and serves a branded `404.html`.
- **Contact form:** the form currently shows a client-side confirmation. To receive
  real messages, point the form at a backend or a form service (e.g. add
  `action="https://formspree.io/f/yourid" method="POST"` to the form in
  `contact.html`), or wire it to your future ChengetAi API.
- **Portals:** `portal.html` and `admin.html` are interactive demos of the customer
  and administrator dashboards. Production sign-in will be backed by Supabase
  Auth / Keycloak per the platform architecture.
