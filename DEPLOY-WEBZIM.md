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
- **Deploy page API:** `deploy.html` talks to the live API at
  `https://api.chengetailabs.co.zw/api` (real deployment jobs). Deployments are
  gated behind a **dedicated deployment key** issued by ChengetAi Labs: the page
  exchanges the key for a JWT at `POST /auth/login` (payload `{apiKey, key}`), or
  — if the backend accepts keys directly — sends the key itself as the
  `Authorization: Bearer` credential. Visitors without a key are pointed to the
  contact form ("Deployment key request").
  Make sure the backend's Nginx CORS configuration allows the site origins
  `https://www.chengetailabs.co.zw` and `https://chengetailabs.co.zw`
  (headers `Access-Control-Allow-Origin`, `Access-Control-Allow-Headers:
  Content-Type, Authorization`, and the `OPTIONS` preflight method).
- **ChengetAi Store (APKs):** `appstore.html` lists community Android apps from
  `GET /store/apps` and accepts developer submissions at
  `POST /store/submissions` (multipart form: name, developer, email, category,
  description, and either an `apk` file or `apkUrl`). Until those endpoints
  exist, the page shows an honest "coming soon" state and routes submissions to
  the contact form. When you deploy the endpoints, raise Nginx's
  `client_max_body_size` to at least `100M` and include the store routes in the
  CORS configuration.
- **ChengetAi Studio:** `studio.html` calls the AI platform with the visitor's
  deployment-key session: `POST /ai/code` (`{prompt, language}` → `{code}`),
  `POST /ai/image` (`{prompt, size}` → `{imageUrl}` or `{b64}`),
  `POST /ai/fullstack` (`{prompt, stack}` → `{files:[{path, content}]}`), and
  `POST /ai/agents` (`{prompt, tools}` → `{agent}` text/YAML). Until these
  endpoints are live, the page shows a truthful "rolling out" notice with an
  early-access link — no fake output.
  **Credits:** Studio is credit-metered (code 1 · agent 2 · image 5 ·
  full-stack 10). The page reads the balance from `GET /ai/credits`
  (`{balance}`); generation responses may include `credits` (remaining) to
  update the display instantly; return **HTTP 402** with a message when the
  balance is insufficient and the UI prompts a top-up. Credit-pack orders
  arrive via the contact form ("Studio credits order") until a payment
  endpoint exists. Grant 25 free credits to each new deployment key.
- **Contact form:** the form currently shows a client-side confirmation. To receive
  real messages, point the form at a backend or a form service (e.g. add
  `action="https://formspree.io/f/yourid" method="POST"` to the form in
  `contact.html`), or wire it to your future ChengetAi API.
- **Portals:** `portal.html` and `admin.html` sign in against the live API
  (`POST /auth/login` with email/password). The customer portal then renders the
  account's real servers (`GET /servers`) and deployments (`GET /deployments`,
  optional). Nothing on the site is simulated data.
