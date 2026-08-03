/* ChengetAi Studio — EcoCash checkout for credit packs.
   Flow: pick a pack → enter EcoCash number → the API pushes a USSD prompt
   to the phone → customer approves with PIN → we poll until paid and the
   credits land on the account. Honest fallback to the contact form when
   the payments endpoint isn't live. */
(function () {
  "use strict";

  var API = window.CHENGETAI_API || "https://api.chengetailabs.co.zw/api";
  var TOKEN_KEY = "chengetai_token";
  var KEY_KEY = "chengetai_deploy_key";
  var MERCHANT_LOCAL = "0784457922";           // ChengetAiLabs EcoCash receiving number
  var MERCHANT_INTL = "263784457922";
  var POLL_MS = 3000;
  var POLL_TIMEOUT_MS = 2 * 60 * 1000; // EcoCash prompts expire quickly

  var checkout = document.getElementById("checkout");
  var form = document.getElementById("ecocash-form");
  if (!checkout || !form) return;

  var packEl = document.getElementById("co-pack");
  var creditsEl = document.getElementById("co-credits");
  var amountEl = document.getElementById("co-amount");
  var payAmountEl = document.getElementById("co-pay-amount");
  var payBtn = document.getElementById("co-pay");
  var phoneInput = document.getElementById("co-phone");
  var statusBox = document.getElementById("co-status");
  var statusText = document.getElementById("co-status-text");
  var successBox = document.getElementById("co-success");
  var successText = document.getElementById("co-success-text");
  var errEl = form.querySelector(".login-error");
  var fallbackLink = document.getElementById("co-fallback-link");

  var selected = null;
  var pollTimer = null;

  function credential() { return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(KEY_KEY); }

  function resetPanels() {
    errEl.style.display = "none";
    statusBox.hidden = true;
    successBox.hidden = true;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function showErr(msg) { errEl.textContent = msg; errEl.style.display = "block"; }
  function showStatus(msg) { statusText.textContent = msg; statusBox.hidden = false; }

  /* Open checkout from any Buy-with-EcoCash button */
  document.querySelectorAll(".buy-pack").forEach(function (btn) {
    btn.addEventListener("click", function () {
      selected = {
        pack: btn.dataset.pack,
        amount: Number(btn.dataset.amount),
        credits: Number(btn.dataset.credits)
      };
      packEl.textContent = selected.pack;
      creditsEl.textContent = selected.credits.toLocaleString();
      amountEl.textContent = "US$" + selected.amount;
      payAmountEl.textContent = "US$" + selected.amount;
      fallbackLink.href = "contact.html?enquiry=credits&pack=" +
        encodeURIComponent(selected.pack + " $" + selected.amount + " · " + selected.credits + " credits") + "#demo";
      resetPanels();
      form.hidden = false;
      payBtn.disabled = false;
      payBtn.childNodes[0].nodeValue = "Pay ";
      checkout.hidden = false;
      checkout.scrollIntoView({ behavior: "smooth", block: "center" });
      phoneInput.focus();
    });
  });

  document.getElementById("co-cancel").addEventListener("click", function () {
    resetPanels();
    checkout.hidden = true;
  });

  /* EcoCash runs on Econet numbers: 077 / 078 */
  function normalizePhone(raw) {
    var digits = raw.replace(/[^\d]/g, "");
    if (/^2637[78]\d{7}$/.test(digits)) return digits;
    if (/^07[78]\d{7}$/.test(digits)) return "263" + digits.slice(1);
    if (/^7[78]\d{7}$/.test(digits)) return "263" + digits;
    return null;
  }

  function refreshStudioBalance() {
    var cred = credential();
    var valueEl = document.getElementById("studio-credits-value");
    var boxEl = document.getElementById("studio-credits");
    if (!cred || !valueEl) return;
    fetch(API + "/ai/credits", { headers: { Authorization: "Bearer " + cred } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var bal = d && (d.balance != null ? d.balance : d.credits);
        if (bal != null && boxEl) {
          valueEl.textContent = Number(bal).toLocaleString();
          boxEl.hidden = false;
        }
      })
      .catch(function () { /* balance refresh is best-effort */ });
  }

  function pollPayment(id) {
    var startedAt = Date.now();
    pollTimer = setInterval(async function () {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(pollTimer); pollTimer = null;
        payBtn.disabled = false;
        statusBox.hidden = true;
        showErr("The payment request expired before it was approved. No money was taken — try again.");
        return;
      }
      var data;
      try {
        var res = await fetch(API + "/payments/" + encodeURIComponent(id));
        if (!res.ok) return; // transient — keep polling
        data = await res.json();
      } catch (e) { return; }
      var p = (data && (data.payment || data.data)) || data || {};
      var status = String(p.status || "pending").toLowerCase();
      if (/(paid|success|complete|approved)/.test(status)) {
        clearInterval(pollTimer); pollTimer = null;
        statusBox.hidden = true;
        form.hidden = true;
        successText.textContent = "Payment received — " + selected.credits.toLocaleString() +
          " credits have been added to your account" + (p.reference ? " (ref " + p.reference + ")" : "") + ". Tatenda!";
        successBox.hidden = false;
        refreshStudioBalance();
      } else if (/(failed|declined|cancelled|canceled|expired|timeout)/.test(status)) {
        clearInterval(pollTimer); pollTimer = null;
        payBtn.disabled = false;
        statusBox.hidden = true;
        showErr(p.message || "The payment was declined or cancelled on the phone. No credits were charged — try again.");
      }
      /* pending / sent → keep polling */
    }, POLL_MS);
  }

  /* Manual path: customer sends money straight to the ChengetAiLabs
     EcoCash number, then WhatsApps the confirmation for crediting. */
  function showManualPay(lead) {
    var waText = encodeURIComponent(
      "Hi ChengetAiLabs — I've sent US$" + selected.amount + " by EcoCash to " + MERCHANT_LOCAL +
      " for the " + selected.pack + " (" + selected.credits.toLocaleString() + " Studio credits)." +
      " My EcoCash confirmation: [paste SMS here]. My deployment key: " +
      (credential() ? "[on file]" : "[your key]"));
    statusText.innerHTML = lead +
      "<br><br>1️⃣ Dial <b>*151#</b> → Send Money → <b style=\"color:var(--gold);\">" + MERCHANT_LOCAL + "</b> (ChengetAiLabs) → US$" + selected.amount +
      "<br>2️⃣ <a href=\"https://wa.me/" + MERCHANT_INTL + "?text=" + waText + "\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--green); font-weight:600;\">WhatsApp us the confirmation →</a> and we credit your account.";
    statusBox.hidden = false;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    resetPanels();
    if (!selected) return;

    var phone = normalizePhone(phoneInput.value);
    if (!phone) {
      return showErr("Enter a valid EcoCash number — Econet lines starting 077 or 078.");
    }

    payBtn.disabled = true;
    showStatus("Sending the payment request to " + phoneInput.value.trim() + "…");
    try {
      var res = await fetch(API + "/payments/ecocash", {
        method: "POST",
        headers: (function () {
          var h = { "Content-Type": "application/json" };
          if (credential()) h.Authorization = "Bearer " + credential();
          return h;
        })(),
        body: JSON.stringify({
          pack: selected.pack,
          amount: selected.amount,
          currency: "USD",
          credits: selected.credits,
          phone: phone,
          payee: MERCHANT_INTL
        })
      });
      var data = null;
      try { data = await res.json(); } catch (_) {}

      if (res.status === 404 || res.status === 405) {
        payBtn.disabled = false;
        statusBox.hidden = true;
        showManualPay("Automatic checkout is still rolling out — pay manually instead:");
        return;
      }
      if (!res.ok) {
        payBtn.disabled = false;
        statusBox.hidden = true;
        showErr((data && (data.message || data.error)) || "Payment could not be started (HTTP " + res.status + "). Please try again.");
        return;
      }

      var id = data && (data.id || data.paymentId || data.reference ||
        (data.payment && (data.payment.id || data.payment.reference)));
      if (!id) {
        payBtn.disabled = false;
        statusBox.hidden = true;
        showErr("The payment service responded without a reference. Please try again or use the contact form.");
        return;
      }
      showStatus("📲 Check your phone — approve the US$" + selected.amount +
        " EcoCash prompt with your PIN. Waiting for confirmation…");
      pollPayment(id);
    } catch (err) {
      payBtn.disabled = false;
      statusBox.hidden = true;
      showManualPay("We couldn't reach the payment service — pay manually instead:");
    }
  });
})();
