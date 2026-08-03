/* ChengetAiLabs admin — deployment key (PIN) generator.
   Generates CHG-XXXX-XXXX-XXXX keys with crypto randomness, registers them
   on the API so they work immediately, keeps a local register of issued
   keys, and shares them to customers via WhatsApp. */
(function () {
  "use strict";

  var API = window.CHENGETAI_API || "https://api.chengetailabs.co.zw/api";
  var TOKEN_KEY = "chengetai_token";
  var STORE_KEY = "chengetai_issued_keys";

  var form = document.getElementById("key-form");
  var list = document.getElementById("key-list");
  if (!form || !list) return;

  var labelInput = document.getElementById("key-label");
  var creditsInput = document.getElementById("key-credits");
  var genBtn = document.getElementById("key-generate");
  var warnBox = document.getElementById("key-warn");
  var errEl = form.querySelector(".login-error");
  var emptyRow = document.getElementById("key-empty");

  function loadKeys() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveKeys(keys) { localStorage.setItem(STORE_KEY, JSON.stringify(keys)); }

  /* Unambiguous alphabet — no 0/O or 1/I confusion when read over the phone */
  var ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  function generatePin() {
    var bytes = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var chars = [];
    for (var i = 0; i < 12; i++) chars.push(ALPHABET[bytes[i] % ALPHABET.length]);
    return "CHG-" + chars.slice(0, 4).join("") + "-" + chars.slice(4, 8).join("") + "-" + chars.slice(8, 12).join("");
  }

  function waShareLink(entry) {
    var text = "Welcome to ChengetAiLabs! 🎉\n" +
      "Your deployment key for " + entry.label + ":\n\n" + entry.key + "\n\n" +
      "It unlocks ChengetAi Deploy and Studio (" + entry.credits + " starting credits). " +
      "Activate it at https://www.chengetailabs.co.zw/studio.html — keep it private.";
    return "https://wa.me/?text=" + encodeURIComponent(text);
  }

  function render() {
    var keys = loadKeys();
    list.querySelectorAll("tr:not(#key-empty)").forEach(function (tr) { tr.remove(); });
    emptyRow.style.display = keys.length ? "none" : "";
    keys.slice().reverse().forEach(function (entry) {
      var tr = document.createElement("tr");

      var tdLabel = document.createElement("td");
      tdLabel.textContent = entry.label;
      tr.appendChild(tdLabel);

      var tdKey = document.createElement("td");
      tdKey.className = "mono";
      tdKey.textContent = entry.key;
      tr.appendChild(tdKey);

      var tdCredits = document.createElement("td");
      tdCredits.textContent = entry.credits;
      tr.appendChild(tdCredits);

      var tdStatus = document.createElement("td");
      var st = document.createElement("span");
      st.className = "status " + (entry.registered ? "ok" : "warn");
      st.textContent = entry.registered ? "Active" : "Register on server";
      tdStatus.appendChild(st);
      tr.appendChild(tdStatus);

      var tdActions = document.createElement("td");
      tdActions.style.whiteSpace = "nowrap";

      var copy = document.createElement("button");
      copy.className = "btn btn-ghost btn-sm";
      copy.type = "button";
      copy.textContent = "Copy";
      copy.addEventListener("click", function () {
        navigator.clipboard && navigator.clipboard.writeText(entry.key);
        copy.textContent = "✓";
        setTimeout(function () { copy.textContent = "Copy"; }, 1200);
      });
      tdActions.appendChild(copy);

      var wa = document.createElement("a");
      wa.className = "btn btn-ghost btn-sm";
      wa.style.marginLeft = "6px";
      wa.href = waShareLink(entry);
      wa.target = "_blank";
      wa.rel = "noopener";
      wa.textContent = "WhatsApp";
      tdActions.appendChild(wa);

      var del = document.createElement("button");
      del.className = "btn btn-ghost btn-sm";
      del.style.marginLeft = "6px";
      del.type = "button";
      del.textContent = "✕";
      del.title = "Remove from this list (does not revoke on the server)";
      del.addEventListener("click", function () {
        saveKeys(loadKeys().filter(function (k) { return k.key !== entry.key; }));
        render();
      });
      tdActions.appendChild(del);

      tr.appendChild(tdActions);
      list.appendChild(tr);
    });
  }

  async function registerKey(entry) {
    var token = localStorage.getItem(TOKEN_KEY);
    var res = await fetch(API + "/admin/keys", {
      method: "POST",
      headers: (function () {
        var h = { "Content-Type": "application/json" };
        if (token) h.Authorization = "Bearer " + token;
        return h;
      })(),
      body: JSON.stringify({ key: entry.key, label: entry.label, credits: entry.credits })
    });
    if (!res.ok) {
      var data = null;
      try { data = await res.json(); } catch (_) {}
      var err = new Error((data && (data.message || data.error)) || "HTTP " + res.status);
      err.status = res.status;
      throw err;
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errEl.style.display = "none";
    warnBox.hidden = true;

    var entry = {
      key: generatePin(),
      label: labelInput.value.trim(),
      credits: Math.max(0, parseInt(creditsInput.value, 10) || 0),
      created: new Date().toISOString(),
      registered: false
    };

    genBtn.disabled = true;
    genBtn.textContent = "Generating…";
    try {
      await registerKey(entry);
      entry.registered = true;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        errEl.textContent = "Your admin session was rejected by the API — sign in again.";
        errEl.style.display = "block";
        genBtn.disabled = false;
        genBtn.textContent = "🔑 Generate Key";
        return;
      }
      warnBox.hidden = false; // endpoint missing or unreachable — key saved locally, inactive
    }

    var keys = loadKeys();
    keys.push(entry);
    saveKeys(keys);
    render();
    form.reset();
    creditsInput.value = "25";
    genBtn.disabled = false;
    genBtn.textContent = "🔑 Generate Key";
  });

  document.getElementById("key-export").addEventListener("click", function () {
    var keys = loadKeys();
    var rows = [["label", "key", "credits", "created", "registered"]].concat(
      keys.map(function (k) { return [k.label, k.key, k.credits, k.created, k.registered ? "yes" : "no"]; })
    );
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "chengetailabs-keys.csv";
    a.click();
  });

  render();
})();
