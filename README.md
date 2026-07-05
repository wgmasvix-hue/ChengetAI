# ChengetAi Labs — Website

**Building Africa's Intelligent Digital Infrastructure**
AI • Cloud • Digital Libraries • Education • Research • Agriculture • Enterprise Solutions

A fully static, self-contained website for ChengetAi Labs. No build step, no database,
no external requests — deployable on GitHub Pages, WebZim/cPanel shared hosting, or any
web server.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Homepage — animated connected-globe hero, ecosystem, industries |
| `products.html` | All six products: Cloud, Deploy, AI, Learn, Research, Agriculture |
| `cloud.html` | ChengetAi Cloud — dashboard showcase and capabilities |
| `deploy.html` | ChengetAi Deploy — **interactive deployment simulator** |
| `ai.html` | ChengetAi AI — assistants, RAG, chatbots, document intelligence |
| `solutions.html` | Industries: universities, polytechnics, government, libraries, agriculture |
| `research.html` | Whitepapers, open source, Innovation Lab |
| `pricing.html` | Starter / Professional / Enterprise / Managed Cloud + FAQ |
| `resources.html` | Docs, guides, tutorials, API documentation, knowledge base |
| `about.html` | Mission, core values, technology stack |
| `contact.html` | Contact form: support, sales, partnerships, demo requests |
| `portal.html` | Customer portal demo (sign in → dashboard) |
| `admin.html` | Administrator portal demo (fleet operations view) |

## Structure

```
assets/css/style.css   — design system (dark, green/gold African-tech brand)
assets/css/fonts.css   — self-hosted fonts (Inter, Sora, JetBrains Mono)
assets/fonts/          — woff2 variable fonts
assets/js/main.js      — nav, scroll reveal, tabs, forms
assets/js/globe.js     — animated hero globe (canvas)
assets/js/deploy.js    — deployment simulator
assets/js/portal.js    — portal demo sign-in flow
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
