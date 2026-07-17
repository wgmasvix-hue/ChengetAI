/* ChengetAi Labs — shared site behaviour */
(function () {
  "use strict";

  /* Mobile nav toggle */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", links.classList.contains("open"));
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }

  /* Scroll reveal */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* Generic tabs: [data-tabs] container with .tab-btn[data-tab] and .tab-panel[data-panel] */
  document.querySelectorAll("[data-tabs]").forEach(function (root) {
    var btns = root.querySelectorAll(".tab-btn");
    var panels = root.querySelectorAll(".tab-panel");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) { b.classList.remove("active"); });
        panels.forEach(function (p) { p.classList.remove("active"); });
        btn.classList.add("active");
        var panel = root.querySelector('.tab-panel[data-panel="' + btn.dataset.tab + '"]');
        if (panel) panel.classList.add("active");
      });
    });
  });

  /* Contact / demo forms: client-side confirmation (no backend on the static site) */
  document.querySelectorAll("form[data-demo-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = form.querySelector(".form-success");
      if (ok) {
        ok.style.display = "flex";
        ok.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      form.querySelectorAll("input, textarea, select, button").forEach(function (el) {
        el.disabled = true;
      });
    });
  });

  /* Contact form prefill from query params, used by server-rental buttons
     (?enquiry=server&plan=…) and App Store buttons (?enquiry=app&app=…) */
  var topicSelect = document.getElementById("ct-topic");
  var msgField = document.getElementById("ct-msg");
  function selectTopic(text) {
    for (var i = 0; i < topicSelect.options.length; i++) {
      if (topicSelect.options[i].text === text) { topicSelect.selectedIndex = i; return; }
    }
  }
  if (topicSelect && window.location.search) {
    var params = new URLSearchParams(window.location.search);
    var enquiry = params.get("enquiry");
    var plan = params.get("plan");
    var app = params.get("app");
    if (enquiry === "server") {
      selectTopic("Server rental order");
      if (plan && msgField && !msgField.value) {
        msgField.value = "I would like to rent a cloud server — plan: " + plan + ".\n" +
          "Preferred region: \nOperating system: \nManaged or root access: \nBilling: monthly / annual";
      }
    } else if (enquiry === "app") {
      selectTopic("App Store enquiry");
      if (app && msgField && !msgField.value) {
        msgField.value = "I'm interested in " + app + " from the ChengetAi App Store.\n" +
          "Organisation type: \nIntended use: ";
      }
    }
  }

  /* App Store: search + category filter */
  var appGrid = document.getElementById("app-grid");
  if (appGrid) {
    var appCards = appGrid.querySelectorAll("[data-app]");
    var searchBox = document.getElementById("app-search");
    var filterBtns = document.querySelectorAll("#app-filters .tab-btn");
    var emptyMsg = document.getElementById("app-empty");
    var activeFilter = "all";

    function applyAppFilter() {
      var q = (searchBox && searchBox.value || "").trim().toLowerCase();
      var shown = 0;
      appCards.forEach(function (card) {
        var matchesCat = activeFilter === "all" ||
          (card.dataset.category || "").split(/\s+/).indexOf(activeFilter) !== -1;
        var matchesText = !q || card.textContent.toLowerCase().indexOf(q) !== -1;
        var show = matchesCat && matchesText;
        card.style.display = show ? "" : "none";
        if (show) shown++;
      });
      if (emptyMsg) emptyMsg.style.display = shown ? "none" : "block";
    }

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        applyAppFilter();
      });
    });
    if (searchBox) searchBox.addEventListener("input", applyAppFilter);
  }

  /* Copy-to-clipboard for command snippets */
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.dataset.copy || (btn.parentNode.querySelector("code") || {}).textContent || "";
      var done = function () {
        var label = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(function () { btn.textContent = label; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) { /* best effort */ }
        document.body.removeChild(ta);
        done();
      }
    });
  });

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
