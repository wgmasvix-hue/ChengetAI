/* ChengetAi Studio — code, image, full-stack and agent generation.
   Talks to the ChengetAi AI API; shares the deployment-key session with
   ChengetAi Deploy. No simulated output — real results or honest errors. */
(function () {
  "use strict";

  var API = window.CHENGETAI_API || "https://api.chengetailabs.co.zw/api";
  var TOKEN_KEY = "chengetai_token";
  var KEY_KEY = "chengetai_deploy_key";

  var COSTS = { code: 1, agent: 2, image: 5, fullstack: 10 };

  var STUDIOS = {
    code: {
      title: "💻 Code Studio", endpoint: "/ai/code", controls: ["ctl-language"],
      hint: 'e.g. "A Python function that validates Zimbabwean national ID numbers, with tests."',
      placeholder: "Describe the code you need…"
    },
    image: {
      title: "🎨 Image Studio", endpoint: "/ai/image", controls: ["ctl-size"],
      hint: 'e.g. "A flat illustration of a solar-powered rural library at sunset, green and gold palette."',
      placeholder: "Describe the picture you want to generate…"
    },
    fullstack: {
      title: "🏗 Full-Stack Studio", endpoint: "/ai/fullstack", controls: ["ctl-stack"],
      hint: 'e.g. "A clinic appointment booking app with patient sign-up, SMS reminders and an admin dashboard."',
      placeholder: "Describe the application to scaffold — features, users, data…"
    },
    agent: {
      title: "🤖 Agent Studio", endpoint: "/ai/agents", controls: ["ctl-agenttools"],
      hint: 'e.g. "An agent that watches our support inbox, drafts replies from the knowledge base and escalates billing issues."',
      placeholder: "Describe the agent — its goal, what it may do, and its limits…"
    }
  };
  var ALL_CONTROLS = ["ctl-language", "ctl-size", "ctl-stack", "ctl-agenttools"];

  var picker = document.getElementById("studio-picker");
  var runBtn = document.getElementById("studio-run");
  var promptEl = document.getElementById("studio-prompt");
  if (!picker || !runBtn || !promptEl) return;

  var titleEl = document.getElementById("studio-title");
  var hintEl = document.getElementById("studio-hint");
  var outWrap = document.getElementById("studio-output");
  var outFiles = document.getElementById("output-files");
  var outCode = document.getElementById("output-code");
  var outImage = document.getElementById("output-image");
  var copyBtn = document.getElementById("output-copy");
  var dlLink = document.getElementById("output-download");
  var notice = document.getElementById("studio-notice");
  var noticeText = document.getElementById("studio-notice-text");
  var authBox = document.getElementById("studio-auth");
  var keyForm = document.getElementById("studio-key-form");
  var keyLabel = document.getElementById("studio-key-label");

  var current = "code";

  /* ---------- Auth (shared with Deploy) ---------- */

  function getCredential() { return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(KEY_KEY); }
  function hasCredential() { return !!getCredential(); }

  function refreshKeyLabel() {
    keyLabel.textContent = hasCredential() ? "Key active" : "Activate key";
  }

  /* ---------- Credits ---------- */

  var creditsBox = document.getElementById("studio-credits");
  var creditsValue = document.getElementById("studio-credits-value");
  var costEl = document.getElementById("studio-cost");

  function showBalance(balance) {
    if (balance == null || isNaN(Number(balance))) return;
    creditsValue.textContent = Number(balance).toLocaleString();
    creditsBox.hidden = false;
  }

  async function loadCredits() {
    if (!hasCredential() || !creditsBox) return;
    try {
      var res = await fetch(API + "/ai/credits", {
        headers: { Authorization: "Bearer " + getCredential() }
      });
      if (!res.ok) return; // endpoint not live yet — keep the balance hidden
      var data = await res.json();
      showBalance(data && (data.balance != null ? data.balance : data.credits));
    } catch (e) { /* balance is optional */ }
  }

  async function activateKey(key) {
    key = key.trim();
    if (!key) throw new Error("Enter your deployment key.");
    try {
      var res = await fetch(API + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key, key: key })
      });
      var data = null;
      try { data = await res.json(); } catch (_) {}
      if (res.status === 401 || res.status === 403) {
        throw new Error("This deployment key was not accepted.");
      }
      var token = data && (data.token || data.accessToken || data.access_token);
      if (res.ok && token) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(KEY_KEY, key);
        return;
      }
    } catch (e) {
      if (e instanceof TypeError) throw new Error("Server unreachable — check your connection and try again.");
      if (e.message && e.message.indexOf("not accepted") !== -1) throw e;
      /* endpoint doesn't exchange keys — fall through to direct mode */
    }
    localStorage.setItem(KEY_KEY, key); // direct-key mode; the next request judges it
  }

  keyForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var errEl = keyForm.querySelector(".login-error");
    errEl.style.display = "none";
    try {
      await activateKey(document.getElementById("studio-key-input").value);
      authBox.hidden = true;
      refreshKeyLabel();
      loadCredits();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
    }
  });

  document.getElementById("studio-key-btn").addEventListener("click", function () {
    authBox.hidden = false;
    document.getElementById("studio-key-input").focus();
  });

  /* ---------- Studio switching ---------- */

  picker.querySelectorAll("[data-studio]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      picker.querySelectorAll("[data-studio]").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      current = btn.dataset.studio;
      var s = STUDIOS[current];
      titleEl.textContent = s.title;
      hintEl.textContent = s.hint;
      costEl.textContent = COSTS[current] + (COSTS[current] === 1 ? " credit" : " credits") + " / run";
      promptEl.placeholder = s.placeholder;
      ALL_CONTROLS.forEach(function (id) {
        document.getElementById(id).hidden = s.controls.indexOf(id) === -1;
      });
      outWrap.hidden = true;
      notice.hidden = true;
    });
  });

  /* ---------- Output rendering ---------- */

  function resetOutput() {
    outFiles.hidden = true; outFiles.innerHTML = "";
    outCode.hidden = true; outCode.textContent = "";
    outImage.hidden = true; outImage.removeAttribute("src");
    copyBtn.hidden = true; dlLink.hidden = true;
    outWrap.hidden = true;
  }

  function showText(text, downloadName) {
    outCode.textContent = text;
    outCode.hidden = false;
    copyBtn.hidden = false;
    copyBtn.onclick = function () {
      navigator.clipboard && navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied ✓";
      setTimeout(function () { copyBtn.textContent = "Copy output"; }, 1500);
    };
    if (downloadName) {
      dlLink.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      dlLink.download = downloadName;
      dlLink.textContent = "Download " + downloadName;
      dlLink.hidden = false;
    }
    outWrap.hidden = false;
  }

  function showFiles(files) {
    outFiles.innerHTML = "";
    outFiles.hidden = false;
    files.forEach(function (f, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = f.path || f.name || ("file-" + (i + 1));
      if (i === 0) b.classList.add("active");
      b.addEventListener("click", function () {
        outFiles.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        outCode.textContent = f.content || "";
      });
      outFiles.appendChild(b);
    });
    outCode.textContent = files[0].content || "";
    outCode.hidden = false;
    copyBtn.hidden = false;
    copyBtn.onclick = function () {
      var active = outFiles.querySelector("button.active");
      navigator.clipboard && navigator.clipboard.writeText(outCode.textContent);
      copyBtn.textContent = "Copied ✓";
      setTimeout(function () { copyBtn.textContent = "Copy output"; }, 1500);
    };
    outWrap.hidden = false;
  }

  function showImage(src) {
    outImage.src = src;
    outImage.hidden = false;
    dlLink.href = src;
    dlLink.download = "chengetai-image.png";
    dlLink.textContent = "Download image";
    dlLink.hidden = false;
    outWrap.hidden = false;
  }

  function showNotice(html) {
    noticeText.innerHTML = html;
    notice.hidden = false;
  }

  /* ---------- Run ---------- */

  runBtn.addEventListener("click", async function () {
    var prompt = promptEl.value.trim();
    notice.hidden = true;
    if (!prompt) { showNotice("Type a prompt first — describe what you want to build."); return; }
    if (!hasCredential()) { authBox.hidden = false; document.getElementById("studio-key-input").focus(); return; }

    var s = STUDIOS[current];
    var body = { prompt: prompt };
    if (current === "code") body.language = document.getElementById("ctl-language").value;
    if (current === "image") body.size = document.getElementById("ctl-size").value;
    if (current === "fullstack") body.stack = document.getElementById("ctl-stack").value;
    if (current === "agent") body.tools = document.getElementById("ctl-agenttools").value;

    resetOutput();
    runBtn.disabled = true;
    runBtn.textContent = "⏳ Generating…";
    try {
      var res = await fetch(API + s.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + getCredential() },
        body: JSON.stringify(body)
      });
      var data = null;
      try { data = await res.json(); } catch (_) {}

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        authBox.hidden = false;
        showNotice((data && (data.message || data.error)) || "Your session expired — activate your deployment key again.");
        return;
      }
      if (res.status === 402) {
        showNotice('Not enough credits for this run (' + COSTS[current] + ' needed). <a href="#credits" style="color:var(--green); font-weight:600;">Top up your credits →</a>');
        loadCredits();
        return;
      }
      if (res.status === 404 || res.status === 405) {
        showNotice('This studio\'s backend isn\'t live yet — Studio is rolling out. <a href="contact.html?enquiry=app&app=ChengetAi+Studio#demo" style="color:var(--green);">Join the early-access list →</a>');
        return;
      }
      if (!res.ok) {
        showNotice((data && (data.message || data.error)) || "Generation failed (HTTP " + res.status + "). Please try again.");
        return;
      }

      if (data && (data.credits != null || data.creditsRemaining != null || data.balance != null)) {
        showBalance(data.credits != null ? data.credits : (data.creditsRemaining != null ? data.creditsRemaining : data.balance));
      } else {
        loadCredits();
      }

      if (current === "image") {
        var img = data && (data.imageUrl || data.image_url || data.url ||
          (data.b64 ? "data:image/png;base64," + data.b64 : null) ||
          (data.image && data.image.indexOf("data:") === 0 ? data.image : null));
        if (img) showImage(img);
        else showNotice("The API responded but returned no image data.");
        return;
      }

      var files = data && (data.files || (data.project && data.project.files));
      if (Array.isArray(files) && files.length) { showFiles(files); return; }

      var text = data && (data.code || data.output || data.text || data.result ||
        (data.agent && (typeof data.agent === "string" ? data.agent : JSON.stringify(data.agent, null, 2))));
      if (text) {
        var names = { code: "generated." + ({Python:"py",JavaScript:"js",TypeScript:"ts",Go:"go",Java:"java",PHP:"php",SQL:"sql",Bash:"sh"}[body.language] || "txt"),
                      fullstack: "project.txt", agent: "agent.yaml" };
        showText(typeof text === "string" ? text : JSON.stringify(text, null, 2), names[current]);
      } else {
        showNotice("The API responded but returned no output.");
      }
    } catch (e) {
      showNotice('Server unreachable — check your connection, or <a href="contact.html?enquiry=app&app=ChengetAi+Studio#demo" style="color:var(--green);">contact us about Studio access</a>.');
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = "▶ Run";
    }
  });

  refreshKeyLabel();
  loadCredits();
})();
