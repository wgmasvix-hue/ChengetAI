/* ChengetAi Store — community mobile apps (APKs).
   Lists published apps from the API and handles developer submissions.
   No simulated data: real listings when the API provides them, honest
   empty states when it doesn't. */
(function () {
  "use strict";

  var API = window.CHENGETAI_API || "https://api.chengetailabs.co.zw/api";
  var MAX_APK_BYTES = 100 * 1024 * 1024; // 100 MB

  /* ---------- Community app listings ---------- */

  var grid = document.getElementById("community-grid");
  var emptyCard = document.getElementById("community-empty");

  function setEmptyState(title, text) {
    if (!emptyCard) return;
    emptyCard.querySelector("h3").textContent = title;
    emptyCard.querySelector("p").textContent = text;
  }

  function esc(s) { return String(s == null ? "" : s); }

  function renderApps(apps) {
    if (!grid) return;
    if (!Array.isArray(apps) || !apps.length) {
      setEmptyState("No community apps yet",
        "The store just opened — be the first African developer to publish here. Submit your APK below.");
      return;
    }
    grid.innerHTML = "";
    apps.forEach(function (app) {
      var card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "default";

      var icon = document.createElement("div");
      icon.className = "card-icon";
      icon.textContent = "📱";
      card.appendChild(icon);

      var h3 = document.createElement("h3");
      h3.textContent = esc(app.name || app.title);
      card.appendChild(h3);

      var meta = document.createElement("p");
      meta.style.cssText = "font-size:0.78rem; color:var(--text-dim); margin-bottom:6px;";
      meta.textContent = [esc(app.developer || app.author), esc(app.category), app.version ? "v" + esc(app.version) : ""]
        .filter(Boolean).join(" · ");
      card.appendChild(meta);

      var desc = document.createElement("p");
      desc.textContent = esc(app.description || "");
      card.appendChild(desc);

      var url = app.downloadUrl || app.download_url || app.apkUrl || app.apk_url || app.url;
      if (url) {
        var a = document.createElement("a");
        a.className = "card-link";
        a.href = url;
        a.textContent = "⬇ Download APK →";
        a.setAttribute("rel", "noopener");
        card.appendChild(a);
      }
      grid.appendChild(card);
    });
  }

  async function loadCommunityApps() {
    if (!grid) return;
    try {
      var res = await fetch(API + "/store/apps", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      renderApps((data && (data.apps || data.data)) || data || []);
    } catch (e) {
      setEmptyState("Community apps are coming",
        "The mobile app catalogue launches soon. Developers — submit your APK below to be listed at launch.");
    }
  }

  /* ---------- APK submission ---------- */

  var form = document.getElementById("apk-form");
  if (form) {
    var btn = document.getElementById("apk-btn");
    var okBox = document.getElementById("apk-success");
    var okText = document.getElementById("apk-success-text");
    var fallback = document.getElementById("apk-fallback");
    var errEl = form.querySelector(".login-error");

    function showErr(msg) { errEl.textContent = msg; errEl.style.display = "block"; }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      errEl.style.display = "none";
      okBox.hidden = true;
      fallback.hidden = true;

      var file = document.getElementById("apk-file").files[0] || null;
      var url = document.getElementById("apk-url").value.trim();
      if (!file && !url) {
        return showErr("Attach an .apk file or provide a download URL.");
      }
      if (file && file.size > MAX_APK_BYTES) {
        return showErr("APK is larger than 100 MB — host it elsewhere and submit the download URL instead.");
      }
      if (file && !/\.apk$/i.test(file.name)) {
        return showErr("The attached file must be an .apk package.");
      }

      var fd = new FormData();
      fd.append("name", document.getElementById("apk-name").value.trim());
      fd.append("developer", document.getElementById("apk-dev").value.trim());
      fd.append("email", document.getElementById("apk-email").value.trim());
      fd.append("category", document.getElementById("apk-cat").value);
      fd.append("description", document.getElementById("apk-desc").value.trim());
      if (url) fd.append("apkUrl", url);
      if (file) fd.append("apk", file, file.name);

      btn.disabled = true;
      btn.textContent = file ? "⏳ Uploading…" : "⏳ Submitting…";
      try {
        var res = await fetch(API + "/store/submissions", { method: "POST", body: fd });
        var data = null;
        try { data = await res.json(); } catch (_) { /* non-JSON */ }
        if (!res.ok) {
          if (res.status === 404 || res.status === 405) {
            fallback.hidden = false; // API live but submissions endpoint not deployed yet
          } else {
            showErr((data && (data.message || data.error)) || "Submission failed (HTTP " + res.status + "). Please try again.");
          }
          return;
        }
        var ref = (data && (data.id || data.reference || data.submissionId)) || null;
        okText.textContent = "Submission received" + (ref ? " (ref " + ref + ")" : "") +
          " — we'll review your app and email you at the address provided.";
        okBox.hidden = false;
        form.reset();
      } catch (e2) {
        fallback.hidden = false; // network failure — offer the manual path
      } finally {
        btn.disabled = false;
        btn.textContent = "📤 Submit for Review";
      }
    });
  }

  loadCommunityApps();
})();
