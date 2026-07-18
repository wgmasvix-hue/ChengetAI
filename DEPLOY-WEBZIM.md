# Deploying the ChengetAi Labs website on WebZim (cPanel shared hosting)

The site is fully static — no database, no Node.js, no build step. It runs on any
Apache/cPanel host, including WebZim shared hosting.

## What to upload

Use the ready-made package **`dist/chengetai-website-webzim.zip`** (in this repository),
or upload these items from the repository root — **31 files in total**:

```
16 pages:   index.html  products.html  appstore.html  studio.html  cloud.html
            deploy.html  ai.html  solutions.html  research.html  pricing.html
            resources.html  about.html  contact.html  portal.html  admin.html
            404.html
1 config:   .htaccess          (hidden file — see note below!)
1 guide:    DEPLOY-WEBZIM.md   (this file; optional on the server)
13 assets:  assets/css/  (2)   assets/fonts/  (3)   assets/img/  (1)
            assets/js/   (7)
```

A `MANIFEST.txt` inside the zip lists every file — compare it against your
extracted folder if anything looks missing.

> ⚠️ **If the file count looks short after extracting:** `.htaccess` starts with
> a dot, so cPanel File Manager, Windows Explorer and macOS Finder hide it by
> default. In cPanel, open **Settings → Show Hidden Files (dotfiles)**. The site
> will load without it, but friendly URLs, caching and security headers won't
> work until it's there.

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
  arrive via the contact form ("Studio credits order") as the manual
  fallback. Grant 25 free credits to each new deployment key.
  **EcoCash checkout:** the Studio page sells packs directly via
  `POST /payments/ecocash` with `{pack, amount, currency:"USD", credits,
  phone}` (phone normalised to `2637[78]XXXXXXX`) → respond
  `{id, status:"pending"}` after triggering the EcoCash USSD push (via the
  EcoCash Open API or Paynow). The page then polls `GET /payments/:id`
  every 3 s for `status: pending | paid | failed` (include `reference` on
  paid, `message` on failed) and credits the account server-side on
  payment confirmation. Both endpoints need the site origins in CORS.
  **Receiving number:** all payments flow to the ChengetAiLabs EcoCash line
  **0784457922** (sent as `payee: "263784457922"` in the request); the manual
  path shows customers *151# → Send Money → 0784457922 and a WhatsApp link to
  send proof.
- **Messages via WhatsApp:** every contact-form submission opens WhatsApp with
  the composed message addressed to **+263 78 445 7922** — enquiries reach you
  with no email backend. The number also appears on the contact page and in
  the payment flows.
- **Key generator (admin):** after staff sign-in, `admin.html` is a PIN/key
  generator: it creates `CHG-XXXX-XXXX-XXXX` keys with crypto randomness,
  registers each via `POST /admin/keys` (`{key, label, credits}`, staff JWT
  required) so it activates immediately, keeps a local register with CSV
  export, and shares keys to customers over WhatsApp. If the endpoint isn't
  live the key is saved locally and clearly marked "Register on server" —
  a key only works once the API knows it.
- **Contact form:** the form currently shows a client-side confirmation. To receive
  real messages, point the form at a backend or a form service (e.g. add
  `action="https://formspree.io/f/yourid" method="POST"` to the form in
  `contact.html`), or wire it to your future ChengetAi API.
- **Portals:** `portal.html` and `admin.html` sign in against the live API
  (`POST /auth/login` with email/password). The customer portal then renders the
  account's real servers (`GET /servers`) and deployments (`GET /deployments`,
  optional). Nothing on the site is simulated data.
