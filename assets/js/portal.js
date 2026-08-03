/* ChengetAi portals — real sign-in against the ChengetAi Cloud API.
   The customer portal renders live server and deployment data after login;
   nothing shown here is simulated. */
(function () {
  "use strict";

  var API = window.CHENGETAI_API || "https://api.chengetailabs.co.zw/api";
  var TOKEN_KEY = "chengetai_token";

  var login = document.getElementById("portal-login");
  var auth = document.getElementById("portal-auth");
  var dash = document.getElementById("portal-dash");
  var logout = document.getElementById("portal-logout");
  var userEl = document.getElementById("portal-user");
  var serversBody = document.getElementById("p-servers");       // customer portal only
  var deploymentsWin = document.getElementById("deployments");  // customer portal only
  var deploymentsBody = document.getElementById("p-deployments");
  if (!login || !auth || !dash) return;

  var errEl = login.querySelector(".login-error");
  var submitBtn = login.querySelector('button[type="submit"]');

  function showError(msg) {
    errEl.textContent = msg;
    errEl.style.display = "block";
  }

  async function apiRequest(path, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json" };
    var token = localStorage.getItem(TOKEN_KEY);
    if (token && opts.auth !== false) headers.Authorization = "Bearer " + token;
    var res;
    try {
      res = await fetch(API + path, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) {
      throw new Error("Server unreachable — check your connection and try again.");
    }
    var data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok) {
      var msg = (data && (data.message || data.error)) || ("Request failed (HTTP " + res.status + ")");
      var err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function extractToken(data) {
    if (!data) return null;
    return data.token || data.accessToken || data.access_token ||
      (data.data && extractToken(data.data)) || (data.user && data.user.token) || null;
  }

  function cell(text) {
    var td = document.createElement("td");
    td.textContent = text == null ? "—" : String(text);
    return td;
  }

  function renderServers(list) {
    if (!serversBody) return;
    serversBody.innerHTML = "";
    if (!Array.isArray(list) || !list.length) {
      var tr = document.createElement("tr");
      var td = cell("No servers yet — rent your first server to get started.");
      td.colSpan = 4;
      td.style.color = "var(--text-dim)";
      tr.appendChild(td);
      serversBody.appendChild(tr);
      return;
    }
    list.forEach(function (s) {
      var tr = document.createElement("tr");
      var name = cell(s.name || s.hostname || s.id);
      name.className = "mono";
      tr.appendChild(name);
      tr.appendChild(cell(s.specs || s.plan));
      tr.appendChild(cell(s.region || s.location));
      var st = document.createElement("td");
      var status = String(s.status || "active").toLowerCase();
      var span = document.createElement("span");
      span.className = "status " + (/(healthy|active|running|ok)/.test(status) ? "ok" : /(degraded|warn|pending)/.test(status) ? "warn" : "off");
      span.textContent = s.status || "active";
      st.appendChild(span);
      tr.appendChild(st);
      serversBody.appendChild(tr);
    });
  }

  function renderDeployments(list) {
    if (!deploymentsWin || !deploymentsBody || !Array.isArray(list) || !list.length) return;
    deploymentsBody.innerHTML = "";
    list.forEach(function (d) {
      var tr = document.createElement("tr");
      var id = cell(d.id || d.jobId);
      id.className = "mono";
      tr.appendChild(id);
      tr.appendChild(cell(d.platform || d.application));
      var st = document.createElement("td");
      var status = String(d.status || "").toLowerCase();
      var span = document.createElement("span");
      span.className = "status " + (/(complete|success|done)/.test(status) ? "ok" : /(fail|error|cancel)/.test(status) ? "off" : "run");
      span.textContent = d.status || "running";
      st.appendChild(span);
      tr.appendChild(st);
      deploymentsBody.appendChild(tr);
    });
    deploymentsWin.hidden = false;
  }

  async function loadDashboard() {
    if (!serversBody) return; // admin page has no data widgets
    try {
      var data = await apiRequest("/servers");
      renderServers((data && (data.servers || data.data)) || data || []);
    } catch (e) {
      renderServers([]);
      serversBody.firstChild.firstChild.textContent =
        "Couldn't load servers: " + e.message;
    }
    try {
      var deps = await apiRequest("/deployments");
      renderDeployments((deps && (deps.deployments || deps.jobs || deps.data)) || deps || []);
    } catch (e) { /* endpoint optional — section stays hidden */ }
  }

  function enterDashboard(email) {
    if (userEl && email) {
      var name = email.split("@")[0].replace(/[._-]+/g, " ")
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      userEl.textContent = ", " + name;
    }
    auth.hidden = true;
    dash.hidden = false;
    window.scrollTo({ top: 0 });
    loadDashboard();
  }

  login.addEventListener("submit", async function (e) {
    e.preventDefault();
    errEl.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";
    var email = login.querySelector('input[type="email"]').value.trim();
    var password = login.querySelector('input[type="password"]').value;
    try {
      var data = await apiRequest("/auth/login", {
        method: "POST",
        body: { email: email, password: password },
        auth: false
      });
      var token = extractToken(data);
      if (!token) throw new Error("Sign-in succeeded but no session token was returned.");
      localStorage.setItem(TOKEN_KEY, token);
      enterDashboard(email);
    } catch (err) {
      showError(err.message || "Sign-in failed. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  });

  if (logout) {
    logout.addEventListener("click", function () {
      localStorage.removeItem(TOKEN_KEY);
      dash.hidden = true;
      auth.hidden = false;
      login.reset();
      window.scrollTo({ top: 0 });
    });
  }

  /* Sidebar link highlighting (in-page anchors only) */
  document.querySelectorAll(".portal-side a[href^='#']").forEach(function (a) {
    a.addEventListener("click", function () {
      document.querySelectorAll(".portal-side a").forEach(function (b) { b.classList.remove("active"); });
      a.classList.add("active");
    });
  });
})();
