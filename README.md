# ChengetAi Labs — Website

**Building Africa's Intelligent Digital Infrastructure**
AI • Cloud • Digital Libraries • Education • Research • Agriculture • Enterprise Solutions

The production website for ChengetAi Labs, live at **https://www.chengetailabs.co.zw**.
Fully static and self-contained — no build step, no database — deployable on
WebZim/cPanel shared hosting, GitHub Pages, or any web server. The Deploy page
integrates with the live ChengetAi Deploy API at `https://api.chengetailabs.co.zw`
(JWT auth, real deployment jobs with polled logs).

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Homepage — animated connected-globe hero, ecosystem, industries |
| `products.html` | All seven products: Cloud, Deploy, Dare, AI, Learn, Research, Agriculture |
| `appstore.html` | **ChengetAi Store** — SkillMatch featured, searchable catalogue, community APK listings + developer submissions |
| `studio.html` | **ChengetAi Studio** — free-trial sign-up (25 credits), credit-metered AI workspace: code, image, full-stack, agents |
| `cloud.html` | ChengetAi Cloud — dashboard showcase and capabilities |
| `deploy.html` | ChengetAi Deploy — **live deployments via the API** (key-gated) |
| `ai.html` | ChengetAi AI — assistants, RAG, chatbots, document intelligence |
| `solutions.html` | Industries: universities, polytechnics, government, libraries, agriculture |
| `research.html` | Research agenda, open source, Innovation Lab |
| `pricing.html` | Starter / Professional / Enterprise / Managed Cloud + FAQ |
| `resources.html` | Docs, guides, tutorials, API documentation, knowledge base |
| `about.html` | Mission, core values, technology stack |
| `contact.html` | Contact form: support, sales, partnerships, demo requests |
| `portal.html` | Customer portal — real API sign-in, live server & deployment data |
| `admin.html` | Administrator sign-in + deployment-key (PIN) generator |

## Structure

```
assets/css/style.css   — design system (dark, green/gold African-tech brand)
assets/css/fonts.css   — self-hosted fonts (Inter, Sora, JetBrains Mono)
assets/fonts/          — woff2 variable fonts
assets/js/main.js      — nav, scroll reveal, tabs, forms
assets/js/globe.js     — animated hero globe (canvas)
assets/js/deploy.js    — live deployment client (JWT/key auth, job polling)
assets/js/portal.js    — portal sign-in + live data from the API
assets/img/logo.svg    — brand mark (gradient shield, rim light + AI spark)
assets/js/store.js     — community APK listings + submissions (API-backed)
assets/js/studio.js    — Studio: code/image/full-stack/agent generation client
assets/js/payments.js  — EcoCash checkout (pays to 0784457922)
assets/js/keys.js      — admin PIN/key generator with WhatsApp delivery
.htaccess              — Apache config: friendly URLs, caching, security headers
404.html               — branded error page
```

## Deployment

- **GitHub Pages** — already wired: pushing to `main` triggers the Pages workflow.
- **WebZim / cPanel** — upload and extract `dist/chengetai-website-webzim.zip` into
  `public_html`. Full instructions in [`DEPLOY-WEBZIM.md`](DEPLOY-WEBZIM.md).
- **Anywhere else** — copy the HTML files and `assets/` to any web root.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
