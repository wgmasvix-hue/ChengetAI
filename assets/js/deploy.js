/* ChengetAi Deploy — simulated deployment console */
(function () {
  "use strict";

  var form = document.getElementById("deploy-form");
  var out = document.getElementById("deploy-console");
  var btn = document.getElementById("deploy-btn");
  var result = document.getElementById("deploy-result");
  var resultText = document.getElementById("deploy-result-text");
  if (!form || !out) return;

  var STACKS = {
    DSpace: ["PostgreSQL 16 configured", "Solr index initialised", "DSpace 8 backend deployed", "Angular frontend built", "OAI-PMH + handle server enabled"],
    Koha: ["MariaDB 11 configured", "Koha 24.05 installed", "Zebra search indexed", "SIP2 + Z39.50 enabled", "Staff & OPAC interfaces themed"],
    Moodle: ["PostgreSQL 16 configured", "Moodle 4.5 installed", "Redis session cache enabled", "Cron & backup schedule set", "Theme and SSO configured"],
    OJS: ["MariaDB 11 configured", "OJS 3.4 installed", "PHP-FPM tuned", "Crossref/DOI plugin enabled", "Editorial workflow initialised"],
    Nextcloud: ["PostgreSQL 16 configured", "Nextcloud 30 installed", "Object storage attached", "Office integration enabled", "Client sync endpoints ready"],
    WordPress: ["MariaDB 11 configured", "WordPress installed", "Caching + WAF rules applied", "Automatic updates enabled", "Starter theme activated"]
  };

  function slugify(s) {
    return (s || "institution").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "institution";
  }

  function line(text, cls, delay) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var div = document.createElement("div");
        div.className = "ln " + (cls || "");
        div.textContent = text;
        out.appendChild(div);
        out.scrollTop = out.scrollHeight;
        resolve();
      }, delay);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var platform = form.querySelector('input[name="platform"]:checked').value;
    var inst = document.getElementById("dep-inst").value.trim() || "Demo Institution";
    var server = document.getElementById("dep-server").value.split("·")[0].trim();
    var url = "https://" + (platform === "WordPress" ? "www" : platform.toLowerCase()) + "." + slugify(inst) + ".chengetai.africa";

    out.innerHTML = "";
    result.hidden = true;
    btn.disabled = true;
    btn.textContent = "Deploying…";

    var steps = STACKS[platform] || STACKS.DSpace;
    var chain = line("→ chengetai deploy " + platform.toLowerCase() + ' --institution "' + inst + '"', "info", 100)
      .then(function () { return line("  Target server: " + server, "dim", 500); })
      .then(function () { return line("  Pulling hardened " + platform + " images…", "dim", 700); });

    steps.forEach(function (s) {
      chain = chain.then(function () { return line("  ✓ " + s, "ok", 650); });
    });

    chain
      .then(function () { return line("  ✓ SSL certificate issued (Let's Encrypt)", "ok", 650); })
      .then(function () { return line("  ✓ Monitoring + nightly backups enabled", "ok", 600); })
      .then(function () { return line("  ✓ Live at " + url, "ok", 700); })
      .then(function () {
        return line("Deployment complete in " + (3 + Math.floor(Math.random() * 3)) + "m " + (10 + Math.floor(Math.random() * 49)) + "s ✔", "info", 500);
      })
      .then(function () {
        resultText.textContent = platform + " for " + inst + " is live at " + url + " — in production, you would manage it from your ChengetAi Cloud portal.";
        result.hidden = false;
        btn.disabled = false;
        btn.textContent = "🚀 Deploy";
      });
  });
})();
