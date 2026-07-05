/* ChengetAi Deploy — production frontend for the ChengetAi Deploy API.
 *
 * Talks to the live backend (JWT auth, job polling); no simulated output.
 * Structure:
 *   1. Config            5. Deployment API (create / poll jobs)
 *   2. Console rendering 6. Server discovery
 *   3. Auth (JWT)        7. UI wiring (form, button states, result banner)
 *   4. API client
 */
(function () {
  "use strict";

  /* ---------- 1. Config ---------- */

  var API = window.CHENGETAI_API || "https://api.chengetailabs.co.zw/api";
  var TOKEN_KEY = "chengetai_token";
  var POLL_INTERVAL_MS = 2000;
  var POLL_TIMEOUT_MS = 15 * 60 * 1000; // give up on a job after 15 minutes

  // Defaults, overridden by backend route discovery when available.
  var ROUTES = {
    login: "/auth/login",
    deployments: "/deployments",
    job: function (id) { return ROUTES.deployments + "/" + encodeURIComponent(id); },
    servers: "/servers"
  };

  var form = document.getElementById("deploy-form");
  var consoleEl = document.getElementById("deploy-console");
  var deployBtn = document.getElementById("deploy-btn");
  var resultBox = document.getElementById("deploy-result");
  var resultText = document.getElementById("deploy-result-text");
  var serverSelect = document.getElementById("dep-server");
  if (!form || !consoleEl || !deployBtn) return;

  /* ---------- 2. Console rendering ---------- */

  var consoleUI = {
    clear: function () { consoleEl.innerHTML = ""; },
    line: function (text, cls) {
      var div = document.createElement("div");
      div.className = "ln " + (cls || "");
      div.textContent = text;
      consoleEl.appendChild(div);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    },
    error: function (text) { this.line("✖ " + text, "err"); },
    info: function (text) { this.line(text, "info"); }
  };

  /* ---------- 3. Auth ---------- */

  /* Access is gated by a dedicated deployment key issued by ChengetAi Labs.
     The key is exchanged at the login endpoint for a JWT; if the backend
     accepts keys directly, the key itself is used as the bearer credential. */

  var KEY_KEY = "chengetai_deploy_key";

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function getKey() { return localStorage.getItem(KEY_KEY); }
  function setKey(k) { localStorage.setItem(KEY_KEY, k); }
  function clearCredentials() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(KEY_KEY);
  }

  // The bearer credential: a JWT from key exchange, or the raw key itself.
  function getCredential() { return getToken() || getKey(); }

  // Proactively treat an expired JWT as absent (exp claim, if present).
  function credentialIsValid() {
    var t = getToken();
    if (t) {
      try {
        var payload = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload.exp && payload.exp * 1000 < Date.now() + 30000) {
          localStorage.removeItem(TOKEN_KEY);
          return !!getKey(); // JWT expired — re-exchange happens via the key panel
        }
      } catch (e) { /* opaque token — let the server judge it */ }
      return true;
    }
    return !!getKey();
  }

  function extractToken(data) {
    if (!data) return null;
    return data.token || data.accessToken || data.access_token ||
      (data.data && extractToken(data.data)) || (data.user && data.user.token) || null;
  }

  /* Activate a dedicated deployment key.
     1) Try exchanging it for a JWT at the login endpoint.
     2) If the endpoint doesn't support key exchange, use the key directly
        as the bearer credential and validate it with an authenticated call. */
  async function activateKey(key) {
    key = key.trim();
    if (!key) throw ApiError("Enter your deployment key.");
    try {
      var data = await apiRequest(ROUTES.login, {
        method: "POST",
        body: { apiKey: key, key: key },
        auth: false
      });
      var token = extractToken(data);
      if (token) { setToken(token); setKey(key); return; }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        throw ApiError("This deployment key was not accepted. Check the key or contact ChengetAi Labs.", e.status);
      }
      if (e instanceof ApiError && e.status === 0) throw e; // network failure
      /* 400/404/405/422 → endpoint doesn't do key exchange; fall through */
    }
    // Direct-key mode: validate the key against an authenticated endpoint.
    setKey(key);
    try {
      await apiRequest(ROUTES.servers);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        clearCredentials();
        throw ApiError("This deployment key was not accepted. Check the key or contact ChengetAi Labs.", e.status);
      }
      if (e instanceof ApiError && e.status === 0) { clearCredentials(); throw e; }
      /* endpoint missing (404 etc.) — accept the key; the deploy call will judge it */
    }
  }

  /* Inline login panel — shown whenever a request needs (re)authentication.
     Injected by JS so deploy.html stays untouched. */
  var loginPanel = null;
  var pendingLogin = null;

  function buildLoginPanel() {
    var panel = document.createElement("div");
    panel.id = "deploy-login";
    panel.className = "card";
    panel.style.cssText = "margin-bottom:16px; cursor:default;";
    panel.innerHTML =
      '<h3 style="margin-top:0;">Deployment key required</h3>' +
      '<p style="font-size:0.87rem;">Deployments require a dedicated key issued by ChengetAi Labs. ' +
      'Don’t have one? <a href="contact.html" style="color:var(--green);">Request a deployment key →</a></p>' +
      '<form class="form-grid" style="margin-top:14px;">' +
      '  <div class="field"><label for="dl-key">Deployment Key</label>' +
      '    <input id="dl-key" type="password" autocomplete="off" spellcheck="false" ' +
      '      placeholder="e.g. CHG-XXXX-XXXX-XXXX" required></div>' +
      '  <button type="submit" class="btn btn-primary">Activate Key</button>' +
      '  <p class="login-error" style="display:none; color:#f87171; font-size:0.85rem;"></p>' +
      "</form>";
    consoleEl.parentNode.insertBefore(panel, consoleEl);

    panel.querySelector("form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var errEl = panel.querySelector(".login-error");
      var btn = panel.querySelector("button");
      errEl.style.display = "none";
      btn.disabled = true;
      btn.textContent = "Verifying key…";
      try {
        await activateKey(panel.querySelector("#dl-key").value);
        hideLogin();
        loadServers();
        if (pendingLogin) { var r = pendingLogin; pendingLogin = null; r(); }
      } catch (err) {
        errEl.textContent = err instanceof ApiError ? err.message : "Key activation failed. Please try again.";
        errEl.style.display = "block";
      } finally {
        btn.disabled = false;
        btn.textContent = "Activate Key";
      }
    });
    return panel;
  }

  function showLogin() {
    if (!loginPanel) loginPanel = buildLoginPanel();
    loginPanel.hidden = false;
    loginPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    loginPanel.querySelector("#dl-key").focus();
  }

  function hideLogin() { if (loginPanel) loginPanel.hidden = true; }

  // Resolves once a usable credential exists. Reuses a valid JWT; silently
  // re-exchanges the stored deployment key when the JWT has expired; only
  // prompts when there is no key or the key is rejected.
  async function ensureAuth() {
    if (getToken() && credentialIsValid()) return;
    var key = getKey();
    if (key) {
      try { await activateKey(key); return; }
      catch (e) { clearCredentials(); }
    }
    return new Promise(function (resolve) {
      pendingLogin = resolve;
      showLogin();
    });
  }

  /* ---------- 4. API client ---------- */

  function ApiError(message, status) {
    var e = Object.create(ApiError.prototype);
    e.message = message;
    e.status = status || 0;
    return e;
  }
  ApiError.prototype = Object.create(Error.prototype);

  async function apiRequest(path, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json" };
    if (opts.auth !== false) {
      // The credential (JWT or raw deployment key) always travels as the
      // bearer token — custom headers would trigger stricter CORS preflights.
      var cred = getCredential();
      if (cred) headers.Authorization = "Bearer " + cred;
    }

    var res;
    try {
      res = await fetch(API + path, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) {
      throw ApiError("Server unreachable — check your connection and try again.");
    }

    var data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON body */ }

    if (res.status === 401 || res.status === 403) {
      // Drop only the JWT — ensureAuth will silently re-exchange the stored
      // key, and clears it too if the key itself has been revoked.
      localStorage.removeItem(TOKEN_KEY);
      var authMsg = (data && (data.message || data.error)) ||
        (res.status === 401
          ? "Authentication failed — please sign in again."
          : "You don't have permission to perform this action.");
      throw ApiError(authMsg, res.status);
    }
    if (!res.ok) {
      var msg = (data && (data.message || data.error || (data.errors && JSON.stringify(data.errors)))) ||
        ("Request failed (HTTP " + res.status + ")");
      throw ApiError(msg, res.status);
    }
    return data;
  }

  // Run an authenticated action; on 401/403 send the user back through
  // login once and retry.
  async function withAuth(action) {
    await ensureAuth();
    try {
      return await action();
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        consoleUI.error(e.message);
        await ensureAuth();
        return await action();
      }
      throw e;
    }
  }

  /* Route discovery: if the API describes its routes at the root, prefer
     those paths over our defaults. Silently keeps defaults otherwise. */
  async function discoverRoutes() {
    try {
      var data = await apiRequest("/", { auth: false });
      var src = (data && (data.routes || data.endpoints || data.links)) || data;
      if (!src || typeof src !== "object") return;
      var pick = function (keys) {
        for (var i = 0; i < keys.length; i++) {
          var v = src[keys[i]];
          if (typeof v === "string" && v.charAt(0) === "/") return v.replace(/^\/api(?=\/)/, "");
        }
        return null;
      };
      ROUTES.login = pick(["login", "auth"]) || ROUTES.login;
      ROUTES.deployments = pick(["deployments", "deploy", "deployment"]) || ROUTES.deployments;
      ROUTES.servers = pick(["servers", "server"]) || ROUTES.servers;
      var jobs = pick(["jobs", "job"]);
      if (jobs) ROUTES.job = function (id) { return jobs + "/" + encodeURIComponent(id); };
    } catch (e) { /* discovery is best-effort */ }
  }

  /* ---------- 5. Deployment API ---------- */

  function pickJobId(data) {
    if (!data) return null;
    return data.jobId || data.job_id || data.id ||
      (data.job && pickJobId(data.job)) || (data.data && pickJobId(data.data)) ||
      (data.deployment && pickJobId(data.deployment)) || null;
  }

  function normalizeJob(data) {
    var job = (data && (data.job || data.deployment || data.data)) || data || {};
    var logs = job.logs || job.output || job.lines || [];
    if (typeof logs === "string") logs = logs.split("\n");
    return {
      status: String(job.status || job.state || "running").toLowerCase(),
      logs: logs,
      url: job.url || job.siteUrl || job.site_url || null,
      duration: job.duration || job.durationSeconds || job.duration_seconds || null,
      startedAt: job.startedAt || job.started_at || job.createdAt || job.created_at || null,
      finishedAt: job.finishedAt || job.finished_at || job.completedAt || job.completed_at || null,
      error: job.error || job.errorMessage || job.failureReason || null
    };
  }

  function createDeployment(payload) {
    return apiRequest(ROUTES.deployments, { method: "POST", body: payload });
  }

  var DONE = { completed: 1, complete: 1, success: 1, succeeded: 1, finished: 1, done: 1 };
  var FAILED = { failed: 1, error: 1, cancelled: 1, canceled: 1, timeout: 1 };

  // Poll the job endpoint until it reaches a terminal state, appending only
  // log lines not yet rendered.
  function pollJob(jobId) {
    return new Promise(function (resolve, reject) {
      var rendered = 0;
      var startedAt = Date.now();
      var consecutiveFailures = 0;

      var timer = setInterval(async function () {
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          clearInterval(timer);
          return reject(ApiError("Deployment is taking too long — check the portal for its final status."));
        }
        var job;
        try {
          job = normalizeJob(await apiRequest(ROUTES.job(jobId)));
          consecutiveFailures = 0;
        } catch (e) {
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            clearInterval(timer);
            return reject(e);
          }
          if (++consecutiveFailures >= 5) {
            clearInterval(timer);
            return reject(e);
          }
          return; // transient — try again on the next tick
        }

        for (; rendered < job.logs.length; rendered++) {
          var lineText = String(job.logs[rendered]);
          consoleUI.line(lineText, /error|failed|✖/i.test(lineText) ? "err" : "ok");
        }

        if (DONE[job.status]) { clearInterval(timer); resolve(job); }
        else if (FAILED[job.status]) {
          clearInterval(timer);
          reject(ApiError("Deployment failed" + (job.error ? ": " + job.error : ".")));
        }
      }, POLL_INTERVAL_MS);
    });
  }

  /* ---------- 6. Server discovery ---------- */

  async function loadServers() {
    if (!serverSelect) return;
    try {
      var data = await withAuthSilent(function () { return apiRequest(ROUTES.servers); });
      var servers = (data && (data.servers || data.data || data)) || [];
      if (!Array.isArray(servers) || !servers.length) return;
      serverSelect.innerHTML = "";
      servers.forEach(function (s) {
        var opt = document.createElement("option");
        var name = s.name || s.hostname || s.id || String(s);
        var spec = [s.specs || s.plan, s.region || s.location].filter(Boolean).join(" · ");
        opt.value = s.id || name;
        opt.textContent = spec ? name + " · " + spec : name;
        serverSelect.appendChild(opt);
      });
    } catch (e) { /* keep the hardcoded options on any failure */ }
  }

  // Like withAuth but never prompts — used for optional startup calls.
  async function withAuthSilent(action) {
    if (!credentialIsValid()) throw ApiError("No deployment key", 401);
    return action();
  }

  /* ---------- 7. UI wiring ---------- */

  function setDeploying(active) {
    deployBtn.disabled = active;
    deployBtn.textContent = active ? "⏳ Deploying…" : "🚀 Deploy";
  }

  function formatDuration(job) {
    var seconds = null;
    if (job.duration != null) seconds = Number(job.duration);
    else if (job.startedAt && job.finishedAt) {
      seconds = Math.round((new Date(job.finishedAt) - new Date(job.startedAt)) / 1000);
    }
    if (seconds == null || isNaN(seconds) || seconds < 0) return null;
    return Math.floor(seconds / 60) + "m " + Math.round(seconds % 60) + "s";
  }

  function showResult(job, platform, institution) {
    var parts = [platform + " for " + institution + " deployed successfully"];
    var dur = formatDuration(job);
    if (dur) parts.push("in " + dur);
    var text = parts.join(" ") + ".";
    if (job.url) text += " Live at " + job.url + ".";
    resultText.textContent = text;
    resultBox.hidden = false;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var platform = form.querySelector('input[name="platform"]:checked').value;
    var institution = document.getElementById("dep-inst").value.trim();
    if (!institution) return;
    var server = serverSelect ? serverSelect.value : null;

    resultBox.hidden = true;
    setDeploying(true);

    try {
      await withAuth(async function () {
        consoleUI.clear();
        consoleUI.info("→ Requesting " + platform + " deployment for \"" + institution + "\"…");

        var created = await createDeployment({
          platform: platform.toLowerCase(),
          institution: institution,
          server: server
        });
        var jobId = pickJobId(created);
        if (!jobId) throw ApiError("The API accepted the request but returned no job ID.");

        consoleUI.line("  Job " + jobId + " created — streaming logs…", "dim");
        var job = await pollJob(jobId);
        consoleUI.info("Deployment completed ✔");
        showResult(job, platform, institution);
      });
    } catch (err) {
      consoleUI.error(err instanceof ApiError ? err.message : "Unexpected error: " + err.message);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) showLogin();
    } finally {
      setDeploying(false);
    }
  });

  /* ---------- Startup ---------- */

  (async function init() {
    await discoverRoutes();
    if (credentialIsValid()) {
      consoleUI.line("Deployment key active — select a platform and press Deploy.", "dim");
      loadServers();
    } else {
      consoleUI.line("Awaiting deployment… a dedicated deployment key is required to deploy.", "dim");
    }
  })();
})();
