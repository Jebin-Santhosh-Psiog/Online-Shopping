const ROOT = /\/(admin|customer)\//.test(location.pathname) ? "../" : "";

function save(r) {
  localStorage.setItem("tok", r.idToken);
  localStorage.setItem("rtok", r.refreshToken);
  localStorage.setItem("uid", r.localId);
  localStorage.setItem("em", r.email);
  localStorage.setItem("exp", Date.now() + r.expiresIn * 1000);
}

function guard(role) {
  let em = localStorage.getItem("em");
  if (!em) return location.href = ROOT + "index.html";
  if (role == "admin" && em != ADMIN) location.href = ROOT + "customer/shop.html";
  if (role == "customer" && em == ADMIN) location.href = ROOT + "admin/dashboard.html";
}

function logout() {
  localStorage.clear();
  location.href = ROOT + "index.html";
}

function msg(t, ok) {
  $("#msg").text(t).attr("class", ok ? "ok" : "err");
}

function chk(id, ok, m) {
  $("#e-" + id).text(ok ? "" : m);
  return ok;
}

function busy(b) {
  let x = $("#btn");
  if (!x.data("t")) x.data("t", x.text());
  x.prop("disabled", b).text(b ? "Please wait..." : x.data("t"));
}

function err(m) {
  return { responseJSON: { error: { message: m } } };
}

function errText(e) {
  if (e instanceof Error) return "Script error: " + e.message + ". Check that all project files are up to date.";
  if (e && e.status === 0) return "Network error, check your connection";
  let r = e && e.responseJSON;
  if (Array.isArray(r)) r = r[0];
  let m = r ? (r.error.message || r.error) : "Network error, check your connection";
  let map = {
    EMAIL_EXISTS: "This email is already registered",
    INVALID_LOGIN_CREDENTIALS: "Invalid email or password",
    EMAIL_NOT_FOUND: "Email not registered",
    INVALID_PASSWORD: "Wrong password",
    USER_DISABLED: "This account is disabled",
    INVALID_EMAIL: "Invalid email",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts, try again later",
    EMAIL_NOT_VERIFIED: "Please verify your email first. Check your inbox/spam"
  };
  return map[m.split(" ")[0]] || m;
}

function ask(t) {
  let d = $.Deferred();
  if (!$("#modal").length) {
    $("body").append(`
      <div id="modal">
        <div class="card">
          <p id="mtext"></p>
          <button class="btn red" id="myes">Yes</button>
          <button class="btn grey" id="mno">No</button>
        </div>
      </div>`);
  }
  $("#mtext").text(t);
  $("#modal").show();
  $("#myes").off().click(() => { $("#modal").hide(); d.resolve(); });
  $("#mno").off().click(() => $("#modal").hide());
  return d;
}

function adminNav(a) {
  let pages = ["dashboard", "categories", "inventory", "customers", "coupons", "reports"];
  $("body").prepend(`
    <nav>
      <div class="logo">ShopAdmin</div>
      <div>
        ${pages.map(x => `<a href="${x}.html" class="${x == a ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</a>`).join("")}
        <a href="#" onclick="logout()">Logout</a>
      </div>
    </nav>`);
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function rupee(v) {
  return "₹" + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function ymd(d) {
  let p = x => String(x).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function dmy(d) {
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}
