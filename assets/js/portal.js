/* ChengetAi portals — demo sign-in flow (no backend on the static site) */
(function () {
  "use strict";

  var login = document.getElementById("portal-login");
  var auth = document.getElementById("portal-auth");
  var dash = document.getElementById("portal-dash");
  var logout = document.getElementById("portal-logout");
  var userEl = document.getElementById("portal-user");
  if (!login || !auth || !dash) return;

  login.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = login.querySelector('input[type="email"]').value.trim();
    if (userEl && email) {
      var name = email.split("@")[0].replace(/[._-]+/g, " ");
      userEl.textContent = name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
    auth.hidden = true;
    dash.hidden = false;
    window.scrollTo({ top: 0 });
  });

  if (logout) {
    logout.addEventListener("click", function () {
      dash.hidden = true;
      auth.hidden = false;
      login.reset();
      window.scrollTo({ top: 0 });
    });
  }

  /* Sidebar link highlighting */
  var sideLinks = document.querySelectorAll(".portal-side a");
  sideLinks.forEach(function (a) {
    a.addEventListener("click", function () {
      sideLinks.forEach(function (b) { b.classList.remove("active"); });
      a.classList.add("active");
    });
  });
})();
